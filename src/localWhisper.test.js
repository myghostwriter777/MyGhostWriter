import { resampleAudioBufferToMono16k } from "./localAudio";

describe("on-device meeting transcription audio preparation",()=>{
  test("mixes stereo audio and resamples it to Whisper's 16 kHz input",()=>{
    const left=Float32Array.from({length:32000},(_,index)=>index%2?1:0);
    const right=Float32Array.from({length:32000},(_,index)=>index%2?0:1);
    const result=resampleAudioBufferToMono16k({
      sampleRate:32000,
      length:32000,
      numberOfChannels:2,
      getChannelData:index=>index===0?left:right,
    });
    expect(result).toHaveLength(16000);
    expect(result[0]).toBeCloseTo(0.5,5);
    expect(result[500]).toBeCloseTo(0.5,5);
  });
});
