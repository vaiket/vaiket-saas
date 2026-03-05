function readText(value: unknown) {
  return String(value ?? "").trim();
}

function firstForwardedValue(value: unknown) {
  const text = readText(value);
  if (!text) return "";
  return text.split(",")[0]?.trim() || "";
}

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/g, "");
}

function normalizeHost(rawHost: string) {
  if (!rawHost) return "";
  const host = firstForwardedValue(rawHost).replace(/\s+/g, "");
  if (!host) return "";

  if (/^https?:\/\//i.test(host)) {
    try {
      return new URL(host).host;
    } catch {
      return "";
    }
  }

  return host;
}

function normalizeProto(rawProto: string, fallback: string) {
  const proto = firstForwardedValue(rawProto).toLowerCase();
  if (proto === "http" || proto === "https") return proto;
  return fallback;
}

function stripDefaultPort(host: string, proto: string) {
  if (proto === "https" && host.endsWith(":443")) return host.slice(0, -4);
  if (proto === "http" && host.endsWith(":80")) return host.slice(0, -3);
  return host;
}

export function isLocalHostLike(value: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

export function getPublicBaseUrl(req: Request) {
  const requestUrl = new URL(req.url);
  const requestHost = normalizeHost(requestUrl.host);
  const requestHostIsLocal = isLocalHostLike(requestHost);

  const envBaseRaw = readText(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.BASE_URL
  );

  if (envBaseRaw) {
    const envBase = stripTrailingSlashes(envBaseRaw);
    try {
      const envHost = new URL(envBase).host;
      const envHostIsLocal = isLocalHostLike(envHost);

      if (process.env.NODE_ENV === "production" && !envHostIsLocal) {
        return envBase;
      }

      if (requestHostIsLocal === envHostIsLocal) {
        return envBase;
      }
    } catch {
      // ignore invalid env URL and fallback to forwarded host detection
    }
  }

  const forwardedHost = normalizeHost(
    readText(req.headers.get("x-forwarded-host")) ||
      readText(req.headers.get("host")) ||
      requestHost
  );

  const fallbackProto = requestUrl.protocol.replace(":", "") || "https";
  let proto = normalizeProto(readText(req.headers.get("x-forwarded-proto")), fallbackProto);

  const productionHost = readText(process.env.APP_PUBLIC_HOST || "app.vaiket.com");
  let normalizedHost = forwardedHost || requestHost || productionHost;

  if (process.env.NODE_ENV === "production") {
    if (!normalizedHost || isLocalHostLike(normalizedHost)) {
      normalizedHost = productionHost;
    }
    if (!isLocalHostLike(normalizedHost) && proto !== "https") {
      proto = "https";
    }
  } else if (normalizedHost.startsWith("0.0.0.0:")) {
    normalizedHost = normalizedHost.replace("0.0.0.0", "localhost");
  }

  normalizedHost = stripDefaultPort(normalizedHost, proto);
  return `${proto}://${normalizedHost}`;
}

function normalizeConfiguredRedirect(value: string) {
  return stripTrailingSlashes(readText(value));
}

function pickGoogleRedirectCandidate(requestHostIsLocal: boolean, value: string) {
  if (!value) return "";
  return requestHostIsLocal === isLocalHostLike(value) ? value : "";
}

export function getGoogleRedirectUri(req: Request) {
  const requestHostIsLocal = isLocalHostLike(new URL(req.url).host);
  const preferProd = process.env.NODE_ENV === "production" || !requestHostIsLocal;

  const primary = normalizeConfiguredRedirect(
    preferProd
      ? readText(process.env.GOOGLE_REDIRECT_URI_PROD || process.env.GOOGLE_REDIRECT_URI)
      : readText(process.env.GOOGLE_REDIRECT_URI_LOCAL || process.env.GOOGLE_REDIRECT_URI)
  );

  const secondary = normalizeConfiguredRedirect(
    preferProd
      ? readText(process.env.GOOGLE_REDIRECT_URI_LOCAL || process.env.GOOGLE_REDIRECT_URI)
      : readText(process.env.GOOGLE_REDIRECT_URI_PROD || process.env.GOOGLE_REDIRECT_URI)
  );

  const configured =
    pickGoogleRedirectCandidate(requestHostIsLocal, primary) ||
    pickGoogleRedirectCandidate(requestHostIsLocal, secondary);

  if (configured) return configured;
  return `${getPublicBaseUrl(req)}/api/auth/google/callback`;
}

function pickGoogleCredential(
  preferProd: boolean,
  prodValue: string,
  sharedValue: string,
  localValue: string
) {
  if (preferProd) {
    return prodValue || sharedValue || localValue;
  }

  return localValue || sharedValue || prodValue;
}

export function getGoogleOAuthClientConfig(req: Request) {
  const requestHostIsLocal = isLocalHostLike(new URL(req.url).host);
  const preferProd = process.env.NODE_ENV === "production" || !requestHostIsLocal;

  const clientId = pickGoogleCredential(
    preferProd,
    readText(process.env.GOOGLE_CLIENT_ID_PROD),
    readText(process.env.GOOGLE_CLIENT_ID),
    readText(process.env.GOOGLE_CLIENT_ID_LOCAL)
  );

  const clientSecret = pickGoogleCredential(
    preferProd,
    readText(process.env.GOOGLE_CLIENT_SECRET_PROD),
    readText(process.env.GOOGLE_CLIENT_SECRET),
    readText(process.env.GOOGLE_CLIENT_SECRET_LOCAL)
  );

  return {
    clientId,
    clientSecret,
    preferProd,
  };
}
