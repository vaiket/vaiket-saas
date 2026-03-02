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

function cleanPhone(value: string) {
  return value.trim().replace(/[^\d+]/g, "");
}

function buildEndpoint(phoneNumberId: string, apiVersion?: string) {
  const version = (apiVersion || process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0")
    .trim()
    .replace(/^\/+|\/+$/g, "");
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

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMessage = data?.error?.message || data?.message || `Meta API error (${res.status})`;
    throw new Error(errorMessage);
  }

  const messageId =
    Array.isArray(data?.messages) && data.messages.length > 0
      ? String(data.messages[0]?.id ?? "")
      : "";

  return {
    messageId: messageId || null,
    raw: data,
  };
}

export async function sendMetaTemplateMessage(params: SendTemplateParams): Promise<MetaSendResult> {
  const phoneNumberId = params.phoneNumberId.trim();
  const accessToken = params.accessToken.trim();
  const to = cleanPhone(params.to);
  const templateName = params.templateName.trim();
  const apiVersion = (params.apiVersion || process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0")
    .trim()
    .replace(/^\/+|\/+$/g, "");

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
  const apiVersion = (params.apiVersion || process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0")
    .trim()
    .replace(/^\/+|\/+$/g, "");

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
