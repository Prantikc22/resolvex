/**
 * Makes workspace data reads survive flaky networks. Same-origin GET requests
 * to /api/* get a 20-second timeout and one automatic retry, so a dropped
 * request recovers instead of leaving a screen spinning forever. Writes are
 * never retried, so nothing can be sent twice.
 */
const TIMEOUT_MS = 20_000;
let installed = false;

function isApiRead(input: RequestInfo | URL, init?: RequestInit) {
  const method = (
    init?.method ?? (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  if (method !== "GET") return false;
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const url = new URL(raw, window.location.origin);
  return (
    url.origin === window.location.origin && url.pathname.startsWith("/api/")
  );
}

export function installResilientFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);

  const attempt = (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    init?.signal?.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
    return original(input, { ...init, signal: controller.signal }).finally(() =>
      window.clearTimeout(timer),
    );
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isApiRead(input, init)) return original(input, init);
    try {
      return await attempt(input, init);
    } catch (error) {
      // The caller cancelled on purpose: do not retry.
      if (init?.signal?.aborted) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      return attempt(input, init);
    }
  };
}
