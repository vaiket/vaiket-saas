"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type WaAccountOption = {
  id: string;
  name: string;
  phoneNumber: string;
};

type QrFormState = {
  messageText: string;
  title: string;
  subtitle: string;
  businessName: string;
  contactNumber: string;
};

type SavedQrDetails = QrFormState & {
  id: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
};

type NoticeState = {
  type: "success" | "error";
  text: string;
} | null;

const FALLBACK_ACCOUNT_ID = "__local__";

function normalizePhone(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function buildWhatsAppLink(form: QrFormState) {
  const digits = normalizePhone(form.contactNumber);
  const message = encodeURIComponent(form.messageText.trim());
  return `https://wa.me/${digits}?text=${message}`;
}

function buildQrImageUrl(rawText: string, size = 900) {
  const encoded = encodeURIComponent(rawText);
  return `https://quickchart.io/qr?text=${encoded}&size=${size}&margin=2&dark=111827&light=ffffff&ecLevel=H`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  lines.forEach((line, idx) => {
    const width = ctx.measureText(line).width;
    ctx.fillText(line, centerX - width / 2, startY + idx * lineHeight);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function getDefaultForm(account?: WaAccountOption | null): QrFormState {
  return {
    messageText: "Hi! I want to know more about your services.",
    title: "SCAN HERE",
    subtitle: "to Chat with us on WhatsApp",
    businessName: account?.name || "",
    contactNumber: account?.phoneNumber || "",
  };
}

export default function WhatsAppMyQrCodePage() {
  const [accounts, setAccounts] = useState<WaAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(FALLBACK_ACCOUNT_ID);

  const [savedQr, setSavedQr] = useState<SavedQrDetails | null>(null);
  const [loadingSavedQr, setLoadingSavedQr] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState<QrFormState>(getDefaultForm());

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch("/api/whatsapp/accounts", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJsonSafe(res);
        const list = Array.isArray(payload.accounts) ? payload.accounts : [];
        const mapped: WaAccountOption[] = list.map((item: any) => ({
          id: String(item.id || ""),
          name: String(item.name || "WhatsApp Account"),
          phoneNumber: String(item.phoneNumber || ""),
        }));

        setAccounts(mapped);
        setSelectedAccountId((prev) => {
          if (mapped.length === 0) return FALLBACK_ACCOUNT_ID;
          if (mapped.some((item) => item.id === prev)) return prev;
          return mapped[0].id;
        });
      } catch {
        setAccounts([]);
        setSelectedAccountId(FALLBACK_ACCOUNT_ID);
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId === FALLBACK_ACCOUNT_ID) {
      setSavedQr(null);
      return;
    }

    const controller = new AbortController();

    async function loadSavedQr() {
      try {
        setLoadingSavedQr(true);
        const res = await fetch(
          `/api/whatsapp/qr?accountId=${encodeURIComponent(selectedAccountId)}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const payload = await readJsonSafe(res);
        if (!res.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load QR details");
        }
        setSavedQr(payload.qrCode ?? null);
      } catch {
        setSavedQr(null);
      } finally {
        setLoadingSavedQr(false);
      }
    }

    loadSavedQr();
    return () => controller.abort();
  }, [selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const hasSavedQr = Boolean(savedQr);
  const qrLink = hasSavedQr ? buildWhatsAppLink(savedQr) : "";
  const qrImageUrl = hasSavedQr ? buildQrImageUrl(qrLink) : "";

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreateModal = () => {
    setEditing(false);
    setForm(getDefaultForm(selectedAccount));
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!savedQr) return;
    setEditing(true);
    setForm({
      messageText: savedQr.messageText,
      title: savedQr.title,
      subtitle: savedQr.subtitle,
      businessName: savedQr.businessName,
      contactNumber: savedQr.contactNumber,
    });
    setModalOpen(true);
  };

  const saveQrDetails = async () => {
    if (!selectedAccountId || selectedAccountId === FALLBACK_ACCOUNT_ID) {
      setNotice({ type: "error", text: "Please connect/select a WhatsApp account first." });
      return;
    }

    const payload: QrFormState = {
      messageText: form.messageText.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      businessName: form.businessName.trim(),
      contactNumber: form.contactNumber.trim(),
    };

    if (
      !payload.messageText ||
      !payload.title ||
      !payload.subtitle ||
      !payload.businessName ||
      !payload.contactNumber
    ) {
      setNotice({ type: "error", text: "Please fill all required fields." });
      return;
    }

    if (normalizePhone(payload.contactNumber).length < 8) {
      setNotice({ type: "error", text: "Please enter a valid contact number." });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/whatsapp/qr", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          ...payload,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save QR details");
      }
      setSavedQr(data.qrCode as SavedQrDetails);
      setModalOpen(false);
      setNotice({
        type: "success",
        text: editing ? "QR Code details updated successfully." : "QR Code created successfully.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save QR details.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteQrDetails = async () => {
    if (!savedQr) return;
    const ok = window.confirm("Delete QR details?");
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/whatsapp/qr?accountId=${encodeURIComponent(selectedAccountId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete QR details");
      }
      setSavedQr(null);
      setNotice({ type: "success", text: "QR Code deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete QR details.",
      });
    }
  };

  const downloadQrCard = async () => {
    if (!savedQr) return;
    try {
      setDownloading(true);

      const qrResponse = await fetch(buildQrImageUrl(qrLink, 1024), { cache: "no-store" });
      if (!qrResponse.ok) throw new Error("Failed to prepare QR image");
      const qrBlob = await qrResponse.blob();
      const qrObjectUrl = URL.createObjectURL(qrBlob);
      const qrImg = await loadImage(qrObjectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 1850;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser");

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#26d39f");
      grad.addColorStop(1, "#007154");

      drawRoundedRect(ctx, 80, 70, 1240, 1710, 64);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = '900 130px "Inter", "Segoe UI", Arial, sans-serif';
      drawCenteredWrappedText(ctx, savedQr.title.toUpperCase(), 700, 250, 1080, 132, 2);

      ctx.font = '700 92px "Inter", "Segoe UI", Arial, sans-serif';
      drawCenteredWrappedText(ctx, savedQr.subtitle, 700, 390, 1080, 102, 3);

      drawRoundedRect(ctx, 165, 530, 1070, 1140, 50);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#f5b900";
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = '900 72px "Inter", "Segoe UI", Arial, sans-serif';
      drawCenteredWrappedText(ctx, savedQr.businessName, 700, 700, 920, 82, 2);

      ctx.fillStyle = "#1e293b";
      ctx.font = '700 62px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillText(normalizePhone(savedQr.contactNumber), 700 - ctx.measureText(normalizePhone(savedQr.contactNumber)).width / 2, 835);

      ctx.drawImage(qrImg, 370, 890, 660, 660);

      ctx.beginPath();
      ctx.arc(700, 1220, 84, 0, Math.PI * 2);
      ctx.fillStyle = "#25D366";
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = '900 58px "Inter", "Segoe UI", Arial, sans-serif';
      const waText = "WA";
      ctx.fillText(waText, 700 - ctx.measureText(waText).width / 2, 1242);

      URL.revokeObjectURL(qrObjectUrl);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${savedQr.businessName.replace(/\s+/g, "-").toLowerCase()}-whatsapp-qr-card.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setNotice({ type: "success", text: "Full QR card downloaded successfully." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to download card.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-7 md:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              WhatsApp QR Campaign
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">My QR Code</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              QR once generated stays visible here until deleted.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:min-w-[340px]">
            <label className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Active WhatsApp Account</p>
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                disabled={loadingAccounts || accounts.length === 0}
              >
                {accounts.length === 0 ? (
                  <option value={FALLBACK_ACCOUNT_ID}>No connected account</option>
                ) : (
                  accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.phoneNumber})
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="flex gap-2">
              <Link
                href="/dashboard/whatsapp"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back to Hub
              </Link>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Generate QR
              </button>
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {notice.text}
          </div>
        </div>
      ) : null}

      {loadingSavedQr ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 shadow-sm">
          Loading saved QR details...
        </section>
      ) : !hasSavedQr ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Create your QR poster</h2>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                Fill details and save. It will be stored in database and always shown here.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <QrCode className="h-4 w-4" />
                Generate QR Code
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 via-white to-white p-5 shadow-sm">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <QrCode className="h-8 w-8" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">No QR generated yet</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-medium text-slate-900">QR Code Details</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={deleteQrDetails}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete QR Code
              </button>
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-emerald-900 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit QR Details
              </button>
            </div>
          </div>

          <div className="flex min-h-[560px] items-center justify-center px-4 py-8 md:px-6">
            <div className="w-full max-w-[360px]">
              <div className="overflow-hidden rounded-[16px] bg-gradient-to-b from-emerald-400 to-emerald-700 p-4">
                <div className="text-center text-white">
                  <p className="break-words text-5xl font-extrabold leading-none">{savedQr.title}</p>
                  <p className="mt-2 break-words text-4xl font-semibold leading-none">{savedQr.subtitle}</p>
                </div>

                <div className="mt-4 rounded-[14px] border-4 border-amber-400 bg-white p-4">
                  <p className="break-words text-center text-3xl font-bold leading-tight text-slate-900">
                    {savedQr.businessName}
                  </p>
                  <p className="mt-1 text-center text-2xl font-semibold leading-tight text-slate-700">
                    {normalizePhone(savedQr.contactNumber)}
                  </p>

                  <div className="relative mx-auto mt-3 h-[190px] w-[190px]">
                    <img
                      src={qrImageUrl}
                      alt="WhatsApp QR Code"
                      className="h-full w-full rounded bg-white object-contain"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-white bg-[#25D366] shadow-lg">
                        <MessageCircle className="h-6 w-6 text-white" strokeWidth={2.3} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadQrCard}
                disabled={downloading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003d2f] px-4 py-3 text-xl font-semibold text-white transition hover:bg-[#015541] disabled:opacity-70"
              >
                <Download className="h-5 w-5" />
                {downloading ? "Preparing..." : "Download QR"}
              </button>
            </div>
          </div>
        </section>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-3 py-6 backdrop-blur-[2px]"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl border-2 border-emerald-900 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 py-5">
              <h3 className="text-4xl font-medium text-slate-800">
                {editing ? "Edit QR Details" : "Create QR Details"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close popup"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="space-y-5 px-6 pb-6">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Text *</span>
                <textarea
                  value={form.messageText}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      messageText: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Enter message"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-2xl text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">SubTitle</span>
                  <input
                    value={form.subtitle}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        subtitle: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <p className="text-4xl font-medium text-slate-800">Business Details</p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Business Name</span>
                    <input
                      value={form.businessName}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          businessName: event.target.value,
                        }))
                      }
                      placeholder="Enter business name"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Contact Number</span>
                    <input
                      value={form.contactNumber}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          contactNumber: event.target.value,
                        }))
                      }
                      placeholder="Enter contact number"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl px-5 py-2.5 text-3xl font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveQrDetails}
                disabled={saving}
                className="rounded-xl bg-[#003d2f] px-8 py-2.5 text-3xl font-semibold text-white transition hover:bg-[#015541] disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
