import { analyzeVoice, buildVoiceProfile, createSpeechSegmenter, describeVoiceMatch, encodeWav, isLikelySpeech, isVoiceChange, normalizePeak, resampleFloat32, voiceSimilarity, wavDataUrl } from "./meetingAudio";

const RATE=16000;
const silence=ms=>new Float32Array(Math.round(RATE*ms/1000));
const tone=(ms,frequency=180,amplitude=0.25,rate=RATE)=>{
  const output=new Float32Array(Math.round(rate*ms/1000));
  for(let index=0;index<output.length;index+=1){
    // A harmonic-rich (sawtooth-like) voice stand-in so pitch tracking works.
    const phase=(index*frequency/rate)%1;
    output[index]=(phase*2-1)*amplitude;
  }
  return output;
};
const sine=(ms,frequency,amplitude,rate)=>Float32Array.from({length:Math.round(rate*ms/1000)},(_,index)=>Math.sin(2*Math.PI*frequency*index/rate)*amplitude);
const rms=samples=>Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
const join=parts=>{const total=parts.reduce((sum,part)=>sum+part.length,0);const out=new Float32Array(total);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;};
const feed=(segmenter,audio,chunk=1024)=>{for(let offset=0;offset<audio.length;offset+=chunk)segmenter.push(audio.subarray(offset,Math.min(audio.length,offset+chunk)));};

