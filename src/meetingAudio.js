/* global globalThis */
// Live-audio helpers for Meeting Assist. Everything here is pure JavaScript
// over Float32Array PCM so it can be unit tested without a browser and reused
// for both the microphone and shared-tab capture paths.

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

const frameRms=frame=>{
  let sum=0;
  for(let index=0;index<frame.length;index+=1)sum+=frame[index]*frame[index];
  return frame.length?Math.sqrt(sum/frame.length):0;
};

const concatFloat32=chunks=>{
  const total=chunks.reduce((sum,chunk)=>sum+chunk.length,0);
  const output=new Float32Array(total);let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}
  return output;
};

// Windowed-sinc low-pass used before decimation. Without it, everything above
// the target Nyquist frequency (8 kHz for 16 kHz output) folds back into the
// speech band as aliasing noise, which audibly hurts transcription accuracy.
const lowPassKernel=(cutoffRatio,taps)=>{
  const kernel=new Float32Array(taps);const middle=(taps-1)/2;let sum=0;
  for(let index=0;index<taps;index+=1){
    const offset=index-middle;
    const sinc=offset===0?2*cutoffRatio:Math.sin(2*Math.PI*cutoffRatio*offset)/(Math.PI*offset);
    const window=0.54-0.46*Math.cos(2*Math.PI*index/(taps-1));
    kernel[index]=sinc*window;sum+=kernel[index];
  }
  for(let index=0;index<taps;index+=1)kernel[index]/=sum;
  return kernel;
};
const kernelCache=new Map();
const antiAliasFilter=(input,fromRate,toRate)=>{
  const key=`${fromRate}:${toRate}`;
  if(!kernelCache.has(key))kernelCache.set(key,lowPassKernel(0.45*toRate/fromRate,63));
  const kernel=kernelCache.get(key);const half=(kernel.length-1)/2;
  // Evaluates the filter at one input index. Only the two input samples around
  // each output position are needed, so the filter runs at the output rate.
  return index=>{
    let sum=0;
    const start=Math.max(0,index-half),end=Math.min(input.length-1,index+half);
    for(let position=start;position<=end;position+=1)sum+=input[position]*kernel[position-index+half];
    return sum;
  };
};

export const resampleFloat32=(input,fromRate,toRate=16000)=>{
  const source=input instanceof Float32Array?input:Float32Array.from(input||[]);
  const from=Number(fromRate)||toRate;
  if(!source.length||from===toRate)return source;
  const sampleAt=from>toRate?antiAliasFilter(source,from,toRate):index=>source[index];
  const outputLength=Math.max(1,Math.round(source.length*toRate/from));
  const output=new Float32Array(outputLength);
  for(let index=0;index<outputLength;index+=1){
    const position=index*from/toRate;
    const left=Math.min(source.length-1,Math.floor(position));
    const right=Math.min(source.length-1,left+1);
    const mix=position-left;
    const a=sampleAt(left);const b=right===left?a:sampleAt(right);
    output[index]=a+(b-a)*mix;
  }
  return output;
};

// Quiet remote voices coming out of a laptop speaker often peak far below
// full scale. Lifting them before 16-bit encoding costs nothing and keeps the
// transcription model working with a healthy signal.
export const normalizePeak=(samples,target=0.85,onlyBelow=0.5)=>{
  const input=samples instanceof Float32Array?samples:Float32Array.from(samples||[]);
  let peak=0;
  for(let index=0;index<input.length;index+=1){const magnitude=Math.abs(input[index]);if(magnitude>peak)peak=magnitude;}
  if(peak<=1e-4||peak>=onlyBelow)return input;
  const gain=target/peak;const output=new Float32Array(input.length);
  for(let index=0;index<input.length;index+=1)output[index]=input[index]*gain;
  return output;
};

