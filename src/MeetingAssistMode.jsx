import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GwmIcon from "./GwmIcon";
import { buildRemoteMeetingAudioStream, cleanMeetingTranscriptSegment, detectMeetingCaptureProfile, isBrowserTabMeetingShare, isUsefulMeetingTranscript, MEETING_DISPLAY_OPTIONS } from "./meetingCapture";
import { analyzeVoice, buildVoiceProfile, createSpeechSegmenter, isLikelySpeech, isVoiceChange, resampleFloat32, voiceSimilarity } from "./meetingAudio";
import { createMeetingTranscriber, transcribeOnServer } from "./meetingTranscriber";
import { prepareLocalWhisper, transcribeLocalAudio } from "./localWhisper";
import { buildMeetingPrompt, buildTranscriptionHint, MEETING_LANGUAGE_KEY, MEETING_LANGUAGES, meetingSessionAsText, MEETING_SITUATIONS, MEETING_VOICE_PROFILE_KEY, meetingSituation, mergeUtteranceText, normalizeMeetingReply, speakerLabel } from "./meetingAssist";

const C={
  text:"var(--gwm-text)",muted:"var(--gwm-muted)",border:"var(--gwm-border)",surface:"var(--gwm-surface)",card:"var(--gwm-card)",
  magenta:"#f472b6",magentaSoft:"rgba(244,114,182,0.11)",magentaText:"var(--gwm-magenta-text)",
  blue:"#79BAEC",blueText:"var(--gwm-blue-text)",green:"#3ddba4",greenText:"var(--gwm-green-text)",
  red:"#f06b6b",redText:"var(--gwm-red-text)",yellow:"#f5c842",yellowText:"var(--gwm-yellow-text)",violet:"#c084fc",
};

