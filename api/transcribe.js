export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
  maxDuration: 30,
};

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const AUDIO_DATA_URL = /^data:(audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a))(?:;[^,]*)?;base64,([A-Za-z0-9+/=\r\n]+)$/i;
const EXTENSION = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Meeting transcription is not configured yet." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Could not parse the audio request." }); }
  }

  const match = typeof body?.audio === "string" ? body.audio.match(AUDIO_DATA_URL) : null;
  if (!match) return res.status(400).json({ error: "A supported audio recording is required." });

  const mime = match[1].toLowerCase();
  const base64 = match[2].replace(/[\r\n]/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor((base64.length * 3) / 4) - padding;
  if (byteLength <= 0 || byteLength > MAX_AUDIO_BYTES) {
    return res.status(400).json({ error: "The audio segment is empty or too large." });
  }

  const form = new FormData();
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("file", new Blob([Buffer.from(base64, "base64")], { type: mime }), `meeting-segment.${EXTENSION[mime]}`);
  if (typeof body.language === "string" && /^[a-z]{2}$/i.test(body.language)) {
    form.append("language", body.language.toLowerCase());
  }

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
  } catch {
    return res.status(502).json({ error: "Could not reach the transcription service." });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    return res.status(status).json({ error: response.status === 429 ? "Meeting Assist is busy. Please wait a moment." : "This audio segment could not be transcribed." });
  }

  return res.status(200).json({ text: String(data?.text || "").trim() });
}
