export const LANGUAGE_KEY = "gwm_lang";
export const OUTPUT_LANGUAGES = Object.freeze([
  { value: "auto", label: "Automatic — match my content", prompt: "auto", speech: "" },
  { value: "en", label: "English", prompt: "English", speech: "en-US" },
  { value: "th", label: "ไทย (Thai)", prompt: "Thai", speech: "th-TH" },
  { value: "ja", label: "日本語 (Japanese)", prompt: "Japanese", speech: "ja-JP" },
  { value: "ko", label: "한국어 (Korean)", prompt: "Korean", speech: "ko-KR" },
  { value: "zh", label: "简体中文 (Chinese)", prompt: "Simplified Chinese", speech: "zh-CN" },
  { value: "es", label: "Español (Spanish)", prompt: "Spanish", speech: "es-ES" },
  { value: "fr", label: "Français (French)", prompt: "French", speech: "fr-FR" },
  { value: "de", label: "Deutsch (German)", prompt: "German", speech: "de-DE" },
  { value: "pt", label: "Português (Portuguese)", prompt: "Portuguese", speech: "pt-BR" },
  { value: "vi", label: "Tiếng Việt (Vietnamese)", prompt: "Vietnamese", speech: "vi-VN" },
  { value: "id", label: "Bahasa Indonesia", prompt: "Indonesian", speech: "id-ID" },
  { value: "hi", label: "हिन्दी (Hindi)", prompt: "Hindi", speech: "hi-IN" },
  { value: "ar", label: "العربية (Arabic)", prompt: "Arabic", speech: "ar-SA" },
]);

const findLanguage = value => OUTPUT_LANGUAGES.find(item => item.value === value);
let sessionLanguage = "en";
let unsavedLanguage = null;

export function selectedLanguage() {
  let value;
  // A quota failure can block writes while reads still return a stale value.
  // Keep this tab's selection until a later write succeeds; otherwise continue
  // reading storage so changes from other tabs remain visible.
  try { value = unsavedLanguage ?? (localStorage.getItem(LANGUAGE_KEY) || "en"); }
  catch { value = sessionLanguage; }
  const language = findLanguage(value) || findLanguage("en");
  if (language.value !== "auto") return language;
  return { ...language, speech: typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US" };
}

export function setOutputLanguage(value) {
  const language = findLanguage(value) || findLanguage("en");
  sessionLanguage = language.value;
  try {
    localStorage.setItem(LANGUAGE_KEY, language.value);
    unsavedLanguage = null;
  } catch {
    unsavedLanguage = language.value;
  }
  return language.value;
}

// A source-language request overrides the general preference for live
// conversation and lecture work. Never append a competing English directive.
export function languageInstruction(override) {
  if (override === "source") return "\n\nSOURCE LANGUAGE: Transcribe source text exactly in its original language. Do not translate it.";
  const language = findLanguage(override) || selectedLanguage();
  const rule = language.value === "auto"
    ? "Match the language of the substantive source being processed (including attached transcripts) or the latest spoken utterance. If there is no supplied source, match the latest user message. For Thai speech or text, reply in Thai; do not translate it to English. For mixed-language content, use its main language. Follow an explicit request to translate into another language. Do not infer the output language from surrounding English task instructions."
    : `Write all user-facing prose in ${language.prompt}.`;
  return `\n\nOUTPUT LANGUAGE: ${rule} Keep required JSON property names and machine-readable enum values exactly as specified. Apply the language to user-visible prose, including explanations and feedback. Preserve names, quotations, URLs, citations, and technical identifiers when translation would make them inaccurate.`;
}

// Distinct scripts provide a reliable playback hint, not a general-purpose
// language classifier. Latin-script text uses the user's selected preference.
export function speechLanguageForText(text) {
  const value = String(text || "");
  const scripts = [["th", /[\u0E00-\u0E7F]/g], ["ja", /[\u3040-\u30FF]/g], ["ko", /[\uAC00-\uD7AF]/g], ["ar", /[\u0600-\u06FF]/g], ["hi", /[\u0900-\u097F]/g]];
  const ranked = scripts.map(([code, regex]) => [code, (value.match(regex) || []).length]).sort((a, b) => b[1] - a[1]);
  const detected = ranked[0][1] > 0 ? ranked[0][0] : /[\u3400-\u9FFF]/.test(value) ? "zh" : null;
  const selected = selectedLanguage();
  const language = detected ? findLanguage(detected) : selected;
  return { language: language.value === "auto" ? language.speech.split("-")[0] : language.value, speechLocale: language.speech };
}
