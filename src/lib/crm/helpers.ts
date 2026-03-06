import {
  CRM_APPOINTMENT_STATUSES,
  CRM_DEAL_STAGES,
  CRM_LEAD_STATUSES,
  CRM_TASK_PRIORITIES,
  CRM_TASK_STATUSES,
  DEFAULT_CRM_APPOINTMENT_STATUS,
  DEFAULT_CRM_DEAL_STAGE,
  DEFAULT_CRM_LEAD_STATUS,
  DEFAULT_CRM_TASK_PRIORITY,
  DEFAULT_CRM_TASK_STATUS,
  type CrmAppointmentStatus,
  type CrmDealStage,
  type CrmLeadStatus,
  type CrmTaskPriority,
  type CrmTaskStatus,
} from "@/lib/crm/constants";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function readText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizePhoneKey(value: unknown) {
  const digits = readText(value).replace(/\D/g, "");
  return digits || null;
}

export function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags = value
    .map((item) => readText(item))
    .filter(Boolean)
    .slice(0, 20);
  return Array.from(new Set(tags));
}

export function clamp(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function normalizeCaseInsensitive<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  const raw = readText(value);
  if (!raw) return fallback;
  const matched = allowed.find((item) => item.toLowerCase() === raw.toLowerCase());
  return matched ?? fallback;
}

export function normalizeLeadStatus(value: unknown): CrmLeadStatus {
  return normalizeCaseInsensitive(value, CRM_LEAD_STATUSES, DEFAULT_CRM_LEAD_STATUS);
}

export function normalizeDealStage(value: unknown): CrmDealStage {
  return normalizeCaseInsensitive(value, CRM_DEAL_STAGES, DEFAULT_CRM_DEAL_STAGE);
}

export function normalizeTaskPriority(value: unknown): CrmTaskPriority {
  return normalizeCaseInsensitive(value, CRM_TASK_PRIORITIES, DEFAULT_CRM_TASK_PRIORITY);
}

export function normalizeTaskStatus(value: unknown): CrmTaskStatus {
  return normalizeCaseInsensitive(value, CRM_TASK_STATUSES, DEFAULT_CRM_TASK_STATUS);
}

export function normalizeAppointmentStatus(value: unknown): CrmAppointmentStatus {
  return normalizeCaseInsensitive(value, CRM_APPOINTMENT_STATUSES, DEFAULT_CRM_APPOINTMENT_STATUS);
}

export function parseDateOrNull(value: unknown) {
  const raw = readText(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseNumberOrDefault(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toCsvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((item) => {
      const raw = String(item ?? "");
      if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    })
    .join(",");
}