describe("speech segmenter",()=>{
  test("keeps a question with a mid-sentence pause as one turn and ends it after two seconds of silence",()=>{
    const segments=[];const ends=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,onSegment:segment=>segments.push(segment),onUtteranceEnd:end=>ends.push(end)});
    feed(segmenter,join([silence(600),tone(1300),silence(1100),tone(700),silence(1500)]));
    // Only 1.5 s of silence so far: the speaker may still be thinking.
    expect(segments).toHaveLength(0);
    expect(ends).toHaveLength(0);
    expect(segmenter.utteranceOpen).toBe(true);
    feed(segmenter,silence(700));
    expect(segments).toHaveLength(1);
    expect(ends).toEqual([expect.objectContaining({utteranceId:1,chunks:1,reason:"pause"})]);
    expect(segments[0].utteranceId).toBe(1);
    expect(segments[0].index).toBe(0);
    expect(segments[0].voicedMs).toBeGreaterThanOrEqual(1900);
    // Trailing silence is trimmed: the chunk is speech plus a short tail, not the whole 2 s wait.
    expect(segments[0].durationMs).toBeLessThan(1300+1100+700+320+400);
    expect(segments[0].durationMs).toBeGreaterThanOrEqual(1300+1100+700);
    expect(segmenter.utteranceOpen).toBe(false);
  });

  test("ignores blips and taps that are too short to be words",()=>{
    const segments=[];const ends=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,onSegment:segment=>segments.push(segment),onUtteranceEnd:end=>ends.push(end)});
    feed(segmenter,join([silence(500),tone(40),silence(800),tone(180),silence(2600)]));
    expect(segments).toHaveLength(0);
    expect(ends).toHaveLength(0);
  });

  test("hands out chunks at pauses during a long turn so transcription can start early",()=>{
    const segments=[];const ends=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,onSegment:segment=>segments.push(segment),onUtteranceEnd:end=>ends.push(end)});
    feed(segmenter,join([silence(400),tone(4000),silence(900),tone(1500),silence(2500)]));
    expect(segments).toHaveLength(2);
    expect(segments.map(segment=>segment.index)).toEqual([0,1]);
    expect(segments.every(segment=>segment.utteranceId===1)).toBe(true);
    expect(segments[0].reason).toBe("chunk");
    expect(segments[1].reason).toBe("pause");
    expect(ends).toEqual([expect.objectContaining({utteranceId:1,chunks:2})]);
  });

  test("keeps pre-roll so the first syllable is not clipped",()=>{
    const segments=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,preRollMs:300,onSegment:segment=>segments.push(segment)});
    feed(segmenter,join([silence(1000),tone(900),silence(2500)]));
    expect(segments).toHaveLength(1);
    // Leading samples come from the pre-roll and are silent.
    const lead=segments[0].audio.subarray(0,RATE*0.15);
    expect(Math.max(...Array.from(lead).map(Math.abs))).toBe(0);
  });

  test("splits very long speech and flushes the tail on stop",()=>{
    const segments=[];const ends=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,maxChunkMs:4000,onSegment:segment=>segments.push(segment),onUtteranceEnd:end=>ends.push(end)});
    feed(segmenter,join([silence(400),tone(9000)]));
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(ends).toHaveLength(0);
    const flushed=segmenter.flush();
    expect(flushed).not.toBeNull();
    expect(flushed.reason).toBe("flush");
    expect(ends).toEqual([expect.objectContaining({chunks:segments.length,reason:"flush"})]);
    expect(segmenter.speaking).toBe(false);
    expect(segmenter.utteranceOpen).toBe(false);
  });

  test("starts a new turn after the previous one ended",()=>{
    const segments=[];const ends=[];
    const segmenter=createSpeechSegmenter({sampleRate:RATE,onSegment:segment=>segments.push(segment),onUtteranceEnd:end=>ends.push(end)});
    feed(segmenter,join([silence(300),tone(1000),silence(2400),tone(900),silence(2400)]));
    expect(segments.map(segment=>segment.utteranceId)).toEqual([1,2]);
    expect(ends.map(end=>end.utteranceId)).toEqual([1,2]);
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

  test("removes frequencies that would alias when downsampling to 16 kHz",()=>{
    const speechBand=resampleFloat32(sine(500,1000,0.5,48000),48000,16000);
    const aboveNyquist=resampleFloat32(sine(500,12000,0.5,48000),48000,16000);
    expect(speechBand.length).toBe(8000);
    // A 1 kHz tone passes almost untouched; 12 kHz would fold to 4 kHz and is removed.
    expect(rms(speechBand.subarray(200,7800))).toBeGreaterThan(0.5/Math.SQRT2*0.9);
    expect(rms(aboveNyquist.subarray(200,7800))).toBeLessThan(0.02);
  });

  test("lifts quiet audio before encoding and leaves healthy audio alone",()=>{
    const quiet=Float32Array.from([0.01,-0.02,0.015]);
    const lifted=normalizePeak(quiet);
    expect(Math.max(...Array.from(lifted).map(Math.abs))).toBeCloseTo(0.85,5);
    const loud=Float32Array.from([0.6,-0.7]);
    expect(normalizePeak(loud)).toBe(loud);
    expect(normalizePeak(new Float32Array(3))).toHaveLength(3);
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
    expect(isVoiceChange(sameSpeaker,otherSpeaker)).toBe(true);
    expect(isVoiceChange(otherSpeaker,otherSpeaker)).toBe(false);
    expect(isVoiceChange(null,otherSpeaker)).toBe(false);
  });

  test("refuses to build a profile from silence",()=>{
    expect(buildVoiceProfile(analyzeVoice(silence(3000),RATE))).toBeNull();
    expect(voiceSimilarity({pitchHz:120},analyzeVoice(silence(1000),RATE))).toBeNull();
  });

  test("tells voiced speech from clatter and broadband noise",()=>{
    expect(isLikelySpeech(analyzeVoice(tone(1200,140),RATE))).toBe(true);
    const noise=new Float32Array(RATE*1.2);let seed=3;
    for(let index=0;index<noise.length;index+=1){seed=(seed*1103515245+12345)%2147483648;noise[index]=(seed/2147483648-0.5)*0.4;}
    expect(isLikelySpeech(analyzeVoice(noise,RATE))).toBe(false);
    // Very short clips cannot be judged, so they pass through.
    expect(isLikelySpeech(analyzeVoice(silence(100),RATE))).toBe(true);
    expect(isLikelySpeech(null)).toBe(true);
  });
});