const VOICE_SAMPLE_SECONDS=6;
const VOICE_SAMPLE_LINE="Thanks for having me today. I'm looking forward to talking about this role and how my experience fits the team.";
const LEVEL_BARS=14;
// How long the other person has to stay quiet before their turn counts as
// finished and answers are prepared. Chunks are transcribed during the turn.
const TURN_END_SILENCE_MS=2000;
const TRANSCRIBE_CONCURRENCY=2;
const ATTRIBUTION_WATCHDOG_MS=75000;
const ATTRIBUTION_RETRY_DELAY_MS=2500;
const MICROPHONE_CONSTRAINTS={audio:{echoCancellation:false,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false};

const loadVoiceProfile=email=>{try{const raw=localStorage.getItem(MEETING_VOICE_PROFILE_KEY(email));const parsed=raw?JSON.parse(raw):null;return parsed?.pitchHz?parsed:null;}catch{return null;}};
const storeVoiceProfile=(email,profile)=>{try{if(profile)localStorage.setItem(MEETING_VOICE_PROFILE_KEY(email),JSON.stringify(profile));else localStorage.removeItem(MEETING_VOICE_PROFILE_KEY(email));}catch{}};
const loadLanguage=email=>{try{const value=localStorage.getItem(MEETING_LANGUAGE_KEY(email))||"";return MEETING_LANGUAGES.some(item=>item.value===value)?value:"";}catch{return"";}};
const storeLanguage=(email,value)=>{try{if(value)localStorage.setItem(MEETING_LANGUAGE_KEY(email),value);else localStorage.removeItem(MEETING_LANGUAGE_KEY(email));}catch{}};

const stopStream=stream=>{try{stream?.getTracks?.().forEach(track=>track.stop());}catch{}};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const average=values=>{const list=values.filter(value=>value!=null&&Number.isFinite(value));return list.length?Math.round(list.reduce((sum,value)=>sum+value,0)/list.length*100)/100:null;};

// Web Audio capture shared by live sessions and the voice sample: one graph
// from the stream through a high-pass (drops rumble, handling noise and mains
// hum that otherwise inflate the level and trigger the detector) and a gentle
// low-pass into a script processor whose PCM frames are copied out.
// ScriptProcessorNode is deprecated but still ships everywhere, including
// Android WebViews, and needs no separately hosted worklet module.
async function openAudioGraph(stream){
  const Context=typeof window!=="undefined"?(window.AudioContext||window.webkitAudioContext):null;
  if(!Context)throw new Error("This browser cannot process live audio.");
  const context=new Context();
  try{await context.resume();}catch{}
  const source=context.createMediaStreamSource(stream);
  const nodes=[source];
  const filter=(type,frequency)=>{try{const node=context.createBiquadFilter();node.type=type;node.frequency.value=frequency;node.Q.value=0.707;nodes.push(node);}catch{}};
  filter("highpass",85);filter("lowpass",7600);
  const processor=context.createScriptProcessor(4096,1,1);
  const sink=context.createGain();sink.gain.value=0;
  let closed=false;
  // Mobile browsers can suspend a context when the app is backgrounded during
  // a long pause; wake it again instead of silently hearing nothing.
  const onStateChange=()=>{if(!closed&&context.state==="suspended")context.resume().catch(()=>{});};
  try{context.addEventListener("statechange",onStateChange);}catch{}
  return {
    sampleRate:context.sampleRate,
    start(onFrame){
      processor.onaudioprocess=event=>{const input=event.inputBuffer.getChannelData(0);onFrame(new Float32Array(input),context.sampleRate);};
      for(let index=0;index+1<nodes.length;index+=1)nodes[index].connect(nodes[index+1]);
      nodes[nodes.length-1].connect(processor);processor.connect(sink);sink.connect(context.destination);
    },
    close(){
      closed=true;
      try{context.removeEventListener("statechange",onStateChange);}catch{}
      try{processor.onaudioprocess=null;processor.disconnect();}catch{}
      try{nodes.forEach(node=>node.disconnect());sink.disconnect();}catch{}
      try{context.close();}catch{}
    },
  };
}

function LevelMeter({level,active,paused}){
  const lit=Math.round(Math.max(0,Math.min(1,level))*LEVEL_BARS);
  return <div aria-hidden="true" style={{display:"flex",gap:3,alignItems:"flex-end",height:22}}>{Array.from({length:LEVEL_BARS},(_,index)=><span key={index} style={{width:5,borderRadius:2,height:6+index*1.1,background:paused?"rgba(245,200,66,0.35)":index<lit&&active?(index>LEVEL_BARS-4?C.magenta:C.green):"rgba(142,172,196,0.22)",transition:"background .08s"}}/>)}</div>;
}

function OptionCard({option,index,accent,dark,onCopy,copied,compact=false}){
  const tone=["Direct","With an example","Thoughtful"][index]||`Option ${index+1}`;
  return <div style={{padding:compact?"10px 11px":"12px 13px",borderRadius:11,border:`1px solid ${copied?C.green:dark?"rgba(244,114,182,0.32)":"rgba(244,114,182,0.28)"}`,background:dark?"rgba(255,255,255,0.05)":C.magentaSoft,display:"grid",gap:8}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><span style={{fontSize:10,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",color:accent}}>{index+1} · {tone}</span><button type="button" onClick={onCopy} aria-label={`Copy answer option ${index+1}`} style={{minHeight:30,padding:"4px 10px",borderRadius:7,border:`1px solid ${copied?C.green:dark?"rgba(255,255,255,0.22)":C.border}`,background:copied?"rgba(61,219,164,0.12)":"transparent",color:copied?C.green:dark?"#dbeafe":C.muted,fontFamily:"inherit",fontSize:11.5,fontWeight:800,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}><GwmIcon name={copied?"check":"copy"} size={13}/>{copied?"Copied":"Copy"}</button></div>
    <div style={{fontSize:compact?13.5:14.5,lineHeight:1.6,color:dark?"#fff":C.text,fontWeight:600,whiteSpace:"pre-wrap"}}>{option}</div>
  </div>;
}

export default function MeetingAssistMode({user,request,save,parseJson,ensureAI,ui}){
  const {Card,FArea,PriBtn,ErrBox,IconLabel}=ui;
  const captureProfile=detectMeetingCaptureProfile();
  const email=user?.email||"guest";
  const [situation,setSituation]=useState("interview");
  const [source,setSource]=useState("microphone");
  const [language,setLanguage]=useState(()=>loadLanguage(email));
  const [context,setContext]=useState("");
  const [consent,setConsent]=useState(false);
  const [active,setActive]=useState(false);
  const [paused,setPaused]=useState(false);
  const [starting,setStarting]=useState(false);
  const [level,setLevel]=useState(0);
  const [phase,setPhase]=useState("idle");
  const [transcribing,setTranscribing]=useState(0);
  const [thinking,setThinking]=useState(false);
  const [lines,setLines]=useState([]);
  const [answer,setAnswer]=useState(null);
  const [answerNote,setAnswerNote]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [engine,setEngine]=useState("server");
  const [engineProgress,setEngineProgress]=useState("");
  const [voiceProfile,setVoiceProfile]=useState(()=>loadVoiceProfile(email));
  const [sampling,setSampling]=useState(0);
  const [overlayWindow,setOverlayWindow]=useState(null);
  const [saved,setSaved]=useState(false);
  const [copiedIndex,setCopiedIndex]=useState(-1);

  const activeRef=useRef(false);
  const pausedRef=useRef(false);
  const sourceRef=useRef("microphone");
  const situationRef=useRef("interview");
  const contextRef=useRef("");
  const languageRef=useRef(language);
  const sessionRef=useRef(0);
  const graphRef=useRef(null);
  const streamRef=useRef(null);
  const segmenterRef=useRef(null);
  const transcriberRef=useRef(null);
  const utterancesRef=useRef(new Map());
  const inFlightRef=useRef(0);
  const waitingRef=useRef([]);
  const linesRef=useRef([]);
  const lineIdRef=useRef(0);
  const attributionBusyRef=useRef(false);
  const attributionStartedRef=useRef(0);
  const attributionDirtyRef=useRef(false);
  const levelTickRef=useRef(0);
  const phaseRef=useRef("idle");
  const voiceProfileRef=useRef(voiceProfile);
  const overlayWindowRef=useRef(null);
  const sampleRef=useRef(null);

  const canUseMicrophone=typeof navigator!=="undefined"&&!!navigator.mediaDevices?.getUserMedia&&typeof window!=="undefined"&&!!(window.AudioContext||window.webkitAudioContext);
  const canShareTab=captureProfile.remoteAudioOnlyAvailable&&typeof navigator!=="undefined"&&!!navigator.mediaDevices?.getDisplayMedia;
  const canUseOverlay=typeof window!=="undefined"&&!!window.documentPictureInPicture?.requestWindow;
  const scene=meetingSituation(situation);
  const canStart=consent&&(source==="tab"?canShareTab:canUseMicrophone);

  useEffect(()=>{voiceProfileRef.current=voiceProfile;},[voiceProfile]);
  useEffect(()=>{setVoiceProfile(loadVoiceProfile(email));setLanguage(loadLanguage(email));},[email]);
  useEffect(()=>{situationRef.current=situation;},[situation]);
  useEffect(()=>{contextRef.current=context;},[context]);
  useEffect(()=>{languageRef.current=language;},[language]);
  useEffect(()=>()=>{
    activeRef.current=false;sessionRef.current+=1;
    graphRef.current?.close?.();stopStream(streamRef.current);sampleRef.current?.close?.();
    try{overlayWindowRef.current?.close?.();}catch{}
  },[]);

  const setLinesState=next=>{linesRef.current=next;setLines(next);};
  const updatePhase=value=>{if(phaseRef.current!==value){phaseRef.current=value;setPhase(value);}};

  const ensureTranscriber=()=>{
    if(transcriberRef.current)return transcriberRef.current;
    transcriberRef.current=createMeetingTranscriber({
      server:(samples,options)=>transcribeOnServer(samples,options),
      local:samples=>transcribeLocalAudio(samples,data=>{const progress=Number(data?.progress);if(Number.isFinite(progress))setEngineProgress(`${Math.max(0,Math.min(100,Math.round(progress)))}%`);}),
      prepareLocal:()=>{setEngineProgress("preparing…");return prepareLocalWhisper(data=>{const progress=Number(data?.progress);if(Number.isFinite(progress))setEngineProgress(`${Math.max(0,Math.min(100,Math.round(progress)))}%`);}).finally(()=>setEngineProgress(""));},
      onModeChange:({mode,reason})=>{setEngine(mode);if(mode==="local")setNotice(`${reason?reason+" ":""}Ghosty is now transcribing on this device (English works best).`);},
    });
    return transcriberRef.current;
  };

  // Runs at most TRANSCRIBE_CONCURRENCY transcriptions at once, in submission
  // order, so the short tail of a turn is never stuck behind a long chunk.
  const runLimited=task=>new Promise((resolve,reject)=>{
    const start=()=>{
      inFlightRef.current+=1;setTranscribing(inFlightRef.current);
      Promise.resolve().then(task).then(resolve,reject).finally(()=>{
        inFlightRef.current=Math.max(0,inFlightRef.current-1);setTranscribing(inFlightRef.current);
        const next=waitingRef.current.shift();if(next)next();
      });
    };
    if(inFlightRef.current<TRANSCRIBE_CONCURRENCY)start();else waitingRef.current.push(start);
  });

  const requestReply=async({pending,history,nudge=""})=>{
    ensureAI?.();
    const {system,user:userPrompt}=buildMeetingPrompt({situation:situationRef.current,source:sourceRef.current,context:contextRef.current,history,newLines:pending});
    const raw=await request(system,userPrompt+nudge,700,[],user?.email,{mode:"meeting",timeoutMs:40000});
    return normalizeMeetingReply(parseJson(raw),pending.length);
  };

  const applyReply=(reply,pending)=>{
    const remoteOnly=sourceRef.current==="tab";
    const pendingIds=new Map(pending.map((line,index)=>[line.id,index]));
    setLinesState(linesRef.current.map(line=>{
      if(!pendingIds.has(line.id))return line;
      const label=reply.labels[pendingIds.get(line.id)];
      return {...line,reviewed:true,speaker:remoteOnly?"other":(label||"unclear")};
    }));
    if(reply.needsReply){setAnswer({heard:reply.heard,options:reply.options,at:Date.now()});setCopiedIndex(-1);setError("");setAnswerNote("");}
    else setAnswerNote(reply.labels.length&&reply.labels.every(label=>label==="you")?"That was you speaking, so no new answers were prepared.":`Nothing new from ${scene.other} in that line. Answers appear as soon as they speak.`);
  };

  const runAttribution=async session=>{
    const startedAt=Date.now();
    // A run that never returned (a hung request) must not block every later
    // question for the rest of the session.
    if(attributionBusyRef.current&&startedAt-attributionStartedRef.current<ATTRIBUTION_WATCHDOG_MS)return;
    attributionBusyRef.current=true;attributionStartedRef.current=startedAt;
    try{
      while(attributionDirtyRef.current&&sessionRef.current===session){
        attributionDirtyRef.current=false;
        const pending=linesRef.current.filter(line=>line.complete&&!line.reviewed);
        if(!pending.length)break;
        const history=linesRef.current.filter(line=>line.reviewed).slice(-12);
        setThinking(true);
        try{
          let reply=null;
          for(let attempt=0;attempt<2&&!reply;attempt+=1){
            try{reply=await requestReply({pending,history});}
            catch(replyError){
              if(sessionRef.current!==session||attempt===1)throw replyError;
              await wait(ATTRIBUTION_RETRY_DELAY_MS);
            }
          }
          if(sessionRef.current!==session)break;
          const remoteOnly=sourceRef.current==="tab";
          const otherIndexes=reply.labels.map((label,index)=>(remoteOnly||label==="other")?index:-1).filter(index=>index>=0);
          if(!reply.needsReply&&otherIndexes.length){
            // The model labelled a line as the other party but skipped the
            // options. Ask once more with that contradiction spelled out.
            const nudge=`\n\nLine(s) ${otherIndexes.join(", ")} were spoken by the other party, so needsReply must be true with exactly three options responding to the most recent of them.`;
            try{const second=await requestReply({pending,history,nudge});if(second.needsReply)reply={...second,labels:second.labels.map((label,index)=>label||reply.labels[index])};}catch{}
            if(sessionRef.current!==session)break;
          }
          applyReply(reply,pending);
        }catch(replyError){
          if(sessionRef.current!==session)break;
          setLinesState(linesRef.current.map(line=>line.reviewed||!line.complete?line:{...line,reviewed:true,speaker:sourceRef.current==="tab"?"other":(line.speaker==="pending"?"unclear":line.speaker)}));
          setError("Ghosty heard the line but could not prepare answers yet. "+(replyError?.message||"Try again shortly."));
        }finally{setThinking(false);}
      }
    }finally{attributionBusyRef.current=false;}
  };

  const newLineRecord=()=>{lineIdRef.current+=1;return {id:lineIdRef.current,chunks:[],closed:false,finished:false,at:Date.now()};};

  const getUtterance=id=>{
    let utterance=utterancesRef.current.get(id);
    if(!utterance){
      const line=newLineRecord();
      utterance={id,ended:false,lines:[line],current:line,chain:Promise.resolve()};
      utterancesRef.current.set(id,utterance);
      if(utterancesRef.current.size>40){const oldest=utterancesRef.current.keys().next().value;utterancesRef.current.delete(oldest);}
    }
    return utterance;
  };

  const upsertLine=(record,text,complete)=>{
    const existing=linesRef.current.find(line=>line.id===record.id);
    const entry={id:record.id,text,speaker:existing?.speaker||(sourceRef.current==="tab"?"other":"pending"),reviewed:false,voiceMatch:average(record.chunks.map(chunk=>chunk.match)),at:existing?.at||record.at,complete};
    setLinesState(existing?linesRef.current.map(line=>line.id===record.id?entry:line):[...linesRef.current,entry]);
  };

  const removeLine=record=>{if(linesRef.current.some(line=>line.id===record.id))setLinesState(linesRef.current.filter(line=>line.id!==record.id));};

  // Shows the words heard so far while the person is still talking.
  const showPartial=record=>{
    const ordered=[...record.chunks].sort((a,b)=>a.index-b.index);
    const prefix=[];for(const chunk of ordered){if(!chunk.done)break;prefix.push(chunk.text);}
    const text=mergeUtteranceText(prefix);
    if(text)upsertLine(record,text,false);
  };

  // A line is complete once its turn closed and every chunk has come back.
  const finishLine=(record,session)=>{
    if(record.finished||!record.closed||record.chunks.some(chunk=>!chunk.done))return;
    record.finished=true;
    const text=cleanMeetingTranscriptSegment(mergeUtteranceText([...record.chunks].sort((a,b)=>a.index-b.index).map(chunk=>chunk.text)));
    if(!isUsefulMeetingTranscript(text)){removeLine(record);return;}
    const previous=linesRef.current.filter(line=>line.id!==record.id).at(-1);
    if(previous&&previous.text.toLocaleLowerCase()===text.toLocaleLowerCase()){removeLine(record);return;}
    upsertLine(record,text,true);
    setSaved(false);setNotice("");
    attributionDirtyRef.current=true;
    runAttribution(session);
  };

  const closeLine=(record,session)=>{record.closed=true;finishLine(record,session);};

  const transcribeChunk=async(record,chunk,session)=>{
    try{
      const samples=chunk.samples16k;chunk.samples16k=null;
      let text="";
      try{
        text=await runLimited(()=>ensureTranscriber().transcribe(samples,{sampleRate:16000,language:languageRef.current||undefined,prompt:buildTranscriptionHint({situation:situationRef.current,context:contextRef.current})}));
      }catch(transcriptionError){
        if(sessionRef.current!==session)return;
        if(transcriptionError?.skipped){/* cooling down after a rate limit; nothing to show */}
        else if(transcriptionError?.retryable)setNotice(`${transcriptionError.message} Ghosty keeps listening.`);
        else throw transcriptionError;
      }
      if(sessionRef.current!==session)return;
      chunk.text=cleanMeetingTranscriptSegment(text);chunk.done=true;
      showPartial(record);
      finishLine(record,session);
    }catch(segmentError){
      chunk.text="";chunk.done=true;
      if(sessionRef.current!==session)return;
      finishLine(record,session);
      const message=segmentError?.message||"This part of the conversation could not be transcribed.";
      if(segmentError?.code==="local_unavailable"){setError(message+" Meeting Assist stopped because no transcription engine is available.");stopSession();}
      else setError(message);
    }
  };

  const handleChunk=(segment,session)=>{
    const utterance=getUtterance(segment.utteranceId);
    utterance.chain=utterance.chain.then(()=>{
      if(sessionRef.current!==session)return;
      const samples16k=resampleFloat32(segment.audio,segment.sampleRate,16000);
      const features=analyzeVoice(samples16k,16000);
      const chunk={index:segment.index,text:"",done:false,match:null,samples16k};
      if(!isLikelySpeech(features)){
        // Keyboard clatter, a door, a cough: keep the turn's bookkeeping but
        // never send it to the transcription model.
        chunk.done=true;utterance.current.chunks.push(chunk);finishLine(utterance.current,session);return;
      }
      chunk.match=voiceProfileRef.current&&sourceRef.current==="microphone"?voiceSimilarity(voiceProfileRef.current,features):null;
      const current=utterance.current;
      if(current.chunks.length&&isVoiceChange(average(current.chunks.map(item=>item.match)),chunk.match)){
        // The other party stopped and the user began answering inside the
        // two-second window: close the question now and start a new line.
        closeLine(current,session);
        utterance.current=newLineRecord();utterance.lines.push(utterance.current);
      }
      const record=utterance.current;record.chunks.push(chunk);
      transcribeChunk(record,chunk,session);
    }).catch(()=>{});
  };

  const handleUtteranceEnd=({utteranceId},session)=>{
    const utterance=utterancesRef.current.get(utteranceId);
    if(!utterance)return;
    utterance.chain=utterance.chain.then(()=>{utterance.ended=true;closeLine(utterance.current,session);}).catch(()=>{});
  };

  const stopSession=()=>{
    // Flush first so anything the other person just said is still answered.
    try{segmenterRef.current?.flush();}catch{}
    activeRef.current=false;setActive(false);setPaused(false);pausedRef.current=false;setLevel(0);updatePhase("idle");
    graphRef.current?.close?.();graphRef.current=null;
    stopStream(streamRef.current);streamRef.current=null;
    segmenterRef.current=null;
  };

  const startSession=async()=>{
    if(!canStart||starting||active)return;
    setError("");setNotice("");setAnswerNote("");setStarting(true);
    let stream=null;
    try{
      ensureAI?.();
      // Capture must be requested synchronously after the tap so the browser
      // still counts it as a user gesture; every slow step happens afterwards.
      if(source==="tab"){
        stream=await navigator.mediaDevices.getDisplayMedia(MEETING_DISPLAY_OPTIONS);
        const surface=stream.getVideoTracks()[0]?.getSettings?.().displaySurface;
        if(!isBrowserTabMeetingShare(stream)){
          stopStream(stream);
          throw new Error(surface==="browser"?"The selected tab did not provide audio. Enable “Share tab audio” and try again.":"Choose the meeting's browser tab (not a window or the entire screen) and enable “Share tab audio”.");
        }
        const audioOnly=buildRemoteMeetingAudioStream(stream);
        if(!audioOnly){stopStream(stream);throw new Error("The shared tab did not expose meeting audio. Choose the meeting tab and enable “Share tab audio”.");}
        streamRef.current=stream;
        stream.getAudioTracks()[0]?.addEventListener("ended",()=>stopSession(),{once:true});
        stream.getVideoTracks()[0]?.addEventListener("ended",()=>stopSession(),{once:true});
        stream=audioOnly;
      }else{
        // Echo cancellation is deliberately off: it would strip the other
        // person's voice whenever the call plays through this device's speakers,
        // which is exactly the voice Meeting Assist needs to hear.
        stream=await navigator.mediaDevices.getUserMedia(MICROPHONE_CONSTRAINTS);
        streamRef.current=stream;
        stream.getAudioTracks()[0]?.addEventListener("ended",()=>stopSession(),{once:true});
      }
      sessionRef.current+=1;const session=sessionRef.current;
      sourceRef.current=source;
      utterancesRef.current=new Map();waitingRef.current=[];
      attributionDirtyRef.current=false;attributionBusyRef.current=false;
      const graph=await openAudioGraph(stream);
      const segmenter=createSpeechSegmenter({
        sampleRate:graph.sampleRate,
        endSilenceMs:TURN_END_SILENCE_MS,
        onSegment:segment=>{if(!activeRef.current||sessionRef.current!==session)return;handleChunk(segment,session);},
        onUtteranceEnd:info=>{if(!activeRef.current||sessionRef.current!==session)return;handleUtteranceEnd(info,session);},
      });
      segmenterRef.current=segmenter;
      graph.start(frame=>{
        if(!activeRef.current||sessionRef.current!==session||pausedRef.current)return;
        segmenter.push(frame);
        updatePhase(segmenter.utteranceOpen?(segmenter.quietMs>=300?"waiting":"hearing"):"listening");
        const now=performance.now();
        if(now-levelTickRef.current>90){levelTickRef.current=now;setLevel(segmenter.level);}
      });
      graphRef.current=graph;
      activeRef.current=true;setActive(true);setSaved(false);updatePhase("listening");
      setNotice(source==="tab"?"Listening to the shared meeting tab only. Your microphone is not open.":`Listening through the microphone. Ghosty waits until ${scene.other} pauses for two seconds, then prepares answers${voiceProfile?", using your voice sample to skip your own words":""}.`);
    }catch(startError){
      stopStream(stream);stopStream(streamRef.current);streamRef.current=null;
      activeRef.current=false;setActive(false);
      if(startError?.name==="NotAllowedError")setError(source==="tab"?"Sharing was cancelled. Nothing was recorded.":"Microphone access was blocked. Allow the microphone for this site and try again.");
      else if(startError?.name==="NotFoundError")setError("No microphone was found on this device.");
      else setError(startError?.message||"Meeting Assist could not start.");
    }finally{setStarting(false);}
  };

  // Pausing is itself a signal that the other person finished: the open turn
  // is flushed immediately so its answers arrive while the user is talking.
  const togglePause=()=>{
    const next=!pausedRef.current;
    if(next){try{segmenterRef.current?.flush();}catch{}}
    pausedRef.current=next;setPaused(next);
    if(next){setLevel(0);updatePhase("paused");}
    else{setAnswerNote("");updatePhase("listening");}
  };

  const recordVoiceSample=async()=>{
    if(sampling||active||!canUseMicrophone)return;
    setError("");
    let stream=null;
    try{
      stream=await navigator.mediaDevices.getUserMedia(MICROPHONE_CONSTRAINTS);
      const chunks=[];
      const graph=await openAudioGraph(stream);const rate=graph.sampleRate;
      sampleRef.current=graph;graph.start(frame=>chunks.push(frame));
      for(let remaining=VOICE_SAMPLE_SECONDS;remaining>0;remaining-=1){setSampling(remaining);await wait(1000);}
      graph.close();sampleRef.current=null;stopStream(stream);stream=null;
      const total=chunks.reduce((sum,chunk)=>sum+chunk.length,0);const audio=new Float32Array(total);let offset=0;for(const chunk of chunks){audio.set(chunk,offset);offset+=chunk.length;}
      const profile=buildVoiceProfile(analyzeVoice(audio,rate));
      if(!profile)throw new Error("Ghosty could not hear you clearly. Move closer to the microphone and read the sentence at normal volume.");
      storeVoiceProfile(email,profile);setVoiceProfile(profile);setNotice("Voice sample saved on this device. Ghosty uses it only to tell your voice apart from the other speaker.");
    }catch(sampleError){
      sampleRef.current?.close?.();sampleRef.current=null;stopStream(stream);
      setError(sampleError?.name==="NotAllowedError"?"Microphone access was blocked. Allow the microphone for this site and try again.":(sampleError?.message||"The voice sample could not be recorded."));
    }finally{setSampling(0);}
  };

  const removeVoiceSample=()=>{storeVoiceProfile(email,null);setVoiceProfile(null);};
  const chooseLanguage=value=>{setLanguage(value);storeLanguage(email,value);};

  const clearSession=()=>{sessionRef.current+=1;utterancesRef.current=new Map();setLinesState([]);setAnswer(null);setAnswerNote("");setError("");setNotice("");setSaved(false);setCopiedIndex(-1);};

  const saveSession=()=>{
    if(!lines.length||!user)return;
    save({title:`${scene.label} · ${new Date().toLocaleDateString()}`,input:context||`${scene.label} via ${source==="tab"?"shared meeting tab":"microphone"}`,output:meetingSessionAsText({lines,answer,situation})});
    setSaved(true);
  };

  const copyOption=async(option,index)=>{
    try{await (overlayWindowRef.current?.navigator?.clipboard||navigator.clipboard).writeText(option);setCopiedIndex(index);setTimeout(()=>setCopiedIndex(current=>current===index?-1:current),1800);}catch{setError("Copy is not available here. Select the text and copy it manually.");}
  };

  const openMeetingOverlay=async()=>{
    if(!canUseOverlay){setError("The floating answer panel needs current desktop Chrome or Edge. Keep this screen beside the meeting instead.");return;}
    if(overlayWindowRef.current&&!overlayWindowRef.current.closed){overlayWindowRef.current.focus();return;}
    try{
      const pipWindow=await window.documentPictureInPicture.requestWindow({width:400,height:560});
      pipWindow.document.title="Ghosty Meeting Answers";
      Object.assign(pipWindow.document.body.style,{margin:"0",background:"#05070b",color:"#fff",fontFamily:"Arial, sans-serif",overflow:"hidden"});
      overlayWindowRef.current=pipWindow;setOverlayWindow(pipWindow);
      pipWindow.addEventListener("pagehide",()=>{overlayWindowRef.current=null;setOverlayWindow(null);},{once:true});
    }catch(overlayError){if(overlayError?.name!=="NotAllowedError")setError("The floating answer panel could not open. Try again from this screen.");}
  };

  const processing=transcribing>0;
  const otherName=speakerLabel("other",situation);
  const statusText=!active
    ?(processing||thinking?"Finishing the last answer":"Not listening")
    :paused?"Paused while you speak"
    :thinking?"Preparing answers"
    :phase==="hearing"?(source==="tab"?`${otherName} is talking…`:"Hearing speech…")
    :phase==="waiting"?"Waiting for the speaker to finish…"
    :processing?"Transcribing"
    :"Listening";

  const pauseButton=(dark=false)=><button type="button" onClick={togglePause} aria-pressed={paused} style={{minHeight:46,borderRadius:10,border:`1px solid ${paused?C.yellow:dark?"rgba(255,255,255,0.22)":C.border}`,background:paused?"rgba(245,200,66,0.14)":dark?"rgba(255,255,255,0.06)":C.surface,color:paused?C.yellowText:dark?"#fff":C.text,fontFamily:"inherit",fontSize:13,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%"}}><GwmIcon name={paused?"mic":"eyeOff"} size={16}/>{paused?"Resume listening":"I'm speaking · pause"}</button>;

  const answerPanel=(dark=false,compact=false)=><div style={{display:"grid",gap:9}}>
    {thinking&&<div role="status" style={{fontSize:11.5,fontWeight:800,color:dark?"#f9a8d4":C.magentaText,display:"flex",alignItems:"center",gap:6}}><span style={{width:7,height:7,borderRadius:"50%",background:C.magenta,boxShadow:`0 0 10px ${C.magenta}`}}/>Preparing three answers…</div>}
    {answer?.heard&&<div style={{padding:compact?"9px 11px":"11px 12px",borderRadius:10,borderLeft:`3px solid ${C.magenta}`,background:dark?"rgba(255,255,255,0.05)":C.surface,color:dark?"#dbeafe":C.text,fontSize:compact?12.5:13.5,lineHeight:1.55}}><span style={{display:"block",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:dark?"#f9a8d4":C.magentaText,fontWeight:900,marginBottom:4}}>{otherName} said</span>{answer.heard}</div>}
    {answer?.options?.length?answer.options.map((option,index)=><OptionCard key={`${answer.at}-${index}`} option={option} index={index} accent={dark?"#f9a8d4":C.magentaText} dark={dark} copied={copiedIndex===index} onCopy={()=>copyOption(option,index)} compact={compact}/>):<div style={{padding:compact?"14px 12px":"18px 14px",borderRadius:11,border:`1px dashed ${dark?"rgba(255,255,255,0.2)":C.border}`,color:dark?"#8eacc4":C.muted,fontSize:12.5,lineHeight:1.6,textAlign:"center"}}>{active?`Three answer options appear here about five seconds after ${scene.other} stops talking.`:"Start listening and Ghosty will place three copy-ready answers here."}</div>}
    {answerNote&&!thinking&&<div role="status" style={{fontSize:11.5,color:dark?"#8eacc4":C.muted,lineHeight:1.5}}>{answerNote}</div>}
  </div>;

  return(
    <div>
      <Card style={{marginBottom:14,background:`linear-gradient(145deg,${C.magentaSoft},${C.card})`,border:"1px solid rgba(244,114,182,0.3)"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{width:38,height:38,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",background:C.magentaSoft,color:C.magentaText,flexShrink:0}}><GwmIcon name="meeting" size={21}/></span><div><div style={{fontSize:14,fontWeight:900,color:C.text}}>Hear the other side. Answer with confidence.</div><div style={{fontSize:12.5,color:C.muted,lineHeight:1.6,marginTop:3}}>Ghosty listens to the whole question, waits two seconds after the speaker finishes, works out who was talking, and writes three answers you can say next. Your own words are recognised and never turned into suggestions.</div></div></div>
      </Card>

      <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Situation</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:13}}>{MEETING_SITUATIONS.map(item=><button key={item.id} type="button" onClick={()=>setSituation(item.id)} disabled={active} aria-pressed={situation===item.id} style={{minHeight:42,padding:"8px 12px",borderRadius:999,border:`1px solid ${situation===item.id?C.magenta:C.border}`,background:situation===item.id?C.magentaSoft:C.surface,color:situation===item.id?C.magentaText:C.muted,fontFamily:"inherit",fontSize:12.5,fontWeight:800,cursor:active?"default":"pointer",display:"inline-flex",alignItems:"center",gap:6}}><GwmIcon name={item.icon} size={14}/>{item.label}</button>)}</div>

      <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Audio source</div>
      <div className="studio-option-grid" style={{marginBottom:13}}>
        {[
          {id:"microphone",icon:"mic",title:"Microphone",desc:canUseMicrophone?"Hears the room or your speakers. Works on phones, in person, and with any meeting app.":"This browser cannot open a microphone.",available:canUseMicrophone},
          {id:"tab",icon:"meeting",title:"Meeting tab audio",desc:canShareTab?"Desktop Chrome or Edge. Captures only the remote voices from a Meet, Teams, or Zoom tab.":"Needs desktop Chrome or Edge with a browser-tab meeting.",available:canShareTab},
        ].map(item=><button key={item.id} type="button" disabled={active||!item.available} aria-pressed={source===item.id} onClick={()=>setSource(item.id)} style={{minHeight:74,padding:"10px 11px",borderRadius:10,border:`1px solid ${source===item.id?C.magenta:C.border}`,background:source===item.id?C.magentaSoft:C.surface,color:C.text,fontFamily:"inherit",textAlign:"left",display:"flex",gap:9,alignItems:"flex-start",cursor:active||!item.available?"default":"pointer",opacity:item.available?1:0.55}}><span style={{width:30,height:30,borderRadius:9,display:"grid",placeItems:"center",background:source===item.id?"rgba(244,114,182,0.18)":C.card,color:source===item.id?C.magentaText:C.muted,flexShrink:0}}><GwmIcon name={item.icon} size={16}/></span><span><span style={{display:"block",fontSize:13,fontWeight:850,color:source===item.id?C.magentaText:C.text}}>{item.title}{item.id==="microphone"&&<span style={{marginLeft:6,fontSize:9.5,fontWeight:900,letterSpacing:".1em",color:C.greenText}}>RECOMMENDED</span>}</span><span style={{display:"block",fontSize:11.5,color:C.muted,lineHeight:1.45,marginTop:3}}>{item.desc}</span></span></button>)}
      </div>

      <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"9px 11px",marginBottom:13,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface}}>
        <span style={{minWidth:0}}><span style={{display:"block",fontSize:12.5,fontWeight:850,color:C.text}}>Conversation language</span><span style={{display:"block",fontSize:11.5,color:C.muted,lineHeight:1.45,marginTop:2}}>Fixing the language makes short sentences transcribe more accurately. Leave on auto for mixed-language calls.</span></span>
        <select aria-label="Conversation language" value={language} disabled={active} onChange={event=>chooseLanguage(event.target.value)} style={{minHeight:36,padding:"6px 10px",borderRadius:8,border:`1px solid ${language?C.magenta:C.border}`,background:C.card,color:C.text,fontFamily:"inherit",fontSize:12.5,fontWeight:700,flexShrink:0}}>{MEETING_LANGUAGES.map(item=><option key={item.value||"auto"} value={item.value}>{item.label}</option>)}</select>
      </label>

      {source==="microphone"&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 11px",marginBottom:13,borderRadius:10,border:`1px solid ${voiceProfile?"rgba(61,219,164,0.32)":C.border}`,background:voiceProfile?"rgba(61,219,164,0.07)":C.surface}}>
        <div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:850,color:voiceProfile?C.greenText:C.text}}>{sampling?`Read the line below aloud… ${sampling}s`:voiceProfile?"Your voice sample is ready":"Teach Ghosty your voice (optional)"}</div><div style={{fontSize:11.5,color:C.muted,lineHeight:1.45,marginTop:2}}>{sampling?<em style={{color:C.text}}>“{VOICE_SAMPLE_LINE}”</em>:voiceProfile?"Stored only on this device. Helps Ghosty tell your voice apart from the other speaker; the conversation itself is still the main signal.":"A six-second sample helps Ghosty recognise when you are the one speaking, so your answers are never turned into suggestions."}</div></div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <button type="button" onClick={recordVoiceSample} disabled={!!sampling||active||!canUseMicrophone} style={{minHeight:36,padding:"7px 10px",borderRadius:8,border:`1px solid ${voiceProfile?C.border:C.magenta}`,background:voiceProfile?C.card:C.magentaSoft,color:voiceProfile?C.muted:C.magentaText,fontFamily:"inherit",fontSize:11.5,fontWeight:800,cursor:sampling||active?"default":"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:5}}><GwmIcon name="mic" size={13}/>{sampling?"Recording":voiceProfile?"Re-record":"Record 6 s"}</button>
          {voiceProfile&&!sampling&&<button type="button" onClick={removeVoiceSample} disabled={active} aria-label="Remove voice sample" style={{width:36,height:36,borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.muted,display:"grid",placeItems:"center",cursor:active?"default":"pointer"}}><GwmIcon name="trash" size={13}/></button>}
        </div>
      </div>}

      <FArea label="About you (recommended)" placeholder={situation==="interview"?"Role you're applying for, company, your experience and strengths, projects you can talk about…":"Your role, the goal of this conversation, names, facts Ghosty should use…"} value={context} onChange={event=>setContext(event.target.value)} rows={3}/>
      <button type="button" role="checkbox" aria-checked={consent} onClick={()=>!active&&setConsent(!consent)} style={{width:"100%",display:"flex",alignItems:"flex-start",gap:10,padding:"11px 12px",marginBottom:12,borderRadius:9,border:`1px solid ${consent?C.magenta:C.border}`,background:consent?C.magentaSoft:C.surface,color:consent?C.text:C.muted,textAlign:"left",fontFamily:"inherit",fontSize:12.5,lineHeight:1.55,cursor:active?"default":"pointer"}}><span style={{width:18,height:18,borderRadius:5,border:`2px solid ${consent?C.magenta:C.border}`,background:consent?C.magenta:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{consent&&<GwmIcon name="check" size={12} color="#071018" strokeWidth={2.5}/>}</span><span>I have permission to capture this conversation and will follow the meeting platform, workplace, and local recording rules.</span></button>

      {!active
        ?<PriBtn onClick={startSession} loading={starting} disabled={!canStart||starting} variant="violet"><IconLabel name={source==="tab"?"meeting":"mic"}>{source==="tab"?"Start with meeting tab audio":"Start listening"}</IconLabel></PriBtn>
        :<div style={{display:"grid",gap:8}}>{pauseButton(false)}<button type="button" onClick={stopSession} style={{width:"100%",minHeight:46,borderRadius:9,border:`1px solid ${C.red}`,background:"rgba(240,107,107,0.1)",color:C.redText,fontFamily:"inherit",fontSize:14,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><GwmIcon name="stop" size={16}/>Stop listening</button></div>}
      <button type="button" onClick={openMeetingOverlay} disabled={!canUseOverlay} title={canUseOverlay?"Open an always-on-top answer panel over Meet, Zoom, or Teams.":"Requires current desktop Chrome or Edge."} style={{width:"100%",minHeight:42,marginTop:8,borderRadius:9,border:`1px solid ${canUseOverlay?C.magenta:C.border}`,background:canUseOverlay?C.magentaSoft:C.surface,color:canUseOverlay?C.magentaText:C.muted,fontFamily:"inherit",fontSize:12.5,fontWeight:850,cursor:canUseOverlay?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:7,opacity:canUseOverlay?1:0.65}}><GwmIcon name="ghost" size={16}/>{overlayWindow?"Floating answer panel is open":"Open floating answer panel"}</button>
      <div style={{fontSize:11.5,color:C.muted,textAlign:"center",lineHeight:1.55,marginTop:8}}>Nothing is captured until you press Start. {source==="tab"?"Choose the meeting tab and enable its audio; the microphone stays closed.":"Tap “I'm speaking” when you start answering: it skips your words and prepares answers for the question straight away."}</div>

      {notice&&<div role="status" style={{marginTop:10,padding:"10px 12px",background:"rgba(61,219,164,0.07)",border:"1px solid rgba(61,219,164,0.24)",borderRadius:8,fontSize:12.5,color:C.greenText,lineHeight:1.55,display:"flex",gap:8,alignItems:"flex-start"}}><GwmIcon name="info" size={15} color={C.greenText} style={{marginTop:2,flexShrink:0}}/><span>{notice}{engine==="local"&&engineProgress?` (${engineProgress})`:""}</span></div>}
      {error&&<ErrBox msg={error}/>}

      {(active||processing||thinking||lines.length>0||answer)&&<Card style={{marginTop:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:800,color:active?(paused?C.yellowText:C.greenText):C.muted}}><span style={{width:8,height:8,borderRadius:"50%",background:active?(paused?C.yellow:C.green):"rgba(142,172,196,0.5)",boxShadow:active&&!paused?`0 0 12px ${C.green}`:"none"}}/>{statusText}<span style={{fontSize:10.5,fontWeight:700,color:C.muted}}>· {engine==="local"?"on-device":"cloud"} transcription</span></div>
          <LevelMeter level={level} active={active} paused={paused}/>
        </div>
        <div style={{fontSize:11,color:C.magentaText,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,fontWeight:900}}>Answer options</div>
        {answerPanel(false,false)}
        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",margin:"14px 0 6px"}}>Live transcript</div>
        <div aria-live="polite" style={{maxHeight:260,overflowY:"auto",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 11px",display:"grid",gap:6}}>
          {lines.length===0&&<div style={{fontSize:13,color:C.muted,lineHeight:1.6,padding:"6px 0"}}>{active?(paused?"Paused. Ghosty ignores everything until you resume.":"Waiting for someone to speak…"):"The conversation appears here with each speaker labelled."}</div>}
          {lines.map(line=>{const you=line.speaker==="you";const pending=!line.reviewed;return <div key={line.id} style={{display:"grid",gridTemplateColumns:"auto minmax(0,1fr)",gap:9,alignItems:"start",opacity:you?0.62:1}}><span style={{minWidth:74,marginTop:2,padding:"2px 7px",borderRadius:999,fontSize:9.5,fontWeight:900,letterSpacing:".08em",textTransform:"uppercase",textAlign:"center",background:pending?"rgba(142,172,196,0.14)":you?"rgba(245,200,66,0.14)":line.speaker==="other"?C.magentaSoft:"rgba(142,172,196,0.14)",color:pending?C.muted:you?C.yellowText:line.speaker==="other"?C.magentaText:C.muted}}>{pending?(line.complete?"heard":"hearing"):speakerLabel(line.speaker,situation)}</span><span style={{fontSize:13.5,lineHeight:1.6,color:you?C.muted:C.text,fontStyle:line.complete?"normal":"italic"}}>{line.text}{line.complete?"":" …"}</span></div>;})}
        </div>
        {lines.length>0&&<div style={{display:"flex",gap:8,marginTop:11,flexWrap:"wrap"}}><button type="button" onClick={saveSession} disabled={!user} style={{padding:"7px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:saved?C.greenText:C.muted,fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><GwmIcon name={saved?"check":"save"} size={14}/>{saved?"Saved to History":"Save session"}</button>{!active&&<button type="button" onClick={clearSession} style={{padding:"7px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Clear</button>}</div>}
      </Card>}

      {overlayWindow&&createPortal(<div style={{height:"100vh",boxSizing:"border-box",padding:14,display:"flex",flexDirection:"column",gap:10,background:"radial-gradient(circle at 50% 0%,rgba(244,114,182,0.18),transparent 42%),#05070b",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:34,height:34,borderRadius:11,background:"rgba(244,114,182,0.14)",color:"#f9a8d4",display:"flex",alignItems:"center",justifyContent:"center"}}><GwmIcon name="ghost" size={19}/></span><div><div style={{fontSize:14,fontWeight:900}}>Ghosty Meeting Answers</div><div style={{fontSize:10.5,color:active?(paused?"#fcd34d":"#6ee7b7"):"#93a4b8",marginTop:2}}>{statusText}</div></div></div><button type="button" aria-label="Close floating answer panel" onClick={()=>overlayWindow.close()} style={{width:30,height:30,borderRadius:9,border:"1px solid #243044",background:"#0b111b",color:"#a8bad0",cursor:"pointer",fontSize:17}}>×</button></div>
        <div style={{flex:1,minHeight:0,overflowY:"auto"}}>{answerPanel(true,true)}</div>
        {active&&pauseButton(true)}
        <div style={{padding:"8px 10px",borderRadius:10,border:"1px solid #1c293b",background:"rgba(8,13,20,0.94)",maxHeight:96,overflowY:"auto"}}><div style={{fontSize:9.5,letterSpacing:"0.12em",textTransform:"uppercase",color:"#8eacc4",marginBottom:5}}>Latest lines</div>{lines.slice(-4).map(line=><div key={line.id} style={{fontSize:11.5,lineHeight:1.5,color:line.speaker==="you"?"#8eacc4":"#dbeafe"}}><b style={{color:line.speaker==="other"?"#f9a8d4":"#8eacc4"}}>{line.reviewed?speakerLabel(line.speaker,situation):"…"}:</b> {line.text}</div>)}{!lines.length&&<div style={{fontSize:11.5,color:"#71859a"}}>Waiting for speech…</div>}</div>
      </div>,overlayWindow.document.body)}
    </div>
  );
}