// Speech segmenter: turns a continuous PCM stream into speaker turns.
//
// Two time scales matter. A speaker's turn (an "utterance") only ends after
// `endSilenceMs` of quiet, so a question with thinking pauses in the middle is
// kept together and answers are prepared once, for the whole question. Inside
// a turn, audio is handed out in `chunks` at natural pauses so transcription
// can run while the person is still talking; when the turn finally ends only
// the short tail is left to transcribe, which is what keeps answers quick.
//
// Emitted chunks carry `utteranceId` and `index`; `onUtteranceEnd` fires once
// per turn after its last chunk. Pre-roll keeps the first syllable, trailing
// silence is trimmed so the model never transcribes seconds of room noise, and
// a short onset requirement filters clicks and taps.
export function createSpeechSegmenter({
  sampleRate=48000,
  endSilenceMs=2000,
  chunkPauseMs=700,
  minChunkMs=3500,
  minSpeechMs=500,
  minTailMs=280,
  maxChunkMs=12000,
  maxUtteranceMs=45000,
  onsetMs=60,
  preRollMs=320,
  tailSilenceMs=350,
  absoluteFloor=0.006,
  speechRatio=3,
  onSegment,
  onUtteranceEnd,
  // Legacy aliases kept so older callers and tests keep working.
  silenceMs,
  maxSegmentMs,
}={}){
  if(Number.isFinite(silenceMs)&&silenceMs>0){endSilenceMs=silenceMs;chunkPauseMs=Math.min(chunkPauseMs,silenceMs);}
  if(Number.isFinite(maxSegmentMs)&&maxSegmentMs>0){maxChunkMs=maxSegmentMs;}
  const rate=Math.max(8000,Number(sampleRate)||48000);
  const hop=Math.max(64,Math.round(rate*0.02));
  const preRollSamples=Math.round(rate*preRollMs/1000);
  const tailKeepFrames=Math.max(1,Math.round(tailSilenceMs/(hop/rate*1000)));
  let noise=0.004;
  let speaking=false;
  let candidateMs=0;
  let level=0;
  let pending=new Float32Array(0);
  let preRoll=[];
  let preRollLength=0;
  // Current chunk.
  let frames=[];
  let chunkMs=0;
  let voicedMs=0;
  let framesSinceVoice=0;
  let silenceRunMs=0;
  // Current utterance.
  let utteranceId=0;
  let utteranceOpen=false;
  let utteranceMs=0;
  let chunkIndex=0;
  let emittedChunks=0;
  let utteranceSilenceMs=0;

  const trimPreRoll=()=>{
    while(preRollLength>preRollSamples&&preRoll.length>1){
      const removed=preRoll.shift();preRollLength-=removed.length;
    }
  };

  const seedPreRoll=list=>{preRoll=list.slice();preRollLength=preRoll.reduce((sum,chunk)=>sum+chunk.length,0);trimPreRoll();};

  const resetChunk=()=>{frames=[];chunkMs=0;voicedMs=0;framesSinceVoice=0;silenceRunMs=0;speaking=false;candidateMs=0;};

  const openUtterance=()=>{
    if(utteranceOpen)return;
    utteranceId+=1;utteranceOpen=true;utteranceMs=0;chunkIndex=0;emittedChunks=0;utteranceSilenceMs=0;
  };

  const closeUtterance=reason=>{
    if(!utteranceOpen)return;
    const id=utteranceId;const chunks=emittedChunks;
    utteranceOpen=false;utteranceMs=0;utteranceSilenceMs=0;
    if(chunks>0)onUtteranceEnd?.({utteranceId:id,chunks,reason});
  };

  // Emits the current chunk (trimmed of trailing silence) when it holds
  // enough voiced audio. The trailing frames become pre-roll for the next one.
  const emitChunk=(reason,{minimumMs=minSpeechMs}={})=>{
    const keep=Math.max(0,frames.length-Math.max(0,framesSinceVoice-tailKeepFrames));
    const kept=frames.slice(0,keep);const tail=frames.slice(keep);
    const voiced=voicedMs;
    resetChunk();
    // Only silent tail frames roll into the next chunk. A hard cut mid-word
    // seeds nothing, so no audio is transcribed twice.
    seedPreRoll(tail);
    if(voiced<minimumMs||!kept.length)return null;
    const audio=concatFloat32(kept);
    const result={audio,sampleRate:rate,durationMs:Math.round(audio.length/rate*1000),voicedMs:Math.round(voiced),reason,utteranceId,index:chunkIndex};
    chunkIndex+=1;emittedChunks+=1;
    onSegment?.(result);
    return result;
  };

  const processFrame=frame=>{
    const rms=frameRms(frame);
    const frameMs=frame.length/rate*1000;
    const threshold=Math.max(absoluteFloor,noise*speechRatio);
    const releaseThreshold=Math.max(absoluteFloor*0.8,noise*speechRatio*0.7);
    level=clamp(rms/Math.max(0.02,threshold*4),0,1);
    if(!speaking){
      // Noise follows quiet frames quickly downward and slowly upward so that a
      // long speech burst never becomes the new "silence".
      noise=rms<noise?noise*0.85+rms*0.15:noise*0.985+rms*0.015;
      preRoll.push(frame);preRollLength+=frame.length;trimPreRoll();
      if(rms>=threshold){
        candidateMs+=frameMs;
        if(candidateMs>=onsetMs){
          speaking=true;
          frames=preRoll.slice();preRoll=[];preRollLength=0;
          chunkMs=frames.reduce((sum,chunk)=>sum+chunk.length,0)/rate*1000;
          voicedMs=candidateMs;framesSinceVoice=0;silenceRunMs=0;
          openUtterance();utteranceSilenceMs=0;
        }
      }else candidateMs=0;
      if(utteranceOpen&&!speaking){
        utteranceSilenceMs+=frameMs;utteranceMs+=frameMs;
        if(utteranceSilenceMs>=endSilenceMs)closeUtterance("pause");
      }
      return;
    }
    frames.push(frame);chunkMs+=frameMs;utteranceMs+=frameMs;
    if(rms>=releaseThreshold){voicedMs+=frameMs;framesSinceVoice=0;silenceRunMs=0;utteranceSilenceMs=0;}
    else{framesSinceVoice+=1;silenceRunMs+=frameMs;utteranceSilenceMs+=frameMs;}
    if(utteranceSilenceMs>=endSilenceMs){
      emitChunk("pause",{minimumMs:emittedChunks>0?minTailMs:minSpeechMs});
      closeUtterance("pause");
      return;
    }
    if(silenceRunMs>=chunkPauseMs&&voicedMs>=minChunkMs){emitChunk("chunk");return;}
    if(utteranceMs>=maxUtteranceMs){emitChunk("length",{minimumMs:minTailMs});closeUtterance("length");return;}
    if(chunkMs>=maxChunkMs||(chunkMs>=maxChunkMs*0.72&&silenceRunMs>=chunkPauseMs*0.5))emitChunk("length");
  };

  return {
    push(input){
      const samples=input instanceof Float32Array?input:Float32Array.from(input||[]);
      if(!samples.length)return;
      const merged=pending.length?concatFloat32([pending,samples]):samples;
      let offset=0;
      while(offset+hop<=merged.length){processFrame(merged.subarray(offset,offset+hop));offset+=hop;}
      pending=merged.slice(offset);
    },
    // Ends the current turn right now: emits whatever chunk is in progress and
    // fires onUtteranceEnd. Used when the user stops or says "I'm speaking".
    flush(){
      let emitted=null;
      if(pending.length){const rest=pending;pending=new Float32Array(0);if(speaking){frames.push(rest);chunkMs+=rest.length/rate*1000;}}
      if(speaking)emitted=emitChunk("flush",{minimumMs:emittedChunks>0?minTailMs:minSpeechMs});
      closeUtterance("flush");
      return emitted;
    },
    reset(){pending=new Float32Array(0);preRoll=[];preRollLength=0;resetChunk();utteranceOpen=false;utteranceMs=0;utteranceSilenceMs=0;level=0;},
    get speaking(){return speaking;},
    get utteranceOpen(){return utteranceOpen;},
    // Milliseconds since the last voiced frame of the current turn.
    get quietMs(){return speaking?silenceRunMs:utteranceSilenceMs;},
    get utteranceId(){return utteranceId;},
    get level(){return level;},
    get noiseFloor(){return noise;},
  };
}

