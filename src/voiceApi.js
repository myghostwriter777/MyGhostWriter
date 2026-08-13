export const VOICE_KEY = "gwm_voice_v1";
export const DEVICE_VOICE_ID = "device";
const SPEECH_CHUNK_LIMIT = 4800;
// Browser speech synthesis is much less reliable with long utterances,
// especially in Android WebViews and mobile Chromium. Short chunks keep the
// speech engine alive and make Stop responsive instead of failing silently.
export const DEVICE_SPEECH_CHUNK_LIMIT = 220;

let activeAudio = null;
let activeAudioUrl = "";
let activeController = null;

export function getSavedVoiceId() {
  try { return localStorage.getItem(VOICE_KEY) || DEVICE_VOICE_ID; }
  catch { return DEVICE_VOICE_ID; }
}

export function saveVoiceId(voiceId) {
  try { localStorage.setItem(VOICE_KEY, voiceId || DEVICE_VOICE_ID); } catch {}
}

export async function fetchVoiceCatalog() {
  const response = await fetch("/api/elevenlabs-voices");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "AI voices could not be loaded.");
  return Array.isArray(data.voices) ? data.voices : [];
}

export function splitSpeechText(text, limit = SPEECH_CHUNK_LIMIT) {
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
    const sentences = paragraph.match(/[^.!?\n]+[.!?]+(?:["'”’)]*)|[^.!?\n]+$/g) || [paragraph];
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

function cleanUpAudio() {
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio.load?.();
  }
  activeAudio = null;
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
  activeAudioUrl = "";
}

export function stopSpeak() {
  activeController?.abort();
  activeController = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  cleanUpAudio();
}

function speakOnDevice(text, language, speed, signal) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Voice playback is not supported on this device."));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = speed;
    utterance.onend = resolve;
    utterance.onerror = (event) => event.error === "canceled" ? resolve() : reject(new Error("Voice playback stopped unexpectedly."));
    signal.addEventListener("abort", () => window.speechSynthesis.cancel(), { once: true });
    window.speechSynthesis.speak(utterance);
  });
}

async function requestVoiceAudio(text, voiceId, language, speed, signal) {
  const response = await fetch("/api/elevenlabs-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, language, speed }),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "The AI voice could not generate the audio.");
  }
  return response.blob();
}

function playAudioBlob(blob, speed, signal) {
  return new Promise((resolve, reject) => {
    activeAudioUrl = URL.createObjectURL(blob);
    const audio = new Audio(activeAudioUrl);
    activeAudio = audio;
    audio.playbackRate = speed;
    audio.onended = () => { cleanUpAudio(); resolve(); };
    audio.onerror = () => { cleanUpAudio(); reject(new Error("The AI voice audio could not be played.")); };
    signal.addEventListener("abort", () => { cleanUpAudio(); resolve(); }, { once: true });
    audio.play().catch((error) => { cleanUpAudio(); reject(error); });
  });
}

export async function speak(text, options = {}) {
  stopSpeak();
  const voiceId = options.voiceId || getSavedVoiceId();
  const language = options.language || "en";
  const speechLocale = options.speechLocale || language;
  const speed = Math.max(0.7, Math.min(1.2, Number(options.speed) || 1));
  const normalizedText = String(text || "").replace(/<[^>]*>/g, " ").replace(/[ \t]+/g, " ").trim();
  const chunks = splitSpeechText(normalizedText, voiceId === DEVICE_VOICE_ID ? DEVICE_SPEECH_CHUNK_LIMIT : SPEECH_CHUNK_LIMIT);
  if (!chunks.length) return;

  const controller = new AbortController();
  activeController = controller;
  try {
    if (voiceId === DEVICE_VOICE_ID) {
      for (const chunk of chunks) {
        if (controller.signal.aborted) break;
        await speakOnDevice(chunk, speechLocale, speed, controller.signal);
      }
    } else {
      try {
        for (const chunk of chunks) {
          if (controller.signal.aborted) break;
          const blob = await requestVoiceAudio(chunk, voiceId, language, speed, controller.signal);
          if (!controller.signal.aborted) await playAudioBlob(blob, 1, controller.signal);
        }
      } catch (error) {
        // A missing provider key, quota issue, or transient audio response
        // should not leave a History Listen button apparently doing nothing.
        // Fall back to the device voice when the browser provides one.
        if (controller.signal.aborted || typeof window === "undefined" || !("speechSynthesis" in window)) throw error;
        for (const chunk of splitSpeechText(normalizedText, DEVICE_SPEECH_CHUNK_LIMIT)) {
          if (controller.signal.aborted) break;
          await speakOnDevice(chunk, speechLocale, speed, controller.signal);
        }
      }
    }
  } finally {
    if (activeController === controller) activeController = null;
    if (!controller.signal.aborted) cleanUpAudio();
  }
}
