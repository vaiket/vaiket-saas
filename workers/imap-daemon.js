// worker/imap-daemon.js
/**
 * IMAP + AI daemon
 * - Repeatedly calls your Next.js endpoint: POST {APP_BASE_URL}/api/cron/imap-sync
 * - Default interval: 7 seconds (IMAP_SYNC_INTERVAL_SECONDS)
 * - Exponential backoff on repeated network failures
 *
 * Usage:
 *  APP_BASE_URL=http://localhost:3000 IMAP_SYNC_INTERVAL_SECONDS=7 node worker/imap-daemon.js
 */

const INTERVAL_SECONDS = parseInt(process.env.IMAP_SYNC_INTERVAL_SECONDS || "7", 10);
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const HEALTH_PATH = process.env.HEALTH_PATH || "/api/health";
const ENDPOINT = process.env.IMAP_SYNC_ENDPOINT || "/api/cron/imap-sync";
const FULL_URL = `${APP_BASE_URL.replace(/\/$/, "")}${ENDPOINT}`;
const LOG_PREFIX = "[imap-daemon]";

// FIXED: increase timeout to 3 minutes
const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || "180000", 10);

let consecutiveErrors = 0;

function now() {
  return new Date().toISOString();
}

async function fetchWithTimeout(url, opts = {}, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  opts.signal = controller.signal;

  try {
    const res = await fetch(url, opts);
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function tick() {
  try {
    console.log(`${LOG_PREFIX} [${now()}] calling ${FULL_URL}`);
    const res = await fetchWithTimeout(FULL_URL, {
      method: process.env.IMAP_SYNC_HTTP_METHOD || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.DAEMON_AUTH_TOKEN
          ? { Authorization: `Bearer ${process.env.DAEMON_AUTH_TOKEN}` }
          : {}),
      },
      body: process.env.IMAP_SYNC_BODY || null,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.error(`${LOG_PREFIX} [${now()}] server error ${res.status} ${res.statusText} — ${text}`);
      consecutiveErrors++;
    } else {
      const json = await res.json().catch(() => null);
      console.log(`${LOG_PREFIX} [${now()}] OK —`, json);
      consecutiveErrors = 0;
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} [${now()}] fetch error —`, err && err.message ? err.message : err);
    consecutiveErrors++;
  }
}

async function runLoop() {
  console.log(`${LOG_PREFIX} starting daemon. interval=${INTERVAL_SECONDS}s baseUrl=${APP_BASE_URL} endpoint=${ENDPOINT}`);
  await tick();

  setInterval(async () => {
    if (consecutiveErrors > 0) {
      const skipProbability = Math.min(0.9, consecutiveErrors * 0.15);
      if (Math.random() < skipProbability) {
        console.warn(`${LOG_PREFIX} skipping tick due to repeated errors (consecutiveErrors=${consecutiveErrors}, skipProb=${skipProbability.toFixed(2)})`);
        return;
      }
    }
    await tick();
  }, INTERVAL_SECONDS * 1000);
}

(async () => {
  try {
    if (typeof fetch === "undefined") {
      console.warn(`${LOG_PREFIX} global fetch is not available. Please use Node 18+.`);
    }

    if (process.env.RUN_HEALTH_CHECK !== "0") {
      try {
        const pingUrl = `${APP_BASE_URL.replace(/\/$/, "")}${HEALTH_PATH}`;
        console.log(`${LOG_PREFIX} health check ping ${pingUrl}`);
        const r = await fetchWithTimeout(pingUrl, { method: "GET" }, 4000);
        if (r.ok) console.log(`${LOG_PREFIX} health OK (${r.status})`);
        else console.warn(`${LOG_PREFIX} health ping returned ${r.status} ${r.statusText}`);
      } catch (e) {
        console.warn(`${LOG_PREFIX} health check failed: ${e.message}`);
      }
    }

    await runLoop();
  } catch (err) {
    console.error(`${LOG_PREFIX} fatal error`, err);
    process.exit(1);
  }
})();
