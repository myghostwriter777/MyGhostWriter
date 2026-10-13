// Keep provider work inside the browser/serverless lifetime, including reading
// the response body. A disconnected browser must not leave paid work running.
function createGenerationDeadline(req, res, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, timeoutMs);
  timeout.unref?.();
  req.once?.("aborted", abort);
  res.once?.("close", abort);
  if (req.aborted || res.destroyed) abort();
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      req.removeListener?.("aborted", abort);
      res.removeListener?.("close", abort);
    },
  };
}

async function requestAnthropic(body, apiKey, signal, maxContinuations = 2) {
  const responseParts = [];
  let requestBody = body;
  for (let attempt = 0; ; attempt += 1) {
    if (signal.aborted) throw Object.assign(new Error("Generation stopped."), { name: "AbortError" });
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal,
      body: JSON.stringify(requestBody),
    });
    let data;
    try {
      data = await response.json();
    } catch (error) {
      if (signal.aborted || error?.name === "AbortError") throw error;
      data = null;
    }
    if (data) responseParts.push(data);
    if (!response.ok || data?.stop_reason !== "pause_turn" || !body.tools?.length || attempt >= maxContinuations) {
      return { response, data, responseParts };
    }
    // Preserve the exact tool state (including encrypted search results) and
    // retain the original tools when resuming a paused server-side tool loop.
    requestBody = {
      ...body,
      messages: [...body.messages, { role: "assistant", content: responseParts.flatMap(part => Array.isArray(part.content) ? part.content : []) }],
    };
  }
}

module.exports = { createGenerationDeadline, requestAnthropic };
