"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import {
  Blocks,
  Bot,
  CheckCheck,
  CirclePlay,
  Clock3,
  GitBranch,
  Link2,
  MessageSquareText,
  MousePointerClick,
  Plus,
  Save,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  UserCheck,
  Users,
  Webhook,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type BlockType =
  | "start_trigger"
  | "send_message"
  | "send_buttons"
  | "send_list_menu"
  | "ask_question"
  | "condition"
  | "delay_wait"
  | "webhook_api"
  | "tag_contact"
  | "assign_agent"
  | "human_handoff"
  | "end_flow";

type ButtonOption = { id: string; label: string; action: string; nextNodeId: string };

type NodeConfig = {
  triggerValue?: string;
  message?: string;
  question?: string;
  delayMinutes?: number;
  expression?: string;
  webhookUrl?: string;
  tag?: string;
  assignee?: string;
  buttons?: ButtonOption[];
};

type FlowNode = { id: string; type: BlockType; label: string; x: number; y: number; config: NodeConfig };
type FlowEdge = { id: string; sourceId: string; targetId: string; label?: string; kind: "manual" | "button" };
type ChatMessage = { id: string; sender: "user" | "bot"; text: string };
type TemplateId = "lead" | "support" | "tracking" | "appointment" | "catalog";

const NODE_W = 236;
const NODE_H = 102;
const CANVAS_W = 2600;
const CANVAS_H = 1600;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 1.6;

