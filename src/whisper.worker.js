/* global globalThis */
import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels=false;
env.useBrowserCache=true;

let transcriberPromise;

const getTranscriber=()=>{
  if(!transcriberPromise){
    transcriberPromise=pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
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

globalThis.onmessage=async event=>{
  const {id,type,audio}=event.data||{};
  try{
    const transcriber=await getTranscriber();
    if(type==="load"){
      globalThis.postMessage({id,type:"ready"});
      return;
    }
    if(type==="transcribe"){
      const result=await transcriber(audio,{chunk_length_s:10,stride_length_s:1});
      globalThis.postMessage({id,type:"result",text:String(result?.text||"").trim()});
    }
  }catch(error){
    globalThis.postMessage({id,type:"error",error:error?.message||"The on-device Whisper model could not run."});
  }
};
