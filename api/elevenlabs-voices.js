const ELEVENLABS_VOICES_URL = "https://api.elevenlabs.io/v2/voices";
const MAX_VOICES = 100;

function configuredVoiceIds() {
  return String(process.env.ELEVENLABS_VOICE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function publicVoice(voice) {
  const labels = voice?.labels && typeof voice.labels === "object" ? voice.labels : {};
  return {
    id: String(voice?.voice_id || ""),
    name: String(voice?.name || "AI Voice"),
    category: String(voice?.category || "voice"),
    description: String(voice?.description || labels.description || "").slice(0, 240),
    previewUrl: typeof voice?.preview_url === "string" ? voice.preview_url : "",
    labels: {
      accent: String(labels.accent || ""),
      age: String(labels.age || ""),
      gender: String(labels.gender || ""),
      useCase: String(labels.use_case || ""),
    },
  };
}

async function readProviderError(response) {
  try {
    const data = await response.json();
    return String(data?.detail?.message || data?.detail || data?.message || "");
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI voices are not configured yet.",
      code: "voices_not_configured",
    });
  }

  const url = new URL(ELEVENLABS_VOICES_URL);
  url.searchParams.set("page_size", String(MAX_VOICES));
  url.searchParams.set("sort", "name");
  url.searchParams.set("sort_direction", "asc");
  url.searchParams.set("include_total_count", "false");

  let response;
  try {
    response = await fetch(url, { headers: { "xi-api-key": apiKey } });
  } catch {
    return res.status(503).json({
      error: "AI voices are temporarily unavailable.",
      code: "voices_unavailable",
    });
  }

  if (!response.ok) {
    const providerMessage = await readProviderError(response);
    console.error("ElevenLabs voice catalog error", {
      status: response.status,
      message: providerMessage.slice(0, 240),
    });
    return res.status(response.status === 429 ? 429 : 502).json({
      error: response.status === 429
        ? "AI voices are busy right now. Please try again shortly."
        : "AI voices could not be loaded.",
      code: response.status === 429 ? "voices_rate_limited" : "voices_provider_error",
    });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return res.status(502).json({ error: "AI voices returned an invalid response.", code: "voices_bad_response" });
  }

  const allowedIds = configuredVoiceIds();
  let voices = Array.isArray(data?.voices)
    ? data.voices.map(publicVoice).filter((voice) => voice.id)
    : [];

  if (allowedIds.length) {
    const voicesById = new Map(voices.map((voice) => [voice.id, voice]));
    voices = allowedIds.map((id) => voicesById.get(id)).filter(Boolean);
  }

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ voices });
}

