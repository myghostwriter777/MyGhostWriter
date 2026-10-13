import { encodeWav, resampleFloat32 } from "./meetingAudio";

const abortError=()=>new DOMException("Lecture recording cancelled.","AbortError");
const stopTracks=stream=>stream?.getTracks?.().forEach(track=>{try{track.stop();}catch{}});

// Owns the microphone, audio graph, and downloadable mixed recording. PCM is
// archived as bounded 16-bit blocks only when MediaRecorder is unavailable.
export async function openLectureCapture({signal,onFrame,onEnded,onLimit,maxBytes=128*1024*1024,maxSeconds=3*60*60}={}){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!navigator.mediaDevices?.getUserMedia||!Context)throw new Error("Microphone recording is unavailable. Open Ghostwriterme in a browser with microphone access.");
  if(signal?.aborted)throw abortError();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:true,autoGainControl:true},video:false});
  if(signal?.aborted){stopTracks(stream);throw abortError();}
  let context,processor,recorder,paused=false,closed=false,seconds=0,totalBytes=0,limitReached=false;
  let stopPromise,finishRecording,stopTimer;
  const nodes=[],parts=[];
  const limit=()=>{if(!limitReached){limitReached=true;onLimit?.();}};
  const onTrackEnded=()=>{if(!closed)onEnded?.();};
  const closeGraph=()=>{
    if(closed)return;
    closed=true;
    signal?.removeEventListener("abort",cancel);
    stream.getTracks().forEach(track=>track.removeEventListener?.("ended",onTrackEnded));
    if(processor)processor.onaudioprocess=null;
    nodes.forEach(node=>{try{node.disconnect();}catch{}});
    try{Promise.resolve(context?.close()).catch(()=>{});}catch{}
    stopTracks(stream);
  };
  const buildRecording=()=>{
    if(recorder)return new Blob(parts,{type:recorder.mimeType||"audio/webm"});
    const header=encodeWav(new Float32Array(0),16000);
    const view=new DataView(header);view.setUint32(4,36+totalBytes,true);view.setUint32(40,totalBytes,true);
    return new Blob([header,...parts],{type:"audio/wav"});
  };
  const stop=()=>{
    if(stopPromise)return stopPromise;
    stopPromise=new Promise(resolve=>{finishRecording=()=>{clearTimeout(stopTimer);finishRecording=null;const blob=buildRecording();parts.length=0;resolve({blob,seconds});};});
    // Stop the recorder before ending its stream to retain the last data event.
    if(recorder&&recorder.state!=="inactive"){
      stopTimer=setTimeout(()=>finishRecording?.(),5000);
      try{recorder.stop();}catch{finishRecording?.();}
    }else finishRecording();
    closeGraph();
    return stopPromise;
  };
  const cancel=()=>{stop().then(()=>{});};
  signal?.addEventListener("abort",cancel,{once:true});
  try{
    context=new Context();
    await context.resume();
    if(signal?.aborted)throw abortError();
    const source=context.createMediaStreamSource(stream);nodes.push(source);
    processor=context.createScriptProcessor(4096,1,1);nodes.push(processor);
    const sink=context.createGain();sink.gain.value=0;nodes.push(sink);
    if(typeof window.MediaRecorder==="function"){
      const Recorder=window.MediaRecorder;
      const mimeType=["audio/webm;codecs=opus","audio/ogg;codecs=opus","audio/mp4"].find(type=>Recorder.isTypeSupported?.(type));
      try{recorder=mimeType?new Recorder(stream,{mimeType}):new Recorder(stream);}catch{recorder=null;}
    }
    if(recorder){
      recorder.ondataavailable=event=>{if(event.data?.size){parts.push(event.data);totalBytes+=event.data.size;if(totalBytes>=maxBytes)limit();}};
      recorder.onstop=()=>finishRecording?.();
      recorder.onerror=()=>{onEnded?.();};
      recorder.start(1000);
    }
    processor.onaudioprocess=event=>{
      if(closed||paused)return;
      const samples=new Float32Array(event.inputBuffer.getChannelData(0));
      seconds+=samples.length/context.sampleRate;
      if(!recorder){
        const wav=encodeWav(resampleFloat32(samples,context.sampleRate,16000),16000);
        const pcm=wav.slice(44);parts.push(pcm);totalBytes+=pcm.byteLength;
      }
      onFrame?.(samples,context.sampleRate,seconds);
      if(seconds>=maxSeconds||totalBytes>=maxBytes)limit();
    };
    source.connect(processor);processor.connect(sink);sink.connect(context.destination);
    stream.getTracks().forEach(track=>track.addEventListener?.("ended",onTrackEnded));
    if(signal?.aborted){cancel();throw abortError();}
    return {sampleRate:context.sampleRate,stop,pause(){if(closed||paused)return;paused=true;if(recorder?.state==="recording")recorder.pause();},async resume(){if(closed)return;await context.resume();if(closed)return;if(recorder?.state==="paused")recorder.resume();paused=false;}};
  }catch(error){
    if(recorder?.state&&recorder.state!=="inactive"){try{recorder.stop();}catch{}}
    closeGraph();throw error;
  }
}
