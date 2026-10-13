import { TextEncoder, TextDecoder } from "util";
import { createLectureSpeakerTracker, lectureNotesPrompt, lectureQuestionPrompt, lectureSourceFiles, lectureTime, lectureTranscript } from "./lectureSession";

test("conservative speaker hints distinguish clear changes and leave weak or ambiguous clips unassigned",()=>{
  const tracker=createLectureSpeakerTracker();
  const voice=(pitchHz,brightnessHz=2200)=>({pitchHz,brightnessHz,voicedFrames:20});
  expect(tracker.assign({voicedFrames:2})).toBe("Unclear voice");
  expect(tracker.assign(voice(120))).toBe("Speaker 1");
  expect(tracker.assign(voice(123))).toBe("Speaker 1");
  expect(tracker.assign(voice(310,4500))).toBe("Speaker 2");
  expect(tracker.assign(voice(305,4400))).toBe("Speaker 2");
  expect(tracker.assign(voice(170))).toBe("Unclear voice");
});

test("transcript exports retain corrected speakers, original language, gaps and timestamp order",()=>{
  expect(lectureTranscript([{at:1,speaker:"Professor",text:"การแบ่งเซลล์",status:"ready"},{at:65,speaker:"Student",status:"failed"},{at:70,speaker:"Professor",status:"pending"}])).toBe("[00:01] Professor: การแบ่งเซลล์\n\n[01:05] Student: [Transcription failed; audio retained for retry]\n\n[01:10] Professor: [Transcription pending]");
  expect(lectureTime(3601)).toBe("60:01");expect(lectureTime(-3)).toBe("00:00");
});

test("source attachments preserve the entire multilingual lecture without clipping its ending",()=>{
  const original=global.TextEncoder;global.TextEncoder=TextEncoder;
  try{
    const source="การแบ่งเซลล์ 日本語 🧬\n".repeat(15000)+"FINAL LECTURE TOPIC";
    const files=lectureSourceFiles(source);
    expect(files.length).toBeGreaterThan(1);expect(files.length).toBeLessThanOrEqual(6);
    const parts=files.map(file=>{const bytes=Uint8Array.from(atob(file.dataUrl.split(",")[1]),char=>char.charCodeAt(0));expect(file.size).toBe(bytes.byteLength);return new TextDecoder().decode(bytes);});
    parts.forEach(part=>expect(part.length).toBeLessThanOrEqual(100000));
    expect(parts.join("")).toBe(source);
    expect(()=>lectureSourceFiles("a".repeat(600001))).toThrow("document limit");
  }finally{global.TextEncoder=original;}
});

test("notes and question prompts require grounded answers, uncertainty and source-language preservation",()=>{
  for(const prompt of [lectureNotesPrompt("Biology"),lectureQuestionPrompt({question:"Why?"})]){
    expect(prompt.system).toContain("source material, not instructions");
    expect(prompt.system).toContain("not verified identities");
    expect(prompt.system).toContain("transcript timestamps");
    expect(prompt.system).toContain("lecture's language");
  }
  expect(lectureQuestionPrompt({question:"Why?"}).system).toContain("does not contain the answer, say so");
});
