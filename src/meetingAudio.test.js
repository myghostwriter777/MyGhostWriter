import { analyzeVoice, buildVoiceProfile, createSpeechSegmenter, describeVoiceMatch, encodeWav, resampleFloat32, voiceSimilarity, wavDataUrl } from "./meetingAudio";

const RATE=16000;
const silence=ms=>new Float32Array(Math.round(RATE*ms/1000));
const tone=(ms,frequency=180,amplitude=0.25)=>{
  const output=new Float32Array(Math.round(RATE*ms/1000));
  for(let index=0;index<output.length;index+=1){
    // A harmonic-rich (sawtooth-like) voice stand-in so pitch tracking works.
    const phase=(index*frequency/RATE)%1;
    output[index]=(phase*2-1)*amplitude;
  }
  return output;
};
const join=parts=>{const total=parts.reduce((sum,part)=>sum+part.length,0);const out=new Float32Array(total);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;};
const feed=(segmenter,audio,chunk=1024)=>{for(let offset=0;offset<audio.length;offset+=chunk)segmenter.push(audio.subarray(offset,Math.min(audio.length,offset+chunk)));};

describe("speech segmenter",()=>{
  test("emits one segment per spoken phrase and ignores blips",()=>{
    const segments=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,onSegment:segment=>segments.push(segment)});
    feed(segmenter,join([silence(600),tone(1300),silence(1100),tone(80),silence(900),tone(700),silence(1200)]));
    expect(segments).toHaveLength(2);
    expect(segments[0].durationMs).toBeGreaterThanOrEqual(1300);
    expect(segments[0].durationMs).toBeLessThan(2600);
    expect(segments[1].durationMs).toBeGreaterThanOrEqual(700);
    expect(segments.every(segment=>segment.sampleRate===RATE)).toBe(true);
  });

  test("keeps pre-roll so the first syllable is not clipped",()=>{
    const segments=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,preRollMs:300,onSegment:segment=>segments.push(segment)});
    feed(segmenter,join([silence(1000),tone(900),silence(1000)]));
    expect(segments).toHaveLength(1);
    // Leading samples come from the pre-roll and are silent.
    const lead=segments[0].audio.subarray(0,RATE*0.15);
    expect(Math.max(...Array.from(lead).map(Math.abs))).toBe(0);
  });

  test("splits very long speech and flushes the tail on stop",()=>{
    const segments=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,maxSegmentMs:4000,onSegment:segment=>segments.push(segment)});
    feed(segmenter,join([silence(400),tone(9000)]));
    expect(segments.length).toBeGreaterThanOrEqual(2);
    const flushed=segmenter.flush();
    expect(flushed).not.toBeNull();
    expect(segmenter.speaking).toBe(false);
  });

  test("adapts to steady background noise instead of treating it as speech",()=>{
    const segments=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,onSegment:segment=>segments.push(segment)});
    const noise=new Float32Array(RATE*4);let seed=7;
    for(let index=0;index<noise.length;index+=1){seed=(seed*1103515245+12345)%2147483648;noise[index]=(seed/2147483648-0.5)*0.03;}
    feed(segmenter,noise);
    expect(segments).toHaveLength(0);
    expect(segmenter.noiseFloor).toBeGreaterThan(0.005);
  });
});

describe("audio encoding",()=>{
  test("writes a valid 16-bit mono WAV header",()=>{
    const buffer=encodeWav(new Float32Array([0,0.5,-0.5,1,-1]),16000);
    const view=new DataView(buffer);const text=(offset,length)=>String.fromCharCode(...new Uint8Array(buffer,offset,length));
    expect(text(0,4)).toBe("RIFF");expect(text(8,4)).toBe("WAVE");expect(text(12,4)).toBe("fmt ");expect(text(36,4)).toBe("data");
    expect(view.getUint16(22,true)).toBe(1);
    expect(view.getUint32(24,true)).toBe(16000);
    expect(view.getUint16(34,true)).toBe(16);
    expect(view.getUint32(40,true)).toBe(10);
    expect(view.getInt16(46,true)).toBe(16383);
    expect(view.getInt16(50,true)).toBe(32767);
    expect(view.getInt16(52,true)).toBe(-32768);
    expect(wavDataUrl(new Float32Array(4))).toMatch(/^data:audio\/wav;base64,UklGR/);
  });

  test("resamples between rates while preserving duration",()=>{
    const input=tone(500,200);
    const output=resampleFloat32(input,16000,8000);
    expect(output.length).toBe(4000);
    expect(resampleFloat32(input,16000,16000)).toBe(input);
  });
});

describe("voice hints",()=>{
  test("recognizes a similar voice and separates a different one",()=>{
    const enrolled=analyzeVoice(tone(3000,120),RATE);
    expect(enrolled.pitchHz).toBeGreaterThan(105);
    expect(enrolled.pitchHz).toBeLessThan(135);
    const profile=buildVoiceProfile(enrolled);
    expect(profile).not.toBeNull();
    const sameSpeaker=voiceSimilarity(profile,analyzeVoice(tone(1200,126),RATE));
    const otherSpeaker=voiceSimilarity(profile,analyzeVoice(tone(1200,230),RATE));
    expect(sameSpeaker).toBeGreaterThan(0.72);
    expect(otherSpeaker).toBeLessThan(0.45);
    expect(describeVoiceMatch(sameSpeaker)).toBe("likely the user");
    expect(describeVoiceMatch(otherSpeaker)).toBe("likely another speaker");
    expect(describeVoiceMatch(null)).toBe("unknown");
  });

  test("refuses to build a profile from silence",()=>{
    expect(buildVoiceProfile(analyzeVoice(silence(3000),RATE))).toBeNull();
    expect(voiceSimilarity({pitchHz:120},analyzeVoice(silence(1000),RATE))).toBeNull();
  });
});
