/* global globalThis */
import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels=false;
env.useBrowserCache=true;

let transcriberPromise;
let transcriptionQueue=Promise.resolve();
const transcriptionJobs=new Map();

const getTranscriber=()=>{
  if(!transcriberPromise){
    transcriberPromise=pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      {
        // Use the model card's broadly compatible browser precision. The
        // quantized MatMulNBits graphs fail to initialize in some current
        // browser WASM runtimes.
        dtype:"fp32",
        progress_callback:data=>globalThis.postMessage({type:"progress",data})
      }
    ).catch(error=>{transcriberPromise=undefined;throw error;});
  }
  return transcriberPromise;
};

const handleMessage=async(event,job)=>{
  const {id,type,audio,language}=event.data||{};
  try{
    if(job?.cancelled)return;
    const transcriber=await getTranscriber();
    if(job?.cancelled)return;
    if(type==="load"){
      globalThis.postMessage({id,type:"ready"});
      return;
    }
    if(type==="transcribe"){
      // Meeting segments are intentionally short, so direct inference avoids
      // the extra overlap/windowing work used for long recordings.
      const options={task:"transcribe"};
      // Omit language for multilingual detection; never force English or the
      // translation task. A known conversation language helps short segments.
      if(typeof language==="string"&&language.trim())options.language=language.trim().toLowerCase().split("-")[0];
      const result=await transcriber(audio,options);
      if(!job?.cancelled)globalThis.postMessage({id,type:"result",text:String(result?.text||"").trim()});
    }
  }catch(error){
    if(!job?.cancelled)globalThis.postMessage({id,type:"error",error:error?.message||"The on-device Whisper model could not run."});
  }finally{if(job)transcriptionJobs.delete(id);}
};

globalThis.onmessage=event=>{
  if(event.data?.type==="cancel"){
    const job=transcriptionJobs.get(event.data.id);
    if(job)job.cancelled=true;
    return;
  }
  if(event.data?.type!=="transcribe")return handleMessage(event);
  // One model session runs inference at a time. The browser sends two cloud
  // chunks concurrently, but concurrent local decoding competes for WASM
  // memory and can fail on a shared inference session.
  const job={cancelled:false};
  transcriptionJobs.set(event.data.id,job);
  transcriptionQueue=transcriptionQueue.then(()=>handleMessage(event,job),()=>handleMessage(event,job));
  return transcriptionQueue;
};
