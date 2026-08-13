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

const requestWorker=(type,payload={},transfer=[])=>new Promise((resolve,reject)=>{
  const worker=ensureWhisperWorker();
  const id=++requestSequence;
  pendingRequests.set(id,{resolve,reject});
  worker.postMessage({id,type,...payload},transfer);
});

const withProgress=async(onProgress,work)=>{
  if(onProgress)progressListeners.add(onProgress);
  try{return await work();}
  finally{if(onProgress)progressListeners.delete(onProgress);}
};

export const prepareLocalWhisper=onProgress=>withProgress(onProgress,()=>requestWorker("load"));

export const transcribeLocalAudio=(audio,onProgress)=>{
  if(!(audio instanceof Float32Array)||!audio.length)return Promise.resolve("");
  return withProgress(onProgress,async()=>{
    const message=await requestWorker("transcribe",{audio},[audio.buffer]);
    return String(message.text||"").trim();
  });
};

