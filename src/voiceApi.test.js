import {DEVICE_SPEECH_CHUNK_LIMIT,splitSpeechText} from "./voiceApi";

describe("Device voice playback helpers",()=>{
  test("keeps short text in a single utterance",()=>{
    expect(splitSpeechText("A short sentence.")).toEqual(["A short sentence."]);
  });

  test("splits long narration into browser-safe chunks",()=>{
    const text="A clear sentence. ".repeat(40);
    const chunks=splitSpeechText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk=>chunk.length<=DEVICE_SPEECH_CHUNK_LIMIT)).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g," ").trim()).toBe(text.replace(/\s+/g," ").trim());
  });
});
