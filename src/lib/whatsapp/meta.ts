type SendTemplateParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
  apiVersion?: string;
};

type SendTextParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
  previewUrl?: boolean;
  apiVersion?: string;
};

type MetaSendResult = {
  messageId: string | null;
  raw: unknown;
};

const DEFAULT_GRAPH_API_VERSION = "v25.0";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 8_000;

function readBoundedInt(
  value: string | undefined,
  fallback: number,
  params: { min: number; max: number }
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < params.min) return params.min;
  if (rounded > params.max) return params.max;
  return rounded;
}

function cleanPhone(value: string) {
  return value.trim().replace(/\D/g, "");
}

function normalizeApiVersion(value: string | undefined) {
  return (value || process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION)
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function parseRetryAfterMs(headerValue: string | null) {
  const raw = String(headerValue || "").trim();
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }

  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) {
    const delay = dateMs - Date.now();
    return delay > 0 ? delay : 0;
  }

  return null;
}

function computeBackoffDelayMs(attempt: number) {
  const base = 800 * 2 ** attempt;
  return Math.min(base, MAX_RETRY_DELAY_MS);
}

function shouldRetryStatus(status: number) {
  return status === 429 || status >= 500;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEndpoint(phoneNumberId: string, apiVersion?: string) {
  const version = normalizeApiVersion(apiVersion);
  return `https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`;
}

async function sendMetaMessage(
  params: { phoneNumberId: string; accessToken: string; apiVersion?: string },
  payload: Record<string, unknown>
): Promise<MetaSendResult> {
  const phoneNumberId = params.phoneNumberId.trim();
  const accessToken = params.accessToken.trim();

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing required Meta credentials");
  }

  const endpoint = buildEndpoint(phoneNumberId, params.apiVersion);
  const timeoutMs = readBoundedInt(process.env.WHATSAPP_META_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, {
    min: 3000,
    max: 60000,
  });
  const maxRetries = readBoundedInt(process.env.WHATSAPP_META_MAX_RETRIES, DEFAULT_MAX_RETRIES, {
    min: 0,
    max: 5,
  });

  const serializedPayload = JSON.stringify(payload);
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: serializedPayload,
        signal: controller.signal,
      });

      let data: unknown = null;
      try {
        data = (await res.json()) as unknown;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const dataRecord = asRecord(data);
        const errorRecord = asRecord(dataRecord?.error);
        const baseMessage =
          readText(errorRecord?.message) ||
          readText(dataRecord?.message) ||
          `Meta API error (${res.status})`;
        const code = readText(errorRecord?.code);
        const errorCode = code ? ` code=${code}` : "";
        const errorMessage = `${baseMessage}${errorCode}`.trim();
        const canRetry = shouldRetryStatus(res.status) && attempt < maxRetries;

        if (canRetry) {
          const retryAfter = parseRetryAfterMs(res.headers.get("retry-after"));
          const delayMs = retryAfter ?? computeBackoffDelayMs(attempt);
          await sleep(delayMs);
          continue;
        }

        throw new Error(errorMessage);
      }

      const dataRecord = asRecord(data);
      const messages = Array.isArray(dataRecord?.messages) ? dataRecord.messages : [];
      const first = messages.length > 0 ? asRecord(messages[0]) : null;
      const messageId = readText(first?.id);

      return {
        messageId: messageId || null,
        raw: data,
      };
    } catch (error) {
      const networkError = error instanceof Error && error.name === "AbortError";
      const canRetry = (networkError || error instanceof TypeError) && attempt < maxRetries;
      if (canRetry) {
        await sleep(computeBackoffDelayMs(attempt));
        continue;
      }

      if (networkError) {
        throw new Error(`Meta API timeout after ${timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Meta API request failed after retries");
}

export async function sendMetaTemplateMessage(params: SendTemplateParams): Promise<MetaSendResult> {
  const phoneNumberId = params.phoneNumberId.trim();
  const accessToken = params.accessToken.trim();
  const to = cleanPhone(params.to);
  const templateName = params.templateName.trim();
  const apiVersion = normalizeApiVersion(params.apiVersion);

  if (!phoneNumberId || !accessToken || !to || !templateName) {
    throw new Error("Missing required Meta message parameters");
  }

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: params.languageCode?.trim() || "en_US",
      },
    },
  };

  if (params.components && params.components.length > 0) {
    (payload.template as Record<string, unknown>).components = params.components;
  }

  return sendMetaMessage(
    {
      phoneNumberId,
      accessToken,
      apiVersion,
    },
    payload
  );
}

export async function sendMetaTextMessage(params: SendTextParams): Promise<MetaSendResult> {
  const phoneNumberId = params.phoneNumberId.trim();
  const accessToken = params.accessToken.trim();
  const to = cleanPhone(params.to);
  const text = params.text.trim();
  const apiVersion = normalizeApiVersion(params.apiVersion);

  if (!phoneNumberId || !accessToken || !to || !text) {
    throw new Error("Missing required Meta text message parameters");
  }

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: text,
      preview_url: Boolean(params.previewUrl),
    },
  };

  return sendMetaMessage(
    {
      phoneNumberId,
      accessToken,
      apiVersion,
    },
    payload
  );
}
