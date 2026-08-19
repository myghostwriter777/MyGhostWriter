export const config = {
  api: { bodyParser: { sizeLimit: "32kb" } },
  maxDuration: 30,
};

const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const VOICE_ID_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;
const MAX_TEXT_LENGTH = 5000;
const SUPPORTED_LANGUAGES = new Set(["en", "th", "ja", "ko", "zh", "es"]);

function parseBody(body) {
  if (typeof body !== "string") return body || {};
  try { return JSON.parse(body); } catch { return null; }
}

async function readProviderError(response) {
  try {
    const data = await response.json();
    return String(data?.detail?.message || data?.detail || data?.message || "");
  } catch {
    return "";
  }
}

function modelForLanguage(language) {
  if (process.env.ELEVENLABS_MODEL_ID) return process.env.ELEVENLABS_MODEL_ID;
  return language === "th" ? "eleven_v3" : "eleven_multilingual_v2";
}

function configuredVoiceIds() {
  return String(process.env.ELEVENLABS_VOICE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI voices are not configured yet.", code: "speech_not_configured" });
  }

  const body = parseBody(req.body);
  if (!body) return res.status(400).json({ error: "Could not parse the speech request.", code: "invalid_json" });

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const language = SUPPORTED_LANGUAGES.has(body.language) ? body.language : "en";
  const speed = Math.max(0.7, Math.min(1.2, Number(body.speed) || 1));

  if (!text) return res.status(400).json({ error: "Text is required.", code: "text_required" });
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Speech sections must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.`, code: "text_too_long" });
  }
  if (!VOICE_ID_PATTERN.test(voiceId)) {
    return res.status(400).json({ error: "Choose a valid AI voice.", code: "invalid_voice" });
  }
  const allowedVoiceIds = configuredVoiceIds();
  if (allowedVoiceIds.length && !allowedVoiceIds.includes(voiceId)) {
    return res.status(403).json({ error: "This AI voice is not available in GhostwriterMe.", code: "voice_not_allowed" });
  }

  const modelId = modelForLanguage(language);
  const url = `${ELEVENLABS_TTS_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  let response;
  const requestSpeech=()=>fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { speed },
      ...(modelId === "eleven_multilingual_v2" ? {} : { language_code: language }),
    }),
  });
  try {
    response = await requestSpeech();
    // A second Listen tap can briefly overlap an ElevenLabs request that the
    // browser already cancelled. One bounded retry absorbs that hand-off while
    // still keeping generation serial and within the function timeout.
    if(response.status===429){
      const retryAfter=Math.min(1800,Math.max(500,Number(response.headers?.get?.("retry-after")||0)*1000||750));
      await new Promise(resolve=>setTimeout(resolve,retryAfter));
      response=await requestSpeech();
    }
  } catch {
    return res.status(503).json({ error: "The AI voice service is temporarily unavailable.", code: "speech_unavailable" });
  }

  if (!response.ok) {
    const providerMessage = await readProviderError(response);
    console.error("ElevenLabs speech error", {
      status: response.status,
      message: providerMessage.slice(0, 240),
      modelId,
    });
    const rateLimited = response.status === 429;
    const quotaExceeded = /quota|credits? remaining|exceeds your quota/i.test(providerMessage);
    return res.status(quotaExceeded ? 402 : rateLimited ? 429 : 502).json({
      error: quotaExceeded
        ? "ElevenLabs voice credits are currently exhausted. The selected voice cannot play until credits are available."
        : rateLimited
          ? "AI voice playback is busy right now. Please try again shortly."
          : "This AI voice could not generate the audio.",
      code: quotaExceeded ? "speech_quota_exceeded" : rateLimited ? "speech_rate_limited" : "speech_provider_error",
    });
  }

  let audio;
  try {
    audio = Buffer.from(await response.arrayBuffer());
  } catch {
    return res.status(502).json({ error: "The AI voice returned invalid audio.", code: "speech_bad_response" });
  }
  if (!audio.length) return res.status(502).json({ error: "The AI voice returned empty audio.", code: "speech_empty" });

  res.setHeader("Content-Type", response.headers?.get?.("content-type") || "audio/mpeg");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Length", String(audio.length));
  return res.status(200).send(audio);
}
