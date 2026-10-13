let whisperWorker;
let requestSequence=0;
const pendingRequests=new Map();
const progressListeners=new Set();

const failPendingRequests=message=>{
  for(const {reject} of pendingRequests.values())reject(new Error(message));
  pendingRequests.clear();
};

const ensureWhisperWorker=()=>{
  if(whisperWorker)return whisperWorker;
  if(typeof Worker==="undefined")throw new Error("This browser cannot run the on-device speech model.");

  whisperWorker=new Worker(new URL("./whisper.worker.js",import.meta.url),{type:"module"});
  whisperWorker.onmessage=event=>{
    const message=event.data||{};
    if(message.type==="progress"){
      for(const listener of progressListeners)listener(message.data||{});
      return;
    }
    const pending=pendingRequests.get(message.id);
    if(!pending)return;
    pendingRequests.delete(message.id);
    if(message.type==="error")pending.reject(new Error(message.error||"On-device transcription failed."));
    else pending.resolve(message);
  };
  whisperWorker.onerror=event=>{
    failPendingRequests(event?.message||"The on-device speech worker stopped unexpectedly.");
    try{whisperWorker?.terminate?.();}catch{}
    whisperWorker=undefined;
  };
  return whisperWorker;
};

const requestWorker=(type,payload={},transfer=[],signal)=>new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException("Transcription cancelled.","AbortError"));return;}
  const worker=ensureWhisperWorker();
  const id=++requestSequence;
  const cleanup=()=>signal?.removeEventListener("abort",cancel);
  const cancel=()=>{
    if(!pendingRequests.delete(id))return;
    cleanup();reject(new DOMException("Transcription cancelled.","AbortError"));
    try{worker.postMessage({id,type:"cancel"});}catch{}
  };
  pendingRequests.set(id,{resolve:value=>{cleanup();resolve(value);},reject:error=>{cleanup();reject(error);}});
  signal?.addEventListener("abort",cancel,{once:true});
  try{worker.postMessage({id,type,...payload},transfer);}
  catch(error){pendingRequests.delete(id);cleanup();reject(error);}
});

const withProgress=async(onProgress,work)=>{
  if(onProgress)progressListeners.add(onProgress);
  try{return await work();}
  finally{if(onProgress)progressListeners.delete(onProgress);}
};

export const prepareLocalWhisper=onProgress=>withProgress(onProgress,()=>requestWorker("load"));

export const transcribeLocalAudio=(audio,onProgress,{language,signal}={})=>{
  if(!(audio instanceof Float32Array)||!audio.length)return Promise.resolve("");
  return withProgress(onProgress,async()=>{
    // The caller may retry or share a view into a larger recording. Transfer
    // only our own copy, leaving their buffer usable after transcription.
    const transferable=audio.slice();
    const message=await requestWorker("transcribe",{audio:transferable,language},[transferable.buffer],signal);
    return String(message.text||"").trim();
  });
};
