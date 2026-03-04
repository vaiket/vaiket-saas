"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";

type WaAccount = {
  id: string;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  businessId: string | null;
  status: string;
  qualityRating: string | null;
  lastSyncAt?: string | null;
  createdAt: string;
  hasAccessToken: boolean;
  hasWebhookVerifyToken: boolean;
};

type AuthInfo = {
  role: "owner" | "admin" | "member" | "viewer";
  canManageAccounts: boolean;
};

type SetupInfo = {
  webhookCallbackUrl: string;
  graphApiVersion: string;
  webhookVerifyToken?: string | null;
};

type HealthCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  detail?: string;
};

type HealthSummary = {
  ready: boolean;
  passCount: number;
  warnCount: number;
  failCount: number;
};

type HealthPayload = {
  account: {
    id: string;
    status: string;
    qualityRating: string | null;
    lastSyncAt: string;
  };
  checks: HealthCheck[];
  summary: HealthSummary;
  setup: SetupInfo;
};

type ConnectCandidate = {
  key: string;
  source: "owned" | "client";
  businessId: string;
  businessName: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  phoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  verificationStatus: string | null;
  nameStatus: string | null;
};

type FormState = {
  accountId: string;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  businessId: string;
  accessToken: string;
  webhookVerifyToken: string;
};

