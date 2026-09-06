import { normalizePeak, resampleFloat32, wavDataUrl } from "./meetingAudio";

export class MeetingTranscriptionError extends Error{
  constructor(message,{code="transcription_failed",retryable=false,retryAfter=0,status=0}={}){
    super(message);this.name="MeetingTranscriptionError";this.code=code;this.retryable=retryable;this.retryAfter=retryAfter;this.status=status;
  }
}

// Codes returned by /api/transcribe that mean the server route will keep
// failing for this session, so the on-device model should take over.
export const TERMINAL_SERVER_CODES=new Set(["gateway_auth","gateway_credits","gateway_forbidden","model_unavailable"]);

const LANGUAGE_CODE=/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/;

export async function transcribeOnServer(samples16k,{fetchImpl=typeof fetch==="function"?fetch:null,signal,language,prompt}={}){
  if(!fetchImpl)throw new MeetingTranscriptionError("Network transcription is unavailable in this browser.",{code:"no_fetch",retryable:false});
  const body={audio:wavDataUrl(samples16k,16000)};
  if(typeof language==="string"&&LANGUAGE_CODE.test(language.trim()))body.language=language.trim();
  if(typeof prompt==="string"&&prompt.trim())body.prompt=prompt.trim().slice(0,400);
  let response;
  try{
    response=await fetchImpl("/api/transcribe",{method:"POST",headers:{"Content-Type":"application/json"},signal,body:JSON.stringify(body)});
  }catch(error){
    if(error?.name==="AbortError")throw error;
    throw new MeetingTranscriptionError("The transcription service could not be reached.",{code:"network",retryable:true,retryAfter:4});
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    throw new MeetingTranscriptionError(data?.error||`Transcription failed (${response.status}).`,{
      code:data?.code||(response.status===429?"rate_limited":response.status>=500?"provider_unavailable":"transcription_failed"),
      retryable:typeof data?.retryable==="boolean"?data.retryable:(response.status===429||response.status>=500),
      retryAfter:Number(data?.retry_after)||(response.status===429?10:response.status>=500?6:0),
      status:response.status,
    });
  }
  return String(data?.text||"").trim();
}

// Chooses between the server route and the on-device model for the rest of a
// session. Server first: it is multilingual, accurate, and needs no download.
// A terminal server failure (no credits, not configured) switches to Whisper
// on the device so the session keeps working instead of dying mid-interview.
export function createMeetingTranscriber({server,local,prepareLocal,onModeChange,maxNetworkFailures=3,now=()=>Date.now()}={}){
  let mode="server";
  let networkFailures=0;
  let retryNotBefore=0;
  let localReady=false;
  let localPreparation=null;

  const switchToLocal=async reason=>{
    if(mode!=="local"){mode="local";onModeChange?.({mode,reason});}
    if(!localReady){
      localPreparation=localPreparation||Promise.resolve(prepareLocal?.()).then(()=>{localReady=true;});
      await localPreparation;
    }
  };

  const transcribeLocally=async(samples16k,reason)=>{
    if(typeof local!=="function")throw new MeetingTranscriptionError(reason||"On-device transcription is unavailable.",{code:"local_unavailable",retryable:false});
    await switchToLocal(reason);
    return String(await local(samples16k)||"").trim();
  };

  return{
    get mode(){return mode;},
    async transcribe(samples,{sampleRate=16000,signal,language,prompt}={}){
      const samples16k=normalizePeak(resampleFloat32(samples,sampleRate,16000));
      if(mode==="local")return transcribeLocally(samples16k);
      if(retryNotBefore&&now()<retryNotBefore){
        const error=new MeetingTranscriptionError("Transcription is cooling down after a rate limit.",{code:"cooldown",retryable:true,retryAfter:Math.ceil((retryNotBefore-now())/1000)});
        error.skipped=true;throw error;
      }
      try{
        const text=await server(samples16k,{signal,language,prompt});
        networkFailures=0;retryNotBefore=0;
        return text;
      }catch(error){
        if(error?.name==="AbortError")throw error;
        const code=error?.code||"";
        if(TERMINAL_SERVER_CODES.has(code)||code==="no_fetch")return transcribeLocally(samples16k,error?.message);
        if(code==="network"){
          networkFailures+=1;
          if(networkFailures>=maxNetworkFailures)return transcribeLocally(samples16k,"The transcription service is unreachable, so Ghosty switched to the on-device model.");
        }
        if(error?.retryable&&code!=="network"){retryNotBefore=now()+Math.max(2,Number(error.retryAfter)||5)*1000;}
        throw error;
      }
    },
  };
}
