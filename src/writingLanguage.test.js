import { languageInstruction, selectedLanguage, setOutputLanguage, speechLanguageForText } from "./writingLanguage";

beforeEach(() => { localStorage.clear(); setOutputLanguage("en"); });
afterEach(() => jest.restoreAllMocks());

test("uses a saved language immediately and preserves protocol enum values", () => {
  setOutputLanguage("th");
  expect(selectedLanguage().value).toBe("th");
  expect(languageInstruction()).toContain("prose in Thai");
  expect(languageInstruction()).toContain("machine-readable enum values exactly");
});

test("Meeting and lecture auto override a saved English output preference", () => {
  setOutputLanguage("en");
  const rule = languageInstruction("auto");
  expect(rule).toContain("For Thai speech or text, reply in Thai");
  expect(rule).toContain("including attached transcripts");
  expect(rule).not.toContain("prose in English");
});

test("supports automatic content matching and rejects invalid saved language codes", () => {
  setOutputLanguage("auto");
  expect(selectedLanguage().speech).toBeTruthy();
  expect(languageInstruction()).toContain("match the latest user message");
  localStorage.setItem("gwm_lang", "not-a-language");
  expect(selectedLanguage().value).toBe("en");
});

test("exact source extraction is independent from the output preference", () => {
  setOutputLanguage("en");
  expect(languageInstruction("source")).toContain("Do not translate it");
  expect(languageInstruction("source")).not.toContain("OUTPUT LANGUAGE");
});

test("keeps language selection usable if browser storage is blocked", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(() => setOutputLanguage("th")).not.toThrow();
  expect(selectedLanguage().value).toBe("th");
});

test.each([null, "ja"])("uses the new language when writes fail but reads still return %s", stored => {
  if (stored === null) localStorage.removeItem("gwm_lang");
  else localStorage.setItem("gwm_lang", stored);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Storage full", "QuotaExceededError"); });
  expect(setOutputLanguage("th")).toBe("th");
  expect(localStorage.getItem("gwm_lang")).toBe(stored);
  expect(selectedLanguage().value).toBe("th");
  expect(languageInstruction()).toContain("prose in Thai");
});

test("a successful write releases the session override and observes later external changes", () => {
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  setOutputLanguage("th");
  write.mockRestore();
  localStorage.setItem("gwm_lang", "de");
  expect(selectedLanguage().value).toBe("th");
  setOutputLanguage("fr");
  expect(selectedLanguage().value).toBe("fr");
  localStorage.setItem("gwm_lang", "ja");
  expect(selectedLanguage().value).toBe("ja");
  expect(languageInstruction()).toContain("prose in Japanese");
});

test.each([["ขอบคุณสำหรับคำถามนี้", "th-TH"], ["日本語で話します", "ja-JP"], ["한국어입니다", "ko-KR"], ["简体中文", "zh-CN"]])("uses the source script for playback: %s", (text, locale) => {
  setOutputLanguage("en");
  expect(speechLanguageForText(text).speechLocale).toBe(locale);
});
