// Bound the entire request, including body decoding. Some embedded browsers
// don't reject a stalled body when aborted, so the deadline also settles locally.
export async function requestJson(url, options = {}, { signal, timeoutMs = 120000 } = {}) {
  const controller = new AbortController();
  const duration = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : 120000;
  let timer, cancel;
  const stopped = new Promise((_, reject) => {
    cancel = () => {
      const error = new Error("This request was cancelled.");
      error.name = "AbortError";
      reject(error);
      controller.abort();
    };
    timer = setTimeout(() => {
      const error = new Error("This generation took too long and was safely stopped. Please try again with fewer sections or a shorter source.");
      error.code = "AI_REQUEST_TIMEOUT";
      reject(error);
      controller.abort();
    }, duration);
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
  });
  try {
    return await Promise.race([stopped, (async () => {
      if (controller.signal.aborted) return;
      const response = await fetch(url, { ...options, signal: controller.signal });
      const data = await response.json().catch(error => {
        if (controller.signal.aborted) throw error;
        if (!response.ok) return {};
        throw new Error("The server returned an unreadable response. Please try again.");
      });
      return { response, data };
    })()]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
