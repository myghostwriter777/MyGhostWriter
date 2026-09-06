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

export const resampleFloat32=(input,fromRate,toRate=16000)=>{
  const source=input instanceof Float32Array?input:Float32Array.from(input||[]);
  const from=Number(fromRate)||toRate;
  if(!source.length||from===toRate)return source;
  const outputLength=Math.max(1,Math.round(source.length*toRate/from));
  const output=new Float32Array(outputLength);
  for(let index=0;index<outputLength;index+=1){
    const position=index*from/toRate;
    const left=Math.min(source.length-1,Math.floor(position));
    const right=Math.min(source.length-1,left+1);
    const mix=position-left;
    output[index]=source[left]+(source[right]-source[left])*mix;
  }
  return output;
};

// Speech segmenter: turns a continuous PCM stream into whole utterances.
// A fixed recorder timer chops questions mid-sentence; this waits for a pause
// instead, keeps a little pre-roll so the first syllable survives, and tracks
// the room's noise floor so a quiet interviewer still registers as speech.
export function createSpeechSegmenter({
  sampleRate=48000,
  silenceMs=750,
  minSpeechMs=450,
  maxSegmentMs=14000,
  preRollMs=320,
  absoluteFloor=0.006,
  speechRatio=3,
  onSegment,
}={}){
  const rate=Math.max(8000,Number(sampleRate)||48000);
  const hop=Math.max(64,Math.round(rate*0.02));
  const preRollSamples=Math.round(rate*preRollMs/1000);
  let noise=0.004;
  let speaking=false;
  let speechMs=0;
  let silenceRunMs=0;
  let segmentMs=0;
  let quietTailMs=0;
  let level=0;
  let pending=new Float32Array(0);
  let preRoll=[];
  let preRollLength=0;
  let segment=[];

  const trimPreRoll=()=>{
    while(preRollLength>preRollSamples&&preRoll.length>1){
      const removed=preRoll.shift();preRollLength-=removed.length;
    }
  };

  const emit=reason=>{
    const audio=concatFloat32(segment);
    segment=[];
    const voicedMs=speechMs;
    segmentMs=0;speechMs=0;silenceRunMs=0;quietTailMs=0;speaking=false;
    if(voicedMs<minSpeechMs||!audio.length)return null;
    const result={audio,sampleRate:rate,durationMs:Math.round(audio.length/rate*1000),reason};
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
        speaking=true;segment=preRoll.slice();preRoll=[];preRollLength=0;
        segmentMs=segment.reduce((sum,chunk)=>sum+chunk.length,0)/rate*1000;
        speechMs=frameMs;silenceRunMs=0;quietTailMs=0;
      }
      return;
    }
    segment.push(frame);segmentMs+=frameMs;
    if(rms>=releaseThreshold){speechMs+=frameMs;silenceRunMs=0;quietTailMs=0;}
    else{silenceRunMs+=frameMs;quietTailMs+=frameMs;}
    if(silenceRunMs>=silenceMs){emit("pause");return;}
    if(segmentMs>=maxSegmentMs||(segmentMs>=maxSegmentMs*0.72&&quietTailMs>=silenceMs*0.35))emit("length");
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
    flush(){
      if(pending.length){const rest=pending;pending=new Float32Array(0);if(speaking){segment.push(rest);segmentMs+=rest.length/rate*1000;}}
      return speaking?emit("flush"):null;
    },
    reset(){pending=new Float32Array(0);preRoll=[];preRollLength=0;segment=[];speaking=false;speechMs=0;silenceRunMs=0;segmentMs=0;quietTailMs=0;level=0;},
    get speaking(){return speaking;},
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
  return{pitchHz:Math.round(median(pitches)),brightnessHz:Math.round(median(brightness)),voicedRatio:frames?pitches.length/frames:0,voicedFrames:pitches.length};
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
