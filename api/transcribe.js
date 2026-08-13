export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
  maxDuration: 30,
};

// Grok STT is still a gated beta on AI Gateway and returned 403 for this
// production project. GPT-4o mini Transcribe is the Gateway's documented
// cost-efficient default for meeting/call transcription.
const TRANSCRIPTION_MODEL = "openai/gpt-4o-mini-transcribe";
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const AUDIO_DATA_URL = /^data:(audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a))(?:;[^,]*)?;base64,([A-Za-z0-9+/=\r\n]+)$/i;
let gatewayModulesPromise;

function loadGatewayModules() {
  if (!gatewayModulesPromise) {
    // Vercel compiles this API file to CommonJS. These packages are ESM-only,
    // so they must stay behind native dynamic imports at function runtime.
    gatewayModulesPromise = Promise.all([import("ai"), import("@ai-sdk/gateway"), import("@vercel/oidc")]);
  }
  return gatewayModulesPromise;
}

function classifyProviderError(error, GatewayError) {
  const gatewayError = GatewayError.isInstance(error);
  const status = Number(gatewayError ? error.statusCode : error?.statusCode || error?.cause?.statusCode) || 0;
  const type = gatewayError ? error.type : "";

  if (status === 401 || type === "authentication_error") {
    return { status: 503, code: "gateway_auth", retryable: false, error: "Meeting transcription is not configured correctly. Please contact support." };
  }
  if (status === 402) {
    return { status: 503, code: "gateway_credits", retryable: false, error: "Meeting transcription has no available AI Gateway credits. Please contact support." };
  }
  if (status === 403 || type === "forbidden") {
    return { status: 503, code: "gateway_forbidden", retryable: false, error: "Meeting transcription is not enabled for this deployment. Please contact support." };
  }
  if (status === 404 || type === "model_not_found") {
    return { status: 503, code: "model_unavailable", retryable: false, error: "The Meeting Assist transcription model is unavailable. Please contact support." };
  }
  if (status === 429 || type === "rate_limit_exceeded") {
    return { status: 429, code: "rate_limited", retryable: true, retryAfter: 15, error: "Meeting transcription is temporarily rate-limited. Listening will retry automatically." };
  }
  if (status === 400 || type === "invalid_request_error") {
    return { status: 400, code: "audio_rejected", retryable: false, error: "This audio segment could not be read. Restart Meeting Assist and try again." };
  }
  if (status === 408 || status === 409 || status >= 500 || error?.isRetryable === true) {
    return { status: 503, code: "provider_unavailable", retryable: true, retryAfter: 10, error: "The transcription service is temporarily unavailable. Listening will retry automatically." };
  }
  return { status: 502, code: "transcription_failed", retryable: false, error: "This audio segment could not be transcribed. Restart Meeting Assist and try again." };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Could not parse the audio request.", code: "invalid_json", retryable: false }); }
  }

  const match = typeof body?.audio === "string" ? body.audio.match(AUDIO_DATA_URL) : null;
  if (!match) return res.status(400).json({ error: "A supported audio recording is required.", code: "invalid_audio", retryable: false });

  const base64 = match[2].replace(/[\r\n]/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor((base64.length * 3) / 4) - padding;
  if (byteLength <= 0 || byteLength > MAX_AUDIO_BYTES) {
    return res.status(400).json({ error: "The audio segment is empty or too large.", code: "invalid_audio_size", retryable: false });
  }

  try {
    const [{ transcribe }, { createGateway, gateway, GatewayError }, { getVercelOidcToken }] = await loadGatewayModules();
    // A manually configured AI_GATEWAY_API_KEY always takes precedence in the
    // SDK, even when it is restricted or invalid. Production Vercel Functions
    // receive a short-lived OIDC token, so select it explicitly for this route.
    const headerOidc = Array.isArray(req.headers?.["x-vercel-oidc-token"])
      ? req.headers["x-vercel-oidc-token"][0]
      : req.headers?.["x-vercel-oidc-token"];
    let oidcToken = headerOidc || process.env.VERCEL_OIDC_TOKEN || "";
    if (!oidcToken) {
      try { oidcToken = await getVercelOidcToken(); } catch {}
    }
    const transcriptionGateway = oidcToken ? createGateway({ apiKey: oidcToken }) : gateway;
    const result = await transcribe({
      model: transcriptionGateway.transcriptionModel(TRANSCRIPTION_MODEL),
      audio: Buffer.from(base64, "base64"),
      maxRetries: 0,
    });
    return res.status(200).json({ text: String(result?.text || "").trim() });
  } catch (error) {
    let GatewayError = { isInstance: () => false };
    try { ({ GatewayError } = await import("@ai-sdk/gateway")); } catch {}
    const failure = classifyProviderError(error, GatewayError);
    console.error("Meeting transcription provider error", {
      code: failure.code,
      providerStatus: Number(error?.statusCode || error?.cause?.statusCode) || undefined,
      providerType: error?.type || undefined,
      providerMessage: typeof error?.message === "string" ? error.message.slice(0, 300) : undefined,
      generationId: error?.generationId || undefined,
    });
    return res.status(failure.status).json({
      error: failure.error,
      code: failure.code,
      retryable: failure.retryable,
      ...(failure.retryAfter ? { retry_after: failure.retryAfter } : {}),
    });
  }
}
