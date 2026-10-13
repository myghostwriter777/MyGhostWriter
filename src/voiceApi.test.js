import {DEVICE_SPEECH_CHUNK_LIMIT,speak,splitSpeechText,stopSpeak} from "./voiceApi";

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

  test("preserves unpunctuated lines and tolerates an invalid chunk limit",()=>{
    expect(splitSpeechText("First line\nSecond line\nThird line",10).join(" ")).toBe("First line Second lin e Third line");
    expect(splitSpeechText("Text",0)).toEqual(["Text"]);
  });

  test("stopping settles playback even if the browser never emits a cancelled event",async()=>{
    const originalSynthesis=window.speechSynthesis;
    const originalUtterance=global.SpeechSynthesisUtterance;
    const utterances=[];
    window.speechSynthesis={cancel:jest.fn(),speak:jest.fn(utterance=>utterances.push(utterance))};
    global.SpeechSynthesisUtterance=function(text){this.text=text;};
    try{
      const playback=speak("Long text. ".repeat(80));
      expect(utterances).toHaveLength(1);
      stopSpeak();
      await expect(playback).resolves.toBeUndefined();
      expect(utterances).toHaveLength(1);
      expect(utterances[0].onend).toBeNull();
    }finally{stopSpeak();window.speechSynthesis=originalSynthesis;global.SpeechSynthesisUtterance=originalUtterance;}
  });
});