const BLOCKS: Array<{
  type: BlockType;
  label: string;
  tooltip: string;
  icon: LucideIcon;
  accent: string;
  config: () => NodeConfig;
}> = [
  { type: "start_trigger", label: "Start Trigger", tooltip: "Entry point", icon: CirclePlay, accent: "text-cyan-700 bg-cyan-50 border-cyan-300", config: () => ({ triggerValue: "hi" }) },
  { type: "send_message", label: "Send Message", tooltip: "Plain text reply", icon: MessageSquareText, accent: "text-emerald-700 bg-emerald-50 border-emerald-300", config: () => ({ message: "Welcome to Vaiket 👋 How can we help you?" }) },
  { type: "send_buttons", label: "Send Buttons", tooltip: "Quick replies", icon: MousePointerClick, accent: "text-violet-700 bg-violet-50 border-violet-300", config: () => ({ message: "Choose one option:", buttons: [{ id: "b1", label: "Browse Products", action: "catalog", nextNodeId: "" }, { id: "b2", label: "Track Order", action: "track", nextNodeId: "" }, { id: "b3", label: "Talk to Support", action: "support", nextNodeId: "" }] }) },
  { type: "send_list_menu", label: "Send List Menu", tooltip: "Category list", icon: Blocks, accent: "text-indigo-700 bg-indigo-50 border-indigo-300", config: () => ({ message: "Menu: Products, Pricing, Support" }) },
  { type: "ask_question", label: "Ask Question", tooltip: "Capture input", icon: Bot, accent: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-300", config: () => ({ question: "Please share your order ID" }) },
  { type: "condition", label: "Condition", tooltip: "If / Else", icon: GitBranch, accent: "text-amber-700 bg-amber-50 border-amber-300", config: () => ({ expression: "{{intent}} == 'support'" }) },
  { type: "delay_wait", label: "Delay / Wait", tooltip: "Pause flow", icon: Timer, accent: "text-slate-700 bg-slate-100 border-slate-300", config: () => ({ delayMinutes: 5 }) },
  { type: "webhook_api", label: "Webhook / API", tooltip: "External call", icon: Webhook, accent: "text-sky-700 bg-sky-50 border-sky-300", config: () => ({ webhookUrl: "https://api.vaiket.com/hook" }) },
  { type: "tag_contact", label: "Tag Contact", tooltip: "CRM segmentation", icon: Tag, accent: "text-lime-700 bg-lime-50 border-lime-300", config: () => ({ tag: "lead" }) },
  { type: "assign_agent", label: "Assign to Agent", tooltip: "Route to team", icon: UserCheck, accent: "text-teal-700 bg-teal-50 border-teal-300", config: () => ({ assignee: "Support Team" }) },
  { type: "human_handoff", label: "Human Handoff", tooltip: "Transfer to live chat", icon: Users, accent: "text-orange-700 bg-orange-50 border-orange-300", config: () => ({ assignee: "L1 Queue" }) },
  { type: "end_flow", label: "End Flow", tooltip: "Stop automation", icon: ShieldCheck, accent: "text-rose-700 bg-rose-50 border-rose-300", config: () => ({ message: "Flow completed ✅" }) },
];

const TEMPLATES: Array<{ id: TemplateId; name: string; description: string }> = [
  { id: "lead", name: "Lead Generation Bot", description: "Collect leads and handover to sales." },
  { id: "support", name: "Customer Support Bot", description: "Buttons + tracking + handoff." },
  { id: "tracking", name: "Order Tracking Bot", description: "Ask order ID and fetch status." },
  { id: "appointment", name: "Appointment Booking Bot", description: "Collect preferred slots quickly." },
  { id: "catalog", name: "Product Catalog Bot", description: "Menu-driven product discovery." },
];

const FEATURES = [
  "AI suggested replies",
  "CRM contact tagging",
  "Broadcast triggers",
  "Shopify integration",
  "Zoho CRM integration",
  "Webhook triggers",
  "Analytics tracking",
];

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function blockFor(type: BlockType) {
  return BLOCKS.find((block) => block.type === type) ?? BLOCKS[0];
}
function makeNode(type: BlockType, x: number, y: number, patch: Partial<FlowNode> = {}): FlowNode {
  const block = blockFor(type);
  return { id: patch.id || uid("n"), type, label: patch.label || block.label, x, y, config: { ...block.config(), ...(patch.config || {}) } };
}
function makeEdge(sourceId: string, targetId: string, kind: "manual" | "button" = "manual", label?: string): FlowEdge {
  return { id: uid("e"), sourceId, targetId, kind, label };
}

function buildTemplate(templateId: TemplateId) {
  if (templateId === "support") {
    const nodes = [
      makeNode("start_trigger", 120, 170, { id: "s" }),
      makeNode("send_buttons", 430, 170, {
        id: "menu",
        config: { message: "Welcome 👋 Select option:", buttons: [{ id: "p", label: "Browse Products", action: "catalog", nextNodeId: "catalog" }, { id: "t", label: "Track Order", action: "track", nextNodeId: "ask_order" }, { id: "h", label: "Talk to Support", action: "handoff", nextNodeId: "handoff" }] },
      }),
      makeNode("send_list_menu", 760, 70, { id: "catalog", config: { message: "Categories: Electronics, Fashion, Home" } }),
      makeNode("ask_question", 760, 230, { id: "ask_order", config: { question: "Share your order ID" } }),
      makeNode("webhook_api", 1070, 230, { id: "track_api", config: { webhookUrl: "https://api.vaiket.com/order/status" } }),
      makeNode("send_message", 1380, 230, { id: "track_msg", config: { message: "Your order is in transit 🚚" } }),
      makeNode("human_handoff", 760, 390, { id: "handoff" }),
      makeNode("end_flow", 1700, 230, { id: "end" }),
      makeNode("end_flow", 1070, 70, { id: "end_catalog", config: { message: "Catalog shared ✅" } }),
      makeNode("end_flow", 1070, 390, { id: "end_handoff", config: { message: "Transferred to support ✅" } }),
    ];
    const edges = [makeEdge("s", "menu"), makeEdge("catalog", "end_catalog"), makeEdge("ask_order", "track_api"), makeEdge("track_api", "track_msg"), makeEdge("track_msg", "end"), makeEdge("handoff", "end_handoff")];
    return { name: "Customer Support Bot", nodes, edges };
  }
  if (templateId === "tracking") {
    const nodes = [makeNode("start_trigger", 120, 180, { id: "s", config: { triggerValue: "track" } }), makeNode("ask_question", 430, 180, { id: "q", config: { question: "Please send order ID" } }), makeNode("webhook_api", 740, 180, { id: "w", config: { webhookUrl: "https://api.vaiket.com/order/status" } }), makeNode("send_message", 1050, 180, { id: "m", config: { message: "Order {{order_id}} will arrive tomorrow 📦" } }), makeNode("end_flow", 1360, 180, { id: "e" })];
    const edges = [makeEdge("s", "q"), makeEdge("q", "w"), makeEdge("w", "m"), makeEdge("m", "e")];
    return { name: "Order Tracking Bot", nodes, edges };
  }
  if (templateId === "appointment") {
    const nodes = [makeNode("start_trigger", 120, 180, { id: "s", config: { triggerValue: "book" } }), makeNode("send_buttons", 430, 180, { id: "b", config: { message: "Pick your preferred slot:", buttons: [{ id: "m", label: "Morning", action: "morning", nextNodeId: "save" }, { id: "a", label: "Afternoon", action: "afternoon", nextNodeId: "save" }, { id: "e", label: "Evening", action: "evening", nextNodeId: "save" }] } }), makeNode("webhook_api", 740, 180, { id: "save", config: { webhookUrl: "https://api.vaiket.com/appointments/create" } }), makeNode("send_message", 1050, 180, { id: "ok", config: { message: "Appointment booked successfully ✅" } }), makeNode("end_flow", 1360, 180, { id: "end" })];
    const edges = [makeEdge("s", "b"), makeEdge("save", "ok"), makeEdge("ok", "end")];
    return { name: "Appointment Booking Bot", nodes, edges };
  }
  if (templateId === "catalog") {
    const nodes = [makeNode("start_trigger", 120, 180, { id: "s", config: { triggerValue: "catalog" } }), makeNode("send_list_menu", 430, 180, { id: "list", config: { message: "New Arrivals • Best Sellers • Offers" } }), makeNode("send_buttons", 740, 180, { id: "menu", config: { message: "Need recommendations?", buttons: [{ id: "r", label: "Recommend Me", action: "recommend", nextNodeId: "rec" }, { id: "h", label: "Talk to Sales", action: "handoff", nextNodeId: "sales" }, { id: "d", label: "Done", action: "done", nextNodeId: "end" }] } }), makeNode("send_message", 1050, 80, { id: "rec", config: { message: "Top picks: smartwatch, earbuds, backpack." } }), makeNode("human_handoff", 1050, 250, { id: "sales" }), makeNode("end_flow", 1360, 180, { id: "end" })];
    const edges = [makeEdge("s", "list"), makeEdge("list", "menu"), makeEdge("rec", "end"), makeEdge("sales", "end")];
    return { name: "Product Catalog Bot", nodes, edges };
  }
  const nodes = [makeNode("start_trigger", 120, 180, { id: "s", config: { triggerValue: "hello" } }), makeNode("send_message", 430, 180, { id: "w", config: { message: "Welcome to Vaiket 👋 We can help in seconds." } }), makeNode("ask_question", 740, 180, { id: "q", config: { question: "May I know your name?" } }), makeNode("tag_contact", 1050, 180, { id: "t", config: { tag: "high_intent_lead" } }), makeNode("assign_agent", 1360, 180, { id: "a", config: { assignee: "Sales Team" } }), makeNode("end_flow", 1670, 180, { id: "e" })];
  const edges = [makeEdge("s", "w"), makeEdge("w", "q"), makeEdge("q", "t"), makeEdge("t", "a"), makeEdge("a", "e")];
  return { name: "Lead Generation Bot", nodes, edges };
}

export default function WhatsAppAutomationBuilderPage() {
  const starter = useMemo(() => buildTemplate("lead"), []);
  const [dark, setDark] = useState(false);
  const [flowName, setFlowName] = useState(starter.name);
  const [nodes, setNodes] = useState<FlowNode[]>(starter.nodes);
  const [edges, setEdges] = useState<FlowEdge[]>(starter.edges);
  const [selectedId, setSelectedId] = useState<string | null>(starter.nodes[0]?.id || null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [savedAt, setSavedAt] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; label: string; time: number; status: "draft" | "published" }>>(
    [{ id: uid("v"), label: "Initial draft", time: 0, status: "draft" }]
  );
  const [showTest, setShowTest] = useState(true);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatButtons, setChatButtons] = useState<ButtonOption[]>([]);
  const [chatWaitNode, setChatWaitNode] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [view, setView] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]);

  const buttonEdges = useMemo(
    () =>
      nodes.flatMap((node) =>
        node.type !== "send_buttons"
          ? []
          : (node.config.buttons || []).filter((b) => b.nextNodeId).map((b) => ({
              id: `btn_${node.id}_${b.id}_${b.nextNodeId}`,
              sourceId: node.id,
              targetId: b.nextNodeId,
              label: b.label,
              kind: "button" as const,
            }))
      ),
    [nodes]
  );
  const allEdges = useMemo(() => [...edges, ...buttonEdges], [edges, buttonEdges]);

  const drawnEdges = useMemo(() => {
    const map = new Map(nodes.map((node) => [node.id, node]));
    return allEdges
      .map((edge) => {
        const source = map.get(edge.sourceId);
        const target = map.get(edge.targetId);
        if (!source || !target) return null;
        const x1 = source.x + NODE_W;
        const y1 = source.y + NODE_H / 2;
        const x2 = target.x;
        const y2 = target.y + NODE_H / 2;
        return {
          ...edge,
          path: `M ${x1} ${y1} C ${x1 + 84} ${y1}, ${x2 - 84} ${y2}, ${x2} ${y2}`,
          tx: (x1 + x2) / 2,
          ty: (y1 + y2) / 2,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [allEdges, nodes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSavedAt(Date.now());
    }, 700);
    return () => window.clearTimeout(timer);
  }, [flowName, nodes, edges]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const sync = () =>
      setView({
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    sync();
    viewport.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [zoom, nodes.length]);

  useEffect(() => {
    const move = (event: globalThis.MouseEvent) => {
      const drag = dragRef.current;
      const viewport = viewportRef.current;
      if (!drag || !viewport) return;
      const rect = viewport.getBoundingClientRect();
      const x = (event.clientX - rect.left + viewport.scrollLeft) / zoom - drag.dx;
      const y = (event.clientY - rect.top + viewport.scrollTop) / zoom - drag.dy;
      setNodes((prev) =>
        prev.map((node) =>
          node.id === drag.id
            ? { ...node, x: clamp(x, 20, CANVAS_W - NODE_W - 20), y: clamp(y, 20, CANVAS_H - NODE_H - 20) }
            : node
        )
      );
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [zoom]);

  const runFrom = useCallback((startNodeId: string | null, seed: ChatMessage[]) => {
    const map = new Map(nodes.map((node) => [node.id, node]));
    const outgoing = new Map<string, FlowEdge[]>();
    allEdges.forEach((edge) => outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) || []), edge]));
    const messages = [...seed];
    let waitingButtons: ButtonOption[] = [];
    let waitNode: string | null = null;
    let current = startNodeId;
    let guard = 0;
    while (current && guard < 24) {
      guard += 1;
      const node = map.get(current);
      if (!node) break;
      const next = outgoing.get(node.id) || [];
      if (node.type === "start_trigger") {
        current = next[0]?.targetId || null;
      } else if (node.type === "send_message" || node.type === "send_list_menu") {
        messages.push({ id: uid("m"), sender: "bot", text: node.config.message || "Message" });
        current = next[0]?.targetId || null;
      } else if (node.type === "ask_question") {
        messages.push({ id: uid("m"), sender: "bot", text: node.config.question || "Please share details" });
        waitNode = next[0]?.targetId || null;
        current = null;
      } else if (node.type === "send_buttons") {
        messages.push({ id: uid("m"), sender: "bot", text: node.config.message || "Choose option" });
        waitingButtons = (node.config.buttons || []).filter((b) => b.label.trim());
        current = null;
      } else if (node.type === "delay_wait") {
        messages.push({ id: uid("m"), sender: "bot", text: `Waiting ${node.config.delayMinutes || 0} minute(s)...` });
        current = next[0]?.targetId || null;
      } else if (node.type === "condition") {
        messages.push({ id: uid("m"), sender: "bot", text: `Condition checked: ${node.config.expression || "if logic"}` });
        current = next[0]?.targetId || null;
      } else if (node.type === "webhook_api") {
        messages.push({ id: uid("m"), sender: "bot", text: "Webhook executed ✅" });
        current = next[0]?.targetId || null;
      } else if (node.type === "tag_contact") {
        messages.push({ id: uid("m"), sender: "bot", text: `Tag added: ${node.config.tag || "lead"}` });
        current = next[0]?.targetId || null;
      } else if (node.type === "assign_agent" || node.type === "human_handoff") {
        messages.push({ id: uid("m"), sender: "bot", text: `Connected to ${node.config.assignee || "support team"}` });
        current = next[0]?.targetId || null;
      } else {
        messages.push({ id: uid("m"), sender: "bot", text: node.config.message || "Flow completed ✅" });
        current = null;
      }
    }
    return { messages, waitingButtons, waitNode };
  }, [allEdges, nodes]);

  const startTest = useCallback(() => {
    const start = nodes.find((node) => node.type === "start_trigger") || nodes[0];
    const result = runFrom(start?.id || null, [{ id: uid("m"), sender: "user", text: "Hi" }]);
    setChat(result.messages);
    setChatButtons(result.waitingButtons);
    setChatWaitNode(result.waitNode);
    setShowTest(true);
  }, [nodes, runFrom]);

  const beginDrag = (event: MouseEvent<HTMLButtonElement>, nodeId: string) => {
    const viewport = viewportRef.current;
    const node = nodes.find((item) => item.id === nodeId);
    if (!viewport || !node) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const px = (event.clientX - rect.left + viewport.scrollLeft) / zoom;
    const py = (event.clientY - rect.top + viewport.scrollTop) / zoom;
    dragRef.current = { id: nodeId, dx: px - node.x, dy: py - node.y };
    setSelectedId(nodeId);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-vaiket-block") as BlockType;
    if (!BLOCKS.some((block) => block.type === type)) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const x = (event.clientX - rect.left + viewport.scrollLeft) / zoom - NODE_W / 2;
    const y = (event.clientY - rect.top + viewport.scrollTop) / zoom - NODE_H / 2;
    const node = makeNode(type, clamp(x, 20, CANVAS_W - NODE_W - 20), clamp(y, 20, CANVAS_H - NODE_H - 20));
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
  };

  const applyTemplate = (templateId: TemplateId) => {
    const next = buildTemplate(templateId);
    setFlowName(next.name);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedId(next.nodes[0]?.id || null);
    setSourceId(null);
    setZoom(1);
    setVersions((prev) => [{ id: uid("v"), label: `Template: ${next.name}`, time: Date.now(), status: "draft" }, ...prev].slice(0, 10));
  };

  const deleteNode = (nodeId: string) => {
    setNodes((prev) =>
      prev
        .filter((node) => node.id !== nodeId)
        .map((node) =>
          node.type !== "send_buttons"
            ? node
            : {
                ...node,
                config: {
                  ...node.config,
                  buttons: (node.config.buttons || []).map((button) =>
                    button.nextNodeId === nodeId ? { ...button, nextNodeId: "" } : button
                  ),
                },
              }
        )
    );
    setEdges((prev) => prev.filter((edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId));
    setSelectedId((prev) => (prev === nodeId ? null : prev));
    setSourceId((prev) => (prev === nodeId ? null : prev));
  };

  const theme = dark
    ? {
        page: "bg-slate-950 text-slate-100",
        panel: "border-slate-800 bg-slate-900/90",
        soft: "border-slate-700 bg-slate-900",
        muted: "text-slate-400",
        main: "text-slate-100",
      }
    : {
        page: "bg-slate-50 text-slate-900",
        panel: "border-slate-200 bg-white",
        soft: "border-slate-200 bg-white",
        muted: "text-slate-500",
        main: "text-slate-900",
      };

  const minX = Math.min(...nodes.map((node) => node.x), 0) - 80;
  const minY = Math.min(...nodes.map((node) => node.y), 0) - 80;
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_W), 700) + 80;
  const maxY = Math.max(...nodes.map((node) => node.y + NODE_H), 450) + 80;
  const mapScale = Math.min(204 / (maxX - minX), 124 / (maxY - minY));
  const mapPos = (x: number, y: number) => ({ x: 8 + (x - minX) * mapScale, y: 8 + (y - minY) * mapScale });

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <div className="mx-auto w-full max-w-[1900px] space-y-4 px-3 py-3 md:px-5 md:py-5">
        <section className={`rounded-2xl border p-4 ${theme.panel}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <p className={`text-xs uppercase tracking-[0.15em] ${theme.muted}`}>WhatsApp Hub / Automation Builder</p>
              <input
                value={flowName}
                onChange={(event) => setFlowName(event.target.value)}
                className={`mt-2 w-full rounded-xl border px-3 py-2 text-lg font-semibold outline-none ${theme.soft}`}
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setVersions((prev) => [{ id: uid("v"), label: "Manual save", time: Date.now(), status: "draft" }, ...prev].slice(0, 10))
                }
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTest((prev) => !prev);
                  if (!showTest) startTest();
                }}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}
              >
                <CirclePlay className="h-3.5 w-3.5" />
                Test automation
              </button>
              <button
                type="button"
                onClick={() =>
                  setVersions((prev) => [{ id: uid("v"), label: "Published flow", time: Date.now(), status: "published" }, ...prev].slice(0, 10))
                }
                className="inline-flex items-center gap-1 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Publish
              </button>
              <button
                type="button"
                onClick={() => setShowVersions((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}
              >
                <Clock3 className="h-3.5 w-3.5" />
                Version history
              </button>
              <button
                type="button"
                onClick={() => setDark((prev) => !prev)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}
              >
                {dark ? "Light mode" : "Dark mode"}
              </button>
              <Link href="/dashboard/whatsapp" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}>
                Exit
              </Link>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCheck className="h-3 w-3" />
            {savedAt ? `Auto-saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Auto-save enabled"}
          </div>
          {showVersions && (
            <div className={`mt-3 rounded-xl border p-3 ${theme.soft}`}>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {versions.map((version) => (
                  <div key={version.id} className={`rounded-lg border p-2 text-xs ${theme.soft}`}>
                    <p className="font-semibold">{version.label}</p>
                    <p className={theme.muted}>{new Date(version.time).toLocaleString()}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        version.status === "published" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {version.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className={`rounded-2xl border p-4 ${theme.panel}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-semibold ${theme.main}`}>Automation Blocks</h2>
              <span className={`text-[11px] ${theme.muted}`}>Drag to canvas</span>
            </div>
            <div className="mt-3 grid gap-2">
              {BLOCKS.map((block) => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.type}
                    type="button"
                    draggable
                    title={block.tooltip}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-vaiket-block", block.type);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 ${theme.soft}`}
                  >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${block.accent}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-xs font-semibold ${theme.main}`}>{block.label}</span>
                      <span className={`block truncate text-[11px] ${theme.muted}`}>{block.tooltip}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={`mt-4 rounded-xl border p-3 ${theme.soft}`}>
              <p className={`text-sm font-semibold ${theme.main}`}>Templates</p>
              <div className="mt-2 space-y-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={`w-full rounded-lg border p-2 text-left ${theme.soft}`}
                  >
                    <p className="text-xs font-semibold">{template.name}</p>
                    <p className={`text-[11px] ${theme.muted}`}>{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className={`rounded-2xl border p-4 ${theme.panel}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className={`text-sm font-semibold ${theme.main}`}>Workflow Canvas</p>
                  <p className={`text-xs ${theme.muted}`}>Drag nodes, connect with arrows, zoom and navigate using mini-map.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => clamp(prev - 0.1, MIN_ZOOM, MAX_ZOOM))}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${theme.soft}`}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className={`min-w-[52px] text-center text-xs font-semibold ${theme.muted}`}>{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => clamp(prev + 0.1, MIN_ZOOM, MAX_ZOOM))}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${theme.soft}`}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setZoom(1)} className={`rounded-lg border px-3 py-1.5 text-xs ${theme.soft}`}>
                    Reset
                  </button>
                  <button type="button" onClick={() => setEdges([])} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear links
                  </button>
                </div>
              </div>

              <div className="relative">
                <div
                  ref={viewportRef}
                  onDrop={onDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }}
                  className={`relative h-[620px] overflow-auto rounded-xl border ${dark ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="relative" style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}>
                    <div
                      className="absolute inset-0 origin-top-left"
                      style={{
                        width: CANVAS_W,
                        height: CANVAS_H,
                        transform: `scale(${zoom})`,
                        backgroundImage:
                          "linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)",
                        backgroundSize: "30px 30px",
                      }}
                    >
                      <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0">
                        <defs>
                          <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M 0 0 L 8 4 L 0 8 z" fill={dark ? "#34d399" : "#10b981"} />
                          </marker>
                        </defs>
                        {drawnEdges.map((edge) => (
                          <g key={edge.id}>
                            <path
                              d={edge.path}
                              fill="none"
                              stroke={edge.kind === "button" ? (dark ? "#a78bfa" : "#8b5cf6") : dark ? "#34d399" : "#10b981"}
                              strokeWidth={2.1}
                              strokeDasharray={edge.kind === "button" ? "5 4" : "0"}
                              markerEnd="url(#arrow-end)"
                              className="transition-all duration-300"
                            />
                            {edge.label ? (
                              <text x={edge.tx} y={edge.ty - 8} textAnchor="middle" className={`text-[10px] font-semibold ${dark ? "fill-violet-300" : "fill-violet-700"}`}>
                                {edge.label}
                              </text>
                            ) : null}
                          </g>
                        ))}
                      </svg>

                      {nodes.map((node) => {
                        const block = blockFor(node.type);
                        const Icon = block.icon;
                        const active = selectedId === node.id;
                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedId(node.id)}
                            style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
                            className={`absolute rounded-xl border p-3 transition-all ${active ? (dark ? "border-emerald-400 bg-slate-900" : "border-emerald-300 bg-white") : theme.soft}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${block.accent}`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <div>
                                  <p className={`truncate text-xs font-semibold ${theme.main}`}>{node.label}</p>
                                  <p className={`truncate text-[10px] uppercase ${theme.muted}`}>{node.type.replaceAll("_", " ")}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button type="button" onMouseDown={(event) => beginDrag(event, node.id)} className={`rounded border px-1.5 py-0.5 text-[10px] ${theme.soft}`}>
                                  Drag
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteNode(node.id);
                                  }}
                                  className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700"
                                >
                                  Del
                                </button>
                              </div>
                            </div>
                            <div className={`mt-2 text-[11px] ${theme.muted}`}>
                              {node.type === "send_message"
                                ? node.config.message?.slice(0, 62)
                                : node.type === "send_buttons"
                                ? `${(node.config.buttons || []).length} buttons`
                                : node.type === "ask_question"
                                ? node.config.question
                                : node.type === "start_trigger"
                                ? `Keyword: ${node.config.triggerValue}`
                                : node.type === "webhook_api"
                                ? node.config.webhookUrl
                                : node.type === "condition"
                                ? node.config.expression
                                : node.type === "delay_wait"
                                ? `Wait ${node.config.delayMinutes || 0} min`
                                : node.type === "tag_contact"
                                ? `Tag: ${node.config.tag}`
                                : node.type === "assign_agent" || node.type === "human_handoff"
                                ? `Queue: ${node.config.assignee}`
                                : node.config.message}
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSourceId(node.id);
                              }}
                              className={`absolute -right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border ${sourceId === node.id ? "border-emerald-400 bg-emerald-100 text-emerald-700" : theme.soft}`}
                            >
                              <Link2 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!sourceId || sourceId === node.id) return;
                                setEdges((prev) =>
                                  prev.some((edge) => edge.sourceId === sourceId && edge.targetId === node.id)
                                    ? prev
                                    : [...prev, makeEdge(sourceId, node.id)]
                                );
                                setSourceId(null);
                              }}
                              className={`absolute -left-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border ${theme.soft}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute bottom-4 right-4 cursor-pointer rounded-lg border p-2 ${theme.soft}`}
                  style={{ width: 220, height: 140 }}
                  onClick={(event) => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = event.clientX - rect.left - 8;
                    const y = event.clientY - rect.top - 8;
                    const cx = x / mapScale + minX;
                    const cy = y / mapScale + minY;
                    viewport.scrollTo({
                      left: Math.max(0, cx * zoom - viewport.clientWidth / 2),
                      top: Math.max(0, cy * zoom - viewport.clientHeight / 2),
                      behavior: "smooth",
                    });
                  }}
                >
                  <div className="relative h-full w-full rounded bg-slate-100/30">
                    {nodes.map((node) => {
                      const p = mapPos(node.x, node.y);
                      return (
                        <div
                          key={`mini_${node.id}`}
                          className={`absolute rounded-sm ${selectedId === node.id ? "bg-emerald-500" : dark ? "bg-slate-300" : "bg-slate-500"}`}
                          style={{
                            left: p.x,
                            top: p.y,
                            width: Math.max(7, NODE_W * mapScale),
                            height: Math.max(5, NODE_H * mapScale),
                          }}
                        />
                      );
                    })}
                    <div
                      className="absolute rounded border-2 border-emerald-400/80 bg-emerald-200/20"
                      style={{
                        left: 8 + (view.left / zoom - minX) * mapScale,
                        top: 8 + (view.top / zoom - minY) * mapScale,
                        width: Math.max(20, (view.width / zoom) * mapScale),
                        height: Math.max(16, (view.height / zoom) * mapScale),
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className={`mt-2 text-xs ${theme.muted}`}>
                {sourceId ? "Select destination node to complete connection." : "Connect nodes using right and left handles."}
              </p>
            </div>

            {showTest && (
              <div className={`rounded-2xl border p-4 ${theme.panel}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${theme.main}`}>Flow Testing (WhatsApp Preview)</p>
                    <p className={`text-xs ${theme.muted}`}>Mobile-style conversation simulation before publish.</p>
                  </div>
                  <button type="button" onClick={startTest} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${theme.soft}`}>
                    <CirclePlay className="h-3.5 w-3.5" />
                    Re-run
                  </button>
                </div>
                <div className="flex justify-center">
                  <div className={`w-full max-w-[340px] rounded-[30px] border p-3 ${theme.soft}`}>
                    <div className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Vaiket Test Chat</div>
                    <div className={`mt-3 h-[320px] space-y-2 overflow-y-auto rounded-2xl border p-3 ${theme.soft}`}>
                      {chat.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs ${
                            message.sender === "user"
                              ? "ml-auto rounded-br-md bg-emerald-500 text-white"
                              : dark
                              ? "rounded-bl-md bg-slate-800 text-slate-100"
                              : "rounded-bl-md bg-slate-100 text-slate-700"
                          }`}
                        >
                          {message.text}
                        </div>
                      ))}
                    </div>
                    {chatButtons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {chatButtons.map((button) => (
                          <button
                            key={button.id}
                            type="button"
                            onClick={() => {
                              const seed = [...chat, { id: uid("m"), sender: "user" as const, text: button.label }];
                              const result = runFrom(button.nextNodeId || null, seed);
                              setChat(result.messages);
                              setChatButtons(result.waitingButtons);
                              setChatWaitNode(result.waitNode);
                            }}
                            className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700"
                          >
                            {button.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Type message..."
                        className={`h-10 flex-1 rounded-xl border px-3 text-xs outline-none ${theme.soft}`}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          const text = chatInput.trim();
                          if (!text) return;
                          const seed = [...chat, { id: uid("m"), sender: "user" as const, text }];
                          const result = runFrom(chatWaitNode, seed);
                          setChat(result.messages);
                          setChatButtons(result.waitingButtons);
                          setChatWaitNode(result.waitNode);
                          setChatInput("");
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const text = chatInput.trim();
                          if (!text) return;
                          const seed = [...chat, { id: uid("m"), sender: "user" as const, text }];
                          const result = runFrom(chatWaitNode, seed);
                          setChat(result.messages);
                          setChatButtons(result.waitingButtons);
                          setChatWaitNode(result.waitNode);
                          setChatInput("");
                        }}
                        className="inline-flex h-10 items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                      >
                        <SendHorizontal className="h-3.5 w-3.5" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className={`rounded-2xl border p-4 ${theme.panel}`}>
            <h2 className={`text-sm font-semibold ${theme.main}`}>Node Settings</h2>
            {!selected ? (
              <p className={`mt-2 text-xs ${theme.muted}`}>Select any node to configure settings.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className={`rounded-xl border p-3 ${theme.soft}`}>
                  <label className={`text-[11px] uppercase ${theme.muted}`}>Node label</label>
                  <input
                    value={selected.label}
                    onChange={(event) =>
                      setNodes((prev) =>
                        prev.map((node) => (node.id === selected.id ? { ...node, label: event.target.value } : node))
                      )
                    }
                    className={`mt-1 w-full rounded-lg border px-2.5 py-2 text-sm outline-none ${theme.soft}`}
                  />
                </div>

                {selected.type === "send_message" && (
                  <div className={`rounded-xl border p-3 ${theme.soft}`}>
                    <label className={`text-[11px] uppercase ${theme.muted}`}>Message text</label>
                    <textarea
                      value={selected.config.message || ""}
                      onChange={(event) =>
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id === selected.id ? { ...node, config: { ...node.config, message: event.target.value } } : node
                          )
                        )
                      }
                      className={`mt-1 h-24 w-full rounded-lg border px-2.5 py-2 text-sm outline-none ${theme.soft}`}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["👋", "✅", "📦", "💬", "{{name}}", "{{order_id}}"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setNodes((prev) =>
                              prev.map((node) =>
                                node.id === selected.id
                                  ? { ...node, config: { ...node.config, message: `${node.config.message || ""}${value}` } }
                                  : node
                              )
                            )
                          }
                          className={`rounded-md border px-2 py-1 text-xs ${theme.soft}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <p className={`mt-2 text-[11px] ${theme.muted}`}>Characters: {(selected.config.message || "").length}</p>
                  </div>
                )}

                {selected.type === "send_buttons" && (
                  <div className={`rounded-xl border p-3 ${theme.soft}`}>
                    <label className={`text-[11px] uppercase ${theme.muted}`}>Prompt</label>
                    <textarea
                      value={selected.config.message || ""}
                      onChange={(event) =>
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id === selected.id ? { ...node, config: { ...node.config, message: event.target.value } } : node
                          )
                        )
                      }
                      className={`mt-1 h-20 w-full rounded-lg border px-2.5 py-2 text-sm outline-none ${theme.soft}`}
                    />
                    <div className="mt-2 space-y-2">
                      {(selected.config.buttons || []).map((button) => (
                        <div key={button.id} className={`rounded-lg border p-2 ${theme.soft}`}>
                          <input
                            value={button.label}
                            onChange={(event) =>
                              setNodes((prev) =>
                                prev.map((node) =>
                                  node.id !== selected.id
                                    ? node
                                    : {
                                        ...node,
                                        config: {
                                          ...node.config,
                                          buttons: (node.config.buttons || []).map((item) =>
                                            item.id === button.id ? { ...item, label: event.target.value } : item
                                          ),
                                        },
                                      }
                                )
                              )
                            }
                            className={`w-full rounded-md border px-2 py-1.5 text-xs outline-none ${theme.soft}`}
                            placeholder="Button label"
                          />
                          <input
                            value={button.action}
                            onChange={(event) =>
                              setNodes((prev) =>
                                prev.map((node) =>
                                  node.id !== selected.id
                                    ? node
                                    : {
                                        ...node,
                                        config: {
                                          ...node.config,
                                          buttons: (node.config.buttons || []).map((item) =>
                                            item.id === button.id ? { ...item, action: event.target.value } : item
                                          ),
                                        },
                                      }
                                )
                              )
                            }
                            className={`mt-1.5 w-full rounded-md border px-2 py-1.5 text-xs outline-none ${theme.soft}`}
                            placeholder="Button action"
                          />
                          <select
                            value={button.nextNodeId}
                            onChange={(event) =>
                              setNodes((prev) =>
                                prev.map((node) =>
                                  node.id !== selected.id
                                    ? node
                                    : {
                                        ...node,
                                        config: {
                                          ...node.config,
                                          buttons: (node.config.buttons || []).map((item) =>
                                            item.id === button.id ? { ...item, nextNodeId: event.target.value } : item
                                          ),
                                        },
                                      }
                                )
                              )
                            }
                            className={`mt-1.5 w-full rounded-md border px-2 py-1.5 text-xs outline-none ${theme.soft}`}
                          >
                            <option value="">Connect to next node</option>
                            {nodes
                              .filter((node) => node.id !== selected.id)
                              .map((node) => (
                                <option key={node.id} value={node.id}>
                                  {node.label}
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id !== selected.id
                              ? node
                              : {
                                  ...node,
                                  config: {
                                    ...node.config,
                                    buttons: [
                                      ...(node.config.buttons || []),
                                      { id: uid("btn"), label: `Option ${(node.config.buttons || []).length + 1}`, action: "custom_action", nextNodeId: "" },
                                    ],
                                  },
                                }
                          )
                        )
                      }
                      className="mt-2 inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add button
                    </button>
                  </div>
                )}

                {selected.type !== "send_message" && selected.type !== "send_buttons" && (
                  <div className={`rounded-xl border p-3 ${theme.soft}`}>
                    <label className={`text-[11px] uppercase ${theme.muted}`}>Primary config</label>
                    <input
                      value={
                        selected.config.triggerValue ||
                        selected.config.question ||
                        selected.config.expression ||
                        selected.config.webhookUrl ||
                        selected.config.tag ||
                        selected.config.assignee ||
                        selected.config.message ||
                        String(selected.config.delayMinutes || "")
                      }
                      onChange={(event) =>
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id !== selected.id
                              ? node
                              : node.type === "start_trigger"
                              ? { ...node, config: { ...node.config, triggerValue: event.target.value } }
                              : node.type === "ask_question"
                              ? { ...node, config: { ...node.config, question: event.target.value } }
                              : node.type === "condition"
                              ? { ...node, config: { ...node.config, expression: event.target.value } }
                              : node.type === "webhook_api"
                              ? { ...node, config: { ...node.config, webhookUrl: event.target.value } }
                              : node.type === "tag_contact"
                              ? { ...node, config: { ...node.config, tag: event.target.value } }
                              : node.type === "assign_agent" || node.type === "human_handoff"
                              ? { ...node, config: { ...node.config, assignee: event.target.value } }
                              : node.type === "delay_wait"
                              ? { ...node, config: { ...node.config, delayMinutes: Number(event.target.value) || 0 } }
                              : { ...node, config: { ...node.config, message: event.target.value } }
                          )
                        )
                      }
                      className={`mt-1 w-full rounded-lg border px-2.5 py-2 text-sm outline-none ${theme.soft}`}
                    />
                  </div>
                )}

                <div className={`rounded-xl border p-3 ${theme.soft}`}>
                  <p className={`text-[11px] uppercase ${theme.muted}`}>Connections</p>
                  <div className="mt-2 space-y-1.5">
                    {allEdges
                      .filter((edge) => edge.sourceId === selected.id || edge.targetId === selected.id)
                      .map((edge) => (
                        <div key={edge.id} className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-[11px] ${theme.soft}`}>
                          <span className="truncate pr-2">
                            {edge.sourceId === selected.id ? "Out →" : "In ←"} {edge.label || edge.targetId}
                          </span>
                          {edge.kind === "manual" ? (
                            <button
                              type="button"
                              onClick={() => setEdges((prev) => prev.filter((item) => item.id !== edge.id))}
                              className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Button</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteNode(selected.id)}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete selected node
                </button>
              </div>
            )}

            <div className={`mt-4 rounded-xl border p-3 ${theme.soft}`}>
              <p className={`text-sm font-semibold ${theme.main}`}>Backend model concept</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                {["flows", "flow_nodes", "node_connections", "messages", "buttons", "conditions"].map((item) => (
                  <span key={item} className={`rounded-md border px-2 py-1 ${theme.soft}`}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className={`mt-3 rounded-xl border p-3 ${theme.soft}`}>
              <p className={`text-sm font-semibold ${theme.main}`}>Advanced SaaS features</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {FEATURES.map((feature) => (
                  <span key={feature} className={`rounded-full px-2 py-1 ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