// 16-bit PCM WAV container. Small, universally decodable, and accepted by the
// server transcription route without a MediaRecorder codec negotiation.
export const encodeWav=(samples,sampleRate=16000)=>{
  const input=samples instanceof Float32Array?samples:Float32Array.from(samples||[]);
  const buffer=new ArrayBuffer(44+input.length*2);
  const view=new DataView(buffer);
  const writeString=(offset,value)=>{for(let index=0;index<value.length;index+=1)view.setUint8(offset+index,value.charCodeAt(index));};
  writeString(0,"RIFF");view.setUint32(4,36+input.length*2,true);writeString(8,"WAVE");
  writeString(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  writeString(36,"data");view.setUint32(40,input.length*2,true);
  let offset=44;
  for(let index=0;index<input.length;index+=1,offset+=2){
    const sample=clamp(input[index],-1,1);
    view.setInt16(offset,sample<0?sample*0x8000:sample*0x7fff,true);
  }
  return buffer;
};

export const arrayBufferToBase64=buffer=>{
  const bytes=new Uint8Array(buffer);let binary="";
  for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return typeof btoa==="function"?btoa(binary):globalThis.Buffer.from(binary,"binary").toString("base64");
};

export const wavDataUrl=(samples,sampleRate=16000)=>`data:audio/wav;base64,${arrayBufferToBase64(encodeWav(samples,sampleRate))}`;

// Lightweight voice fingerprint: median pitch plus brightness (zero-crossing
// rate) of voiced frames. It is a hint, not a biometric. It helps most when
// the user's voice sits in a different range from the other speaker.
const estimatePitch=(frame,rate)=>{
  const minLag=Math.floor(rate/400),maxLag=Math.floor(rate/60);
  if(frame.length<=maxLag+1)return{pitch:0,clarity:0};
  let mean=0;for(let index=0;index<frame.length;index+=1)mean+=frame[index];mean/=frame.length;
  let energy=0;for(let index=0;index<frame.length;index+=1){const sample=frame[index]-mean;energy+=sample*sample;}
  if(energy<=1e-7)return{pitch:0,clarity:0};
  const scores=new Float32Array(maxLag+1);let best=0;
  for(let lag=minLag;lag<=maxLag;lag+=1){
    let sum=0;
    for(let index=0;index+lag<frame.length;index+=1)sum+=(frame[index]-mean)*(frame[index+lag]-mean);
    scores[lag]=sum/energy;if(scores[lag]>best)best=scores[lag];
  }
  if(best<0.45)return{pitch:0,clarity:best};
  // Prefer the shortest lag that is nearly as strong as the maximum so octave
  // errors toward sub-harmonics are avoided.
  let chosen=maxLag;
  for(let lag=minLag;lag<=maxLag;lag+=1){if(scores[lag]>=best*0.9){chosen=lag;break;}}
  return{pitch:rate/chosen,clarity:best};
};

export const analyzeVoice=(samples,sampleRate=16000)=>{
  const rate=Number(sampleRate)||16000;
  const audio=rate>16000?resampleFloat32(samples,rate,16000):(samples instanceof Float32Array?samples:Float32Array.from(samples||[]));
  const analysisRate=rate>16000?16000:rate;
  const frameSize=Math.round(analysisRate*0.04);
  const pitches=[];const brightness=[];let frames=0;
  const gate=Math.max(0.01,frameRms(audio)*0.6);
  for(let offset=0;offset+frameSize<=audio.length;offset+=frameSize){
    const frame=audio.subarray(offset,offset+frameSize);frames+=1;
    if(frameRms(frame)<gate)continue;
    const {pitch,clarity}=estimatePitch(frame,analysisRate);
    if(!pitch||clarity<0.5)continue;
    let crossings=0;for(let index=1;index<frame.length;index+=1)if((frame[index-1]<0)!==(frame[index]<0))crossings+=1;
    pitches.push(pitch);brightness.push(crossings/frame.length*analysisRate/2);
  }
  const median=values=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
  return{pitchHz:Math.round(median(pitches)),brightnessHz:Math.round(median(brightness)),voicedRatio:frames?pitches.length/frames:0,voicedFrames:pitches.length,frames};
};

// Human speech has pitched (voiced) frames; keyboard clatter, door slams and
// broadband noise do not. Chunks that fail this check are never sent to the
// transcription model, which is where most "phantom" transcript lines came from.
export const isLikelySpeech=(features,{minVoicedFrames=3,minVoicedRatio=0.06}={})=>{
  if(!features)return true;
  if(!Number.isFinite(features.frames)||features.frames<6)return true;
  return features.voicedFrames>=minVoicedFrames&&features.voicedRatio>=minVoicedRatio;
};

export const buildVoiceProfile=(features,{minVoicedFrames=12}={})=>{
  if(!features||features.voicedFrames<minVoicedFrames||!features.pitchHz)return null;
  return{pitchHz:features.pitchHz,brightnessHz:features.brightnessHz,createdAt:new Date().toISOString()};
};

export const voiceSimilarity=(profile,features)=>{
  if(!profile?.pitchHz||!features?.pitchHz||features.voicedFrames<3)return null;
  const semitones=Math.abs(12*Math.log2(features.pitchHz/profile.pitchHz));
  const pitchScore=clamp(1-semitones/7,0,1);
  const brightnessGap=Math.abs((features.brightnessHz||0)-(profile.brightnessHz||0))/Math.max(400,profile.brightnessHz||400);
  const brightnessScore=clamp(1-brightnessGap,0,1);
  return Math.round((pitchScore*0.75+brightnessScore*0.25)*100)/100;
};

export const describeVoiceMatch=similarity=>{
  if(similarity==null)return"unknown";
  if(similarity>=0.72)return"likely the user";
  if(similarity<=0.42)return"likely another speaker";
  return"unclear";
};

// When a voice sample exists and consecutive chunks of one turn flip between
// "clearly the user" and "clearly someone else", the turn is really two
// speakers back to back (the interviewer asked, the user began answering
// within the two-second window). Splitting there keeps answers on the question.
export const isVoiceChange=(previous,next)=>{
  if(previous==null||next==null)return false;
  return (previous>=0.72&&next<=0.42)||(previous<=0.42&&next>=0.72);
};
