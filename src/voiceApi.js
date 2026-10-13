// Browser speech synthesis is much less reliable with long utterances,
// especially in Android WebViews and mobile Chromium. Short chunks keep the
// speech engine alive and make Stop responsive instead of failing silently.
export const DEVICE_SPEECH_CHUNK_LIMIT = 220;

let activeController = null;

export function splitSpeechText(text, limit = DEVICE_SPEECH_CHUNK_LIMIT) {
  limit = Number.isFinite(Number(limit)) && Number(limit) >= 1 ? Math.floor(Number(limit)) : DEVICE_SPEECH_CHUNK_LIMIT;
  const input = String(text || "").trim();
  if (!input) return [];
  if (input.length <= limit) return [input];

  const paragraphs = input.split(/\n{2,}/).filter(Boolean);
  const chunks = [];
  let current = "";
  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^.!?\n]+[.!?]+(?:["'”’)]*)|[^.!?\n]+(?=\n|$)/g) || [paragraph];
    for (const sentence of sentences) {
      const piece = sentence.trim();
      if (!piece) continue;
      if (piece.length > limit) {
        pushCurrent();
        for (let index = 0; index < piece.length; index += limit) chunks.push(piece.slice(index, index + limit));
      } else if (!current) {
        current = piece;
      } else if (`${current} ${piece}`.length <= limit) {
        current += ` ${piece}`;
      } else {
        pushCurrent();
        current = piece;
      }
    }
    if (current && current.length + 2 <= limit) current += "\n\n";
  }
  pushCurrent();
  return chunks;
}

export function stopSpeak() {
  activeController?.abort();
  activeController = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speakOnDevice(text, language, speed, signal) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Voice playback is not supported on this device."));
      return;
    }
    if (signal.aborted) { resolve(); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    const finish = error => {
      signal.removeEventListener("abort", abort);
      utterance.onend = null;
      utterance.onerror = null;
      if (error) reject(error); else resolve();
    };
    const abort = () => {
      // Browsers do not consistently emit an end/error event after cancel().
      // Settle ourselves so callers can leave their playing state immediately.
      finish();
      window.speechSynthesis.cancel();
    };
    utterance.lang = language;
    utterance.rate = speed;
    utterance.onend = () => finish();
    utterance.onerror = event => finish(event.error === "canceled" || event.error === "interrupted" ? null : new Error("Voice playback stopped unexpectedly."));
    signal.addEventListener("abort", abort, { once: true });
    try { window.speechSynthesis.speak(utterance); } catch (error) { finish(error); }
  });
}

export async function speak(text, options = {}) {
  stopSpeak();
  const speechLocale = options.speechLocale || options.language || "en";
  const speed = Math.max(0.7, Math.min(1.2, Number(options.speed) || 1));
  const normalizedText = String(text || "").replace(/<[^>]*>/g, " ").replace(/[ \t]+/g, " ").trim();
  const chunks = splitSpeechText(normalizedText);
  if (!chunks.length) return;

  const controller = new AbortController();
  activeController = controller;
  try {
    for (const chunk of chunks) {
      if (controller.signal.aborted) break;
      await speakOnDevice(chunk, speechLocale, speed, controller.signal);
    }
  } finally {
    if (activeController === controller) activeController = null;
  }
}