const initialForm: FormState = {
  accountId: "",
  name: "",
  phoneNumber: "",
  phoneNumberId: "",
  wabaId: "",
  businessId: "",
  accessToken: "",
  webhookVerifyToken: "",
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

function statusPill(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "ready") return "bg-emerald-100 text-emerald-700";
  if (normalized === "connected") return "bg-green-100 text-green-700";
  if (normalized.includes("pending")) return "bg-amber-100 text-amber-700";
  if (normalized.includes("action")) return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function checkPill(status: HealthCheck["status"]) {
  if (status === "pass") return "bg-emerald-100 text-emerald-700";
  if (status === "warn") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function normalizePhone(raw: string) {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

function toFormState(account: WaAccount): FormState {
  return {
    accountId: account.id,
    name: account.name,
    phoneNumber: account.phoneNumber,
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId,
    businessId: account.businessId || "",
    accessToken: "",
    webhookVerifyToken: "",
  };
}

function candidateToForm(candidate: ConnectCandidate): FormState {
  return {
    accountId: "",
    name: candidate.verifiedName || candidate.wabaName || candidate.businessName || "WhatsApp Account",
    phoneNumber: candidate.phoneNumber,
    phoneNumberId: candidate.phoneNumberId,
    wabaId: candidate.wabaId,
    businessId: candidate.businessId,
    accessToken: "",
    webhookVerifyToken: "",
  };
}

function humanizeConnectReason(reason: string) {
  const raw = decodeURIComponent(reason || "").trim();
  if (!raw) return "Facebook connect failed. Please try again.";

  const lower = raw.toLowerCase();
  if (lower.includes("invalid scopes") || lower.includes("invalid scope")) {
    if (lower.includes("business_management")) {
      return "Invalid scope `business_management`. Remove it from META_OAUTH_SCOPES (keep only whatsapp_business_management, whatsapp_business_messaging), then connect again.";
    }
    return "Facebook rejected one of the requested permissions. Check META_OAUTH_SCOPES and try again.";
  }

  if (lower.includes("missing permission") || lower.includes("#100")) {
    return "Meta Graph API returned (#100) Missing Permission. Connect using a Facebook user who is admin of the Business Manager/WABA, and ensure scopes include whatsapp_business_management + whatsapp_business_messaging.";
  }

  if (raw === "config_error" || raw === "meta_config_missing") {
    return "Meta app config missing. Add META_APP_ID and META_APP_SECRET in environment.";
  }
  if (raw === "missing_state_or_code" || raw === "state_mismatch" || raw === "state_expired") {
    return "Facebook connect session expired. Please start connect again.";
  }
  if (raw === "no_whatsapp_accounts_found") {
    return "No WhatsApp business account/phone found for this Facebook login.";
  }
  if (raw === "forbidden") {
    return "Only owner/admin can start Facebook auto-connect.";
  }
  return raw;
}

export default function WhatsAppAccountsPage() {
  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    role: "viewer",
    canManageAccounts: false,
  });
  const [setupInfo, setSetupInfo] = useState<SetupInfo>({
    webhookCallbackUrl: "",
    graphApiVersion: "v25.0",
    webhookVerifyToken: null,
  });
  const [healthByAccount, setHealthByAccount] = useState<Record<string, HealthPayload>>({});
  const [healthLoadingByAccount, setHealthLoadingByAccount] = useState<Record<string, boolean>>({});

  const [autoCandidates, setAutoCandidates] = useState<ConnectCandidate[]>([]);
  const [autoConnectedAt, setAutoConnectedAt] = useState<string | null>(null);
  const [autoMetaUserName, setAutoMetaUserName] = useState<string | null>(null);
  const [autoHasToken, setAutoHasToken] = useState(false);
  const [autoWebhookToken, setAutoWebhookToken] = useState("");
  const [autoSaveFetchedToken, setAutoSaveFetchedToken] = useState(true);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoFinalizingKey, setAutoFinalizingKey] = useState<string | null>(null);
  const [autoClearing, setAutoClearing] = useState(false);
  const [manualDiscovering, setManualDiscovering] = useState(false);
  const [manualCandidates, setManualCandidates] = useState<ConnectCandidate[]>([]);
  const [manualDiscoverWarnings, setManualDiscoverWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectResult, setConnectResult] = useState<string | null>(null);
  const autoConnectOnceRef = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/whatsapp/accounts", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load WhatsApp accounts");
      }

      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setAuthInfo(
        data.auth || {
          role: "viewer",
          canManageAccounts: false,
        }
      );
      setSetupInfo(
        data.setup || {
          webhookCallbackUrl: "",
          graphApiVersion: "v25.0",
          webhookVerifyToken: null,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadAutoContext = async () => {
    try {
      setAutoLoading(true);
      const res = await fetch("/api/whatsapp/connect/context", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load Facebook auto-connect context");
      }

      if (!data.available) {
        setAutoCandidates([]);
        setAutoConnectedAt(null);
        setAutoMetaUserName(null);
        setAutoHasToken(false);
        return;
      }

      setAutoCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setAutoConnectedAt(data.connectedAt ? new Date(data.connectedAt).toISOString() : null);
      setAutoMetaUserName(data.metaUserName || null);
      setAutoHasToken(Boolean(data.hasFetchedAccessToken));
    } catch (err) {
      setAutoCandidates([]);
      setAutoConnectedAt(null);
      setAutoMetaUserName(null);
      setAutoHasToken(false);
      setError(err instanceof Error ? err.message : "Failed to load auto-connect context");
    } finally {
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connect = params.get("connect");
    const reason = params.get("reason") || "";
    setConnectResult(connect);

    const connectMessage =
      connect === "success"
        ? "Facebook account data fetched. Choose a row below to auto-connect or use in manual form."
        : null;
    const connectError =
      connect === "error" || connect === "forbidden" || connect === "config_error"
        ? humanizeConnectReason(reason || connect || "")
        : null;

    if (connect || reason) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("connect");
      clean.searchParams.delete("reason");
      clean.searchParams.delete("count");
      window.setTimeout(() => {
        window.history.replaceState({}, "", clean.toString());
      }, 12000);
    }

    (async () => {
      await Promise.all([load(), loadAutoContext()]);
      if (connectMessage) setMessage(connectMessage);
      if (connectError) setError(connectError);
    })();
  }, []);

  useEffect(() => {
    const defaultToken = String(setupInfo.webhookVerifyToken || "").trim();
    if (!defaultToken) return;

    if (!autoWebhookToken.trim()) {
      setAutoWebhookToken(defaultToken);
    }

    setForm((prev) => {
      if (prev.webhookVerifyToken.trim()) return prev;
      return { ...prev, webhookVerifyToken: defaultToken };
    });
  }, [setupInfo.webhookVerifyToken]);

  useEffect(() => {
    if (autoConnectOnceRef.current) return;
    if (connectResult !== "success") return;
    if (!authInfo.canManageAccounts) return;
    if (autoCandidates.length !== 1) return;

    autoConnectOnceRef.current = true;
    void autoConnectCandidate(autoCandidates[0]);
  }, [connectResult, authInfo.canManageAccounts, autoCandidates]);

  const copyValue = async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1400);
    } catch {
      setCopied(null);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Account label is required";
    if (!form.phoneNumber.trim()) return "Phone number is required";
    if (!form.phoneNumberId.trim()) return "Meta phone_number_id is required";
    if (!form.wabaId.trim()) return "Meta WABA ID is required";
    if (form.webhookVerifyToken.trim() && !/^[a-zA-Z0-9._\-]{8,128}$/.test(form.webhookVerifyToken.trim())) {
      return "Webhook token must be 8-128 chars and only letters, numbers, dot, underscore or dash";
    }
    return null;
  };

  const onSave = async () => {
    try {
      if (!authInfo.canManageAccounts) {
        setError("Only owner/admin can connect or update WhatsApp accounts");
        return;
      }

      const formError = validateForm();
      if (formError) {
        setError(formError);
        return;
      }

      setSaving(true);
      setError(null);
      setMessage(null);

      const payload = {
        ...form,
        phoneNumber: normalizePhone(form.phoneNumber),
      };

      const res = await fetch("/api/whatsapp/accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save account");
      }

      const mode = data.mode === "updated" ? "updated" : "created";
      setMessage(
        mode === "updated"
          ? "Account updated. Run health checks to confirm readiness."
          : "Account connected. Run health checks to confirm readiness."
      );
      setForm(initialForm);
      setManualCandidates([]);
      setManualDiscoverWarnings([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runHealthCheck = async (accountId: string) => {
    try {
      setHealthLoadingByAccount((prev) => ({ ...prev, [accountId]: true }));
      setError(null);

      const res = await fetch(
        `/api/whatsapp/accounts/health?accountId=${encodeURIComponent(accountId)}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to run health checks");
      }

      setHealthByAccount((prev) => ({
        ...prev,
        [accountId]: data as HealthPayload,
      }));

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === accountId
            ? {
                ...item,
                status: data.account.status,
                qualityRating: data.account.qualityRating,
                lastSyncAt: data.account.lastSyncAt,
              }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run health checks");
    } finally {
      setHealthLoadingByAccount((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const fillFromAccount = (account: WaAccount) => {
    setForm(toFormState(account));
    setManualCandidates([]);
    setManualDiscoverWarnings([]);
    setMessage(`Editing account: ${account.name}`);
    setError(null);
  };

  const fillFromCandidate = (candidate: ConnectCandidate) => {
    setForm((prev) => ({
      ...candidateToForm(candidate),
      accessToken: prev.accessToken,
      webhookVerifyToken: prev.webhookVerifyToken,
    }));
    setMessage("Fetched values loaded into manual form. Add token/webhook token if needed and save.");
    setError(null);
  };

  const discoverFromToken = async () => {
    try {
      if (!authInfo.canManageAccounts) {
        setError("Only owner/admin can fetch IDs from token");
        return;
      }

      if (!form.accessToken.trim()) {
        setError("Paste access token first, then click Fetch IDs from Token");
        return;
      }

      setManualDiscovering(true);
      setError(null);
      setMessage(null);
      setManualDiscoverWarnings([]);

      const res = await fetch("/api/whatsapp/accounts/discover", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: form.accessToken.trim(),
          businessId: form.businessId.trim() || null,
        }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.detail || "Failed to discover IDs from token");
      }

      const candidates = Array.isArray(data.candidates) ? (data.candidates as ConnectCandidate[]) : [];
      setManualCandidates(candidates);
      setManualDiscoverWarnings(
        Array.isArray(data.warnings)
          ? data.warnings.filter((item) => typeof item === "string")
          : []
      );

      if (candidates.length === 1) {
        fillFromCandidate(candidates[0]);
        setMessage("IDs fetched from token and form auto-filled.");
      } else {
        setMessage(`Found ${candidates.length} WhatsApp number(s). Choose one and apply to form.`);
      }
    } catch (err) {
      setManualCandidates([]);
      setManualDiscoverWarnings([]);
      setError(err instanceof Error ? err.message : "Failed to fetch IDs from token");
    } finally {
      setManualDiscovering(false);
    }
  };

  const clearAutoContext = async () => {
    try {
      setAutoClearing(true);
      const res = await fetch("/api/whatsapp/connect/context", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to clear fetched context");
      }

      setAutoCandidates([]);
      setAutoConnectedAt(null);
      setAutoMetaUserName(null);
      setAutoHasToken(false);
      setMessage("Auto-fetched Facebook context cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear auto context");
    } finally {
      setAutoClearing(false);
    }
  };

  const autoConnectCandidate = async (candidate: ConnectCandidate) => {
    try {
      if (!authInfo.canManageAccounts) {
        setError("Only owner/admin can auto-connect account");
        return;
      }

      if (autoWebhookToken.trim() && !/^[a-zA-Z0-9._\-]{8,128}$/.test(autoWebhookToken.trim())) {
        setError("Webhook token format invalid. Use 8-128 chars with letters, numbers, dot, underscore or dash.");
        return;
      }

      setAutoFinalizingKey(candidate.key);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/whatsapp/connect/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateKey: candidate.key,
          accountLabel: candidate.verifiedName || candidate.wabaName,
          webhookVerifyToken: autoWebhookToken.trim() || null,
          saveFetchedToken: autoSaveFetchedToken,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Auto-connect failed");
      }

      const connectedAccountId =
        data && typeof data.account === "object" && data.account && typeof data.account.id === "string"
          ? (data.account.id as string)
          : null;

      setMessage(
        autoSaveFetchedToken
          ? "Account auto-connected with fetched token. Run health check and replace with system token for long-term production."
          : "Account auto-connected. Add permanent/system user token before live sending."
      );

      setAutoCandidates([]);
      setAutoConnectedAt(null);
      setAutoMetaUserName(null);
      setAutoHasToken(false);

      await load();
      if (connectedAccountId) {
        await runHealthCheck(connectedAccountId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-connect failed");
    } finally {
      setAutoFinalizingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Accounts</h1>
            <p className="mt-1 text-sm text-gray-600">
              Auto-connect from Facebook + manual fallback for production onboarding.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-semibold text-indigo-700">
                API: {setupInfo.graphApiVersion}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                Role: {authInfo.role}
              </span>
              {!authInfo.canManageAccounts ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                  Read-only
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/dashboard/whatsapp"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </section>

      {(message || error) ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? (
            <p className="mt-1 flex items-start gap-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Automatic Fetch (Facebook)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Fetch business, WABA and phone IDs from Meta, then connect in one click.
            </p>
            {autoMetaUserName ? (
              <p className="mt-2 text-xs text-gray-500">
                Facebook profile: {autoMetaUserName} | fetched at {formatDateTime(autoConnectedAt)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!authInfo.canManageAccounts) {
                  setError("Only owner/admin can start Facebook auto-connect");
                  return;
                }
                window.location.href = "/api/whatsapp/connect/start";
              }}
              disabled={!authInfo.canManageAccounts}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Connect with Facebook
            </button>
            <button
              type="button"
              onClick={loadAutoContext}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw className={`h-4 w-4 ${autoLoading ? "animate-spin" : ""}`} />
              Reload
            </button>
            {autoCandidates.length > 0 ? (
              <button
                type="button"
                onClick={clearAutoContext}
                disabled={autoClearing}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {autoClearing ? "Clearing..." : "Clear"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoSaveFetchedToken}
              onChange={(e) => setAutoSaveFetchedToken(e.target.checked)}
            />
            <span>
              Save fetched access token
              <span className="block text-xs text-gray-500">
                Fetched token can expire. Replace with system user token for stable production.
              </span>
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Webhook Verify Token (optional)
            </span>
            <input
              value={autoWebhookToken}
              onChange={(e) => setAutoWebhookToken(e.target.value)}
              placeholder="vaiket_wh_verify_2026"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {!autoHasToken && autoCandidates.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Fetched session has no token. Use "Use in Manual Form" and paste permanent token manually.
          </div>
        ) : null}

        {autoLoading ? (
          <p className="mt-4 text-sm text-gray-600">Loading fetched context...</p>
        ) : autoCandidates.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            No fetched account data yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3">Business</th>
                  <th className="py-2 pr-3">WABA</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Meta IDs</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {autoCandidates.map((candidate) => {
                  const busy = autoFinalizingKey === candidate.key;
                  return (
                    <tr key={candidate.key} className="border-b align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-gray-900">{candidate.businessName}</p>
                        <p className="text-xs text-gray-500">{candidate.source}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-gray-900">{candidate.wabaName}</p>
                        <p className="text-xs text-gray-500">{candidate.wabaId}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-gray-900">{candidate.phoneNumber}</p>
                        <p className="text-xs text-gray-500">{candidate.verifiedName || "-"}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-gray-600">
                        <p>phone_id: {candidate.phoneNumberId}</p>
                        <p>business_id: {candidate.businessId}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => autoConnectCandidate(candidate)}
                            disabled={busy || !authInfo.canManageAccounts}
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {busy ? "Connecting..." : "Auto Connect"}
                          </button>
                          <button
                            type="button"
                            onClick={() => fillFromCandidate(candidate)}
                            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Use in Manual Form
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {form.accountId ? "Update Connected Account" : "Manual Connect / Fallback"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Account label"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!authInfo.canManageAccounts}
            />
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+919876543210"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!authInfo.canManageAccounts}
            />
            <input
              value={form.phoneNumberId}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumberId: e.target.value }))}
              placeholder="Meta phone_number_id"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!authInfo.canManageAccounts}
            />
            <input
              value={form.wabaId}
              onChange={(e) => setForm((prev) => ({ ...prev, wabaId: e.target.value }))}
              placeholder="Meta WABA ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!authInfo.canManageAccounts}
            />
            <input
              value={form.businessId}
              onChange={(e) => setForm((prev) => ({ ...prev, businessId: e.target.value }))}
              placeholder="Meta business_id (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
              disabled={!authInfo.canManageAccounts}
            />
            <input
              value={form.accessToken}
              onChange={(e) => setForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              type="password"
              placeholder="Permanent/System User Access Token"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
              disabled={!authInfo.canManageAccounts}
            />
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={discoverFromToken}
                disabled={manualDiscovering || !authInfo.canManageAccounts}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {manualDiscovering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-3.5 w-3.5" />
                )}
                {manualDiscovering ? "Fetching..." : "Fetch IDs from Token"}
              </button>
              <p className="text-xs text-gray-500">
                Auto-read WABA ID and phone_number_id from the pasted token.
              </p>
            </div>
            <input
              value={form.webhookVerifyToken}
              onChange={(e) => setForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))}
              placeholder="Webhook verify token"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
              disabled={!authInfo.canManageAccounts}
            />
          </div>

          {manualDiscoverWarnings.length > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">Token discovery warnings</p>
              <ul className="mt-1 list-disc pl-4">
                {manualDiscoverWarnings.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {manualCandidates.length > 1 ? (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Choose discovered number
              </p>
              <div className="space-y-2">
                {manualCandidates.map((candidate) => (
                  <div
                    key={candidate.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-2"
                  >
                    <div className="text-xs text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {candidate.phoneNumber} | {candidate.verifiedName || candidate.wabaName}
                      </p>
                      <p>
                        waba: {candidate.wabaId} | phone_id: {candidate.phoneNumberId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fillFromCandidate(candidate)}
                      className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Apply to Form
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={onSave}
              disabled={saving || !authInfo.canManageAccounts}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : form.accountId ? "Update Account" : "Save Account"}
            </button>
            {form.accountId ? (
              <button
                onClick={() => {
                  setForm(initialForm);
                  setManualCandidates([]);
                  setManualDiscoverWarnings([]);
                }}
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear Edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Webhook Setup</h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Callback URL</p>
              <p className="mt-1 break-all text-sm text-gray-800">{setupInfo.webhookCallbackUrl || "-"}</p>
              <button
                type="button"
                onClick={() => copyValue("callback", setupInfo.webhookCallbackUrl)}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white"
              >
                <Clipboard className="h-3.5 w-3.5" />
                {copied === "callback" ? "Copied" : "Copy URL"}
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              <p className="font-semibold text-gray-900">Meta Steps</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Add callback URL in Meta webhook config.</li>
                <li>Use same verify token in Meta and this account.</li>
                <li>Subscribe to message and status events.</li>
                <li>Run health check after saving.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <p className="text-xs text-gray-500">Run health checks after changes</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            No WhatsApp accounts connected yet.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const health = healthByAccount[account.id];
              const checking = Boolean(healthLoadingByAccount[account.id]);

              return (
                <article key={account.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{account.name}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {account.phoneNumber} | phone_id: {account.phoneNumberId}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">WABA: {account.wabaId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(account.status)}`}>
                        {account.status}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          account.hasAccessToken ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {account.hasAccessToken ? "Token set" : "Token missing"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold text-gray-800">Quality:</span> {account.qualityRating || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-800">Created:</span> {formatDateTime(account.createdAt)}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-800">Last check:</span> {formatDateTime(account.lastSyncAt)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {authInfo.canManageAccounts ? (
                      <button
                        type="button"
                        onClick={() => fillFromAccount(account)}
                        className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => runHealthCheck(account.id)}
                      disabled={checking}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-300 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                      {checking ? "Checking..." : "Run Health Check"}
                    </button>
                  </div>

                  {health ? (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-1 font-semibold ${
                            health.summary.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {health.summary.ready ? "Ready for production messaging" : "Action required before production"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">
                          Pass {health.summary.passCount}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
                          Warn {health.summary.warnCount}
                        </span>
                        <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">
                          Fail {health.summary.failCount}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {health.checks.map((check) => (
                          <div key={check.key} className="rounded-md border border-white bg-white p-2 text-xs text-gray-700">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-gray-900">{check.label}</p>
                              <span className={`rounded-full px-2 py-0.5 font-semibold ${checkPill(check.status)}`}>
                                {check.status}
                              </span>
                            </div>
                            <p className="mt-1">{check.message}</p>
                            {check.detail ? <p className="mt-1 break-all text-[11px] text-gray-500">{check.detail}</p> : null}
                          </div>
                        ))}
                      </div>

                      {!health.summary.ready ? (
                        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Fix fail/warn checks, then run health check again before high-volume sending.
                        </div>
                      ) : (
                        <div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Account passed required checks and is ready for production dispatching.
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
