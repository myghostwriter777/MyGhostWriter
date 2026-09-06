export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
  maxDuration: 30,
};

// Grok STT is still a gated beta on AI Gateway and returned 403 for this
// production project. GPT-4o mini Transcribe is the Gateway's documented
// cost-efficient default for meeting/call transcription.
const TRANSCRIPTION_MODEL = "openai/gpt-4o-mini-transcribe";
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_CHARS = 400;
const AUDIO_DATA_URL = /^data:(audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a))(?:;[^,]*)?;base64,([A-Za-z0-9+/=\r\n]+)$/i;
const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/;
let gatewayModulesPromise;

function loadGatewayModules() {
  if (!gatewayModulesPromise) {
    // Vercel compiles this API file to CommonJS. These packages are ESM-only,
    // so they must stay behind native dynamic imports at function runtime.
    gatewayModulesPromise = Promise.all([import("ai"), import("@ai-sdk/gateway"), import("@vercel/oidc")]);
  }
  return gatewayModulesPromise;
}

// Optional hints from the client: the spoken language (stops two-second
// segments being mis-detected as another language) and a short vocabulary
// prompt (names spelled the way the user wrote them). Both are validated here
// and passed through as OpenAI provider options.
export function buildTranscriptionProviderOptions(body) {
  const options = {};
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  if (language && LANGUAGE_CODE.test(language)) options.language = language.split("-")[0].toLowerCase();
  const prompt = typeof body?.prompt === "string" ? body.prompt.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "";
  if (prompt) options.prompt = prompt.slice(0, MAX_PROMPT_CHARS);
  return Object.keys(options).length ? { openai: options } : null;
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

  let GatewayError = { isInstance: () => false };
  try {
    const [{ transcribe }, gatewayModule, { getVercelOidcToken }] = await loadGatewayModules();
    const { createGateway, gateway } = gatewayModule;
    GatewayError = gatewayModule.GatewayError || GatewayError;
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
    const audio = Buffer.from(base64, "base64");
    const providerOptions = buildTranscriptionProviderOptions(body);
    const run = options => transcribe({
      model: transcriptionGateway.transcriptionModel(TRANSCRIPTION_MODEL),
      audio,
      maxRetries: 0,
      ...(options ? { providerOptions: options } : {}),
    });
    let result;
    try {
      result = await run(providerOptions);
    } catch (error) {
      // If the provider rejects the hints themselves, the audio is still fine:
      // transcribe it once more without them rather than dropping the segment.
      const status = Number(GatewayError.isInstance(error) ? error.statusCode : error?.statusCode || error?.cause?.statusCode) || 0;
      const invalid = status === 400 || error?.type === "invalid_request_error";
      if (!providerOptions || !invalid) throw error;
      console.warn("Meeting transcription hints rejected; retrying without them", { providerMessage: typeof error?.message === "string" ? error.message.slice(0, 200) : undefined });
      result = await run(null);
    }
    return res.status(200).json({ text: String(result?.text || "").trim() });
  } catch (error) {
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
