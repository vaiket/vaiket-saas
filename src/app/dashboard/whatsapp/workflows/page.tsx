"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CirclePlay,
  Link2,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";

type WorkflowItem = {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: unknown;
  actionConfig: unknown;
  isActive: boolean;
  createdAt: string;
  _count: { runs: number };
};

type AccountItem = { id: string; name: string; phoneNumber: string };
type Banner = { kind: "success" | "error" | "info"; text: string } | null;

type BuilderNodeType = "trigger_keyword" | "send_text" | "end";
type BuilderNode = {
  id: string;
  type: BuilderNodeType;
  x: number;
  y: number;
  data: { label: string; text?: string };
};
type BuilderEdge = { id: string; sourceId: string; targetId: string };
type BuilderGraph = { version: 1; nodes: BuilderNode[]; edges: BuilderEdge[] };

type FormState = {
  name: string;
  keyword: string;
  accountId: string;
  isActive: boolean;
};

const defaultForm: FormState = {
  name: "",
  keyword: "hi",
  accountId: "",
  isActive: true,
};

const defaultGraph: BuilderGraph = {
  version: 1,
  nodes: [
    { id: "n_trigger", type: "trigger_keyword", x: 80, y: 110, data: { label: "Keyword Trigger" } },
    { id: "n_send", type: "send_text", x: 350, y: 110, data: { label: "Send Text", text: "Hi! How can we help you?" } },
    { id: "n_end", type: "end", x: 610, y: 110, data: { label: "End Flow" } },
  ],
  edges: [
    { id: "e1", sourceId: "n_trigger", targetId: "n_send" },
    { id: "e2", sourceId: "n_send", targetId: "n_end" },
  ],
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nodeColor(type: BuilderNodeType) {
  if (type === "trigger_keyword") return "border-blue-300 bg-blue-50";
  if (type === "send_text") return "border-emerald-300 bg-emerald-50";
  return "border-violet-300 bg-violet-50";
}

function nodeTitle(type: BuilderNodeType) {
  if (type === "trigger_keyword") return "Keyword Trigger";
  if (type === "send_text") return "Send Text";
  return "End";
}

function parseGraphFromAction(actionConfig: unknown, triggerKeyword = "hi"): BuilderGraph {
  const actionObj = asObj(actionConfig);
  const graphObj = asObj(actionObj.graph);
  const nodesRaw = Array.isArray(graphObj.nodes) ? graphObj.nodes : null;
  const edgesRaw = Array.isArray(graphObj.edges) ? graphObj.edges : null;

  if (nodesRaw && edgesRaw && nodesRaw.length > 0) {
    const nodes: BuilderNode[] = nodesRaw
      .map((raw) => {
        const item = asObj(raw);
        const id = String(item.id || "");
        const type = String(item.type || "") as BuilderNodeType;
        const data = asObj(item.data);
        if (!id || !["trigger_keyword", "send_text", "end"].includes(type)) return null;
        return {
          id,
          type,
          x: Number(item.x ?? 100),
          y: Number(item.y ?? 100),
          data: {
            label: String(data.label || nodeTitle(type)),
            text: typeof data.text === "string" ? data.text : undefined,
          },
        } as BuilderNode;
      })
      .filter((v): v is BuilderNode => Boolean(v));

    const edges: BuilderEdge[] = edgesRaw
      .map((raw) => {
        const item = asObj(raw);
        const id = String(item.id || "");
        const sourceId = String(item.sourceId || "");
        const targetId = String(item.targetId || "");
        if (!id || !sourceId || !targetId) return null;
        return { id, sourceId, targetId } as BuilderEdge;
      })
      .filter((v): v is BuilderEdge => Boolean(v));

    if (nodes.length > 0) return { version: 1, nodes, edges };
  }

  const legacyReply = typeof actionObj.reply === "string" ? actionObj.reply : "Hi! How can we help you?";
  return {
    version: 1,
    nodes: [
      { id: "n_trigger", type: "trigger_keyword", x: 80, y: 110, data: { label: `Keyword: ${triggerKeyword}` } },
      { id: "n_send", type: "send_text", x: 350, y: 110, data: { label: "Send Text", text: legacyReply } },
      { id: "n_end", type: "end", x: 610, y: 110, data: { label: "End Flow" } },
    ],
    edges: [
      { id: "e1", sourceId: "n_trigger", targetId: "n_send" },
      { id: "e2", sourceId: "n_send", targetId: "n_end" },
    ],
  };
}

function validateBuilder(form: FormState, graph: BuilderGraph) {
  if (!form.name.trim()) return "Workflow name is required.";
  if (!form.keyword.trim()) return "Keyword is required.";
  if (!graph.nodes.some((n) => n.type === "trigger_keyword")) return "Add at least one Trigger node.";
  if (!graph.nodes.some((n) => n.type === "send_text")) return "Add at least one Send Text node.";
  if (!graph.nodes.some((n) => n.type === "end")) return "Add one End node.";
  return null;
}

export default function WhatsAppWorkflowsPage() {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [graph, setGraph] = useState<BuilderGraph>(defaultGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) || null,
    [graph.nodes, selectedNodeId]
  );

  const edgesWithCoords = useMemo(() => {
    const map = new Map(graph.nodes.map((n) => [n.id, n]));
    return graph.edges
      .map((e) => {
        const s = map.get(e.sourceId);
        const t = map.get(e.targetId);
        if (!s || !t) return null;
        return { ...e, x1: s.x + 90, y1: s.y + 28, x2: t.x + 90, y2: t.y + 28 };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
  }, [graph]);

  const load = async () => {
    try {
      setLoading(true);
      const [workflowsRes, accountsRes] = await Promise.all([
        fetch("/api/whatsapp/workflows", { credentials: "include", cache: "no-store" }),
        fetch("/api/whatsapp/accounts", { credentials: "include", cache: "no-store" }),
      ]);
      const workflowsData = await readJsonSafe(workflowsRes);
      const accountsData = await readJsonSafe(accountsRes);
      if (!workflowsRes.ok || !workflowsData.success) throw new Error(workflowsData.error || "Failed to load workflows");
      if (!accountsRes.ok || !accountsData.success) throw new Error(accountsData.error || "Failed to load accounts");
      setItems(workflowsData.workflows || []);
      setAccounts(accountsData.accounts || []);
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Load failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!dragState.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left - dragState.current.dx;
      const y = event.clientY - rect.top - dragState.current.dy;
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === dragState.current!.id ? { ...n, x: Math.max(10, x), y: Math.max(10, y) } : n
        ),
      }));
    };
    const up = () => {
      dragState.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const resetBuilder = () => {
    setEditingId(null);
    setForm(defaultForm);
    setGraph(defaultGraph);
    setSelectedNodeId(null);
    setConnectSourceId(null);
  };

  const onNodeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-builder-node-type") as BuilderNodeType;
    if (!["trigger_keyword", "send_text", "end"].includes(type)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const node: BuilderNode = {
      id: uid("n"),
      type,
      x: Math.max(10, event.clientX - rect.left - 90),
      y: Math.max(10, event.clientY - rect.top - 24),
      data: {
        label: nodeTitle(type),
        text: type === "send_text" ? "New reply text" : undefined,
      },
    };
    setGraph((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
  };

  const addEdge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setGraph((prev) => {
      const exists = prev.edges.some((e) => e.sourceId === sourceId && e.targetId === targetId);
      if (exists) return prev;
      return {
        ...prev,
        edges: [...prev.edges, { id: uid("e"), sourceId, targetId }],
      };
    });
  };

  const saveWorkflow = async () => {
    const validationError = validateBuilder(form, graph);
    if (validationError) {
      setBanner({ kind: "error", text: validationError });
      return;
    }
    try {
      setSaving(true);
      setBanner(null);
      const payload = {
        name: form.name.trim(),
        triggerType: "keyword_flow",
        triggerConfig: {
          keyword: form.keyword.trim(),
          accountId: form.accountId || null,
        },
        actionConfig: {
          graph,
        },
        isActive: form.isActive,
      };
      const res = await fetch("/api/whatsapp/workflows", {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      setBanner({ kind: "success", text: editingId ? "Workflow updated." : "Workflow created." });
      resetBuilder();
      await load();
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: WorkflowItem) => {
    try {
      setTogglingId(item.id);
      const res = await fetch("/api/whatsapp/workflows", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  const openEditor = (item: WorkflowItem) => {
    const trigger = asObj(item.triggerConfig);
    setEditingId(item.id);
    setForm({
      name: item.name,
      keyword: String(trigger.keyword || "hi"),
      accountId: String(trigger.accountId || ""),
      isActive: item.isActive,
    });
    setGraph(parseGraphFromAction(item.actionConfig, String(trigger.keyword || "hi")));
    setBanner({ kind: "info", text: `Editing: ${item.name}` });
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Workflow Builder (Drag & Drop)</h1>
            <p className="mt-1 text-sm text-slate-600">Build keyword to reply automations visually. Runtime is connected in webhook.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link href="/dashboard/whatsapp" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Back to Hub</Link>
          </div>
        </div>
      </section>

      {banner && <div className={`rounded-2xl border px-4 py-3 text-sm ${banner.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : banner.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{banner.text}</div>}

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="space-y-4 xl:col-span-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Workflow Settings</h2>
            <div className="space-y-2">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Workflow name" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input value={form.keyword} onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))} placeholder="Trigger keyword" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <select value={form.accountId} onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All accounts</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.phoneNumber})</option>)}
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} /> Active</label>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={saveWorkflow} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : editingId ? "Update" : "Create"}</button>
              <button onClick={resetBuilder} className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Reset</button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Drag Nodes</h2>
            <div className="space-y-2">
              {(["trigger_keyword", "send_text", "end"] as BuilderNodeType[]).map((type) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/x-builder-node-type", type)}
                  className={`cursor-grab rounded-xl border px-3 py-2 text-sm font-medium ${nodeColor(type)}`}
                >
                  {nodeTitle(type)}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-6">
          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onNodeDrop}
            className="relative h-[540px] rounded-3xl border border-dashed border-slate-300 bg-slate-50"
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {edgesWithCoords.map((edge) => (
                <line key={edge.id} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke="#334155" strokeWidth="2" />
              ))}
            </svg>

            {graph.nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  if (connectSourceId && connectSourceId !== node.id) {
                    addEdge(connectSourceId, node.id);
                    setConnectSourceId(null);
                  }
                  setSelectedNodeId(node.id);
                }}
                onMouseDown={(e) => {
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  dragState.current = { id: node.id, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
                }}
                style={{ left: node.x, top: node.y }}
                className={`absolute w-[180px] rounded-xl border px-3 py-2 text-left shadow-sm ${nodeColor(node.type)} ${selectedNodeId === node.id ? "ring-2 ring-blue-300" : ""}`}
              >
                <p className="text-xs font-semibold text-slate-800">{node.data.label}</p>
                {node.type === "send_text" && <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{node.data.text || "No text set"}</p>}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 xl:col-span-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Inspector</h2>
            {!selectedNode ? (
              <p className="text-xs text-slate-500">Select a node from canvas.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-slate-800">{nodeTitle(selectedNode.type)}</p>
                <input value={selectedNode.data.label} onChange={(e) => setGraph((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n)) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                {selectedNode.type === "send_text" && (
                  <textarea rows={4} value={selectedNode.data.text || ""} onChange={(e) => setGraph((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, text: e.target.value } } : n)) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Reply text..." />
                )}
                <div className="flex gap-2">
                  <button onClick={() => setConnectSourceId(selectedNode.id)} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${connectSourceId === selectedNode.id ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}><Link2 className="h-3.5 w-3.5" />Connect from</button>
                  <button onClick={() => setGraph((prev) => ({ ...prev, nodes: prev.nodes.filter((n) => n.id !== selectedNode.id), edges: prev.edges.filter((e) => e.sourceId !== selectedNode.id && e.targetId !== selectedNode.id) }))} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Connections</h2>
            <div className="space-y-2">
              {graph.edges.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                  <span>{e.sourceId} {"->"} {e.targetId}</span>
                  <button onClick={() => setGraph((prev) => ({ ...prev, edges: prev.edges.filter((x) => x.id !== e.id) }))} className="text-rose-600 hover:text-rose-700">Remove</button>
                </div>
              ))}
              {graph.edges.length === 0 && <p className="text-xs text-slate-500">No edges created.</p>}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Saved Workflows</h2>
          <span className="text-xs text-slate-500">{items.length} total</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">Runs: {item._count.runs}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "active" : "inactive"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button onClick={() => openEditor(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"><Settings2 className="h-3.5 w-3.5" />Edit</button>
                <button onClick={() => toggleActive(item)} disabled={togglingId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">{item.isActive ? <CirclePlay className="h-3.5 w-3.5 text-rose-600" /> : <CirclePlay className="h-3.5 w-3.5 text-emerald-600" />}{item.isActive ? "Disable" : "Enable"}</button>
              </div>
            </article>
          ))}
          {!loading && items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">No workflows created yet.</div>}
        </div>
      </section>
    </div>
  );
}
