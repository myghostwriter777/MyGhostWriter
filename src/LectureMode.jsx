import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeVoice, createSpeechSegmenter } from "./meetingAudio";
import { cleanMeetingTranscriptSegment, isUsefulMeetingTranscript } from "./meetingCapture";
import { createMeetingTaskQueue } from "./meetingTaskQueue";
import { createMeetingTranscriber, transcribeOnServer } from "./meetingTranscriber";
import { prepareLocalWhisper, transcribeLocalAudio } from "./localWhisper";
import { MEETING_LANGUAGES } from "./meetingAssist";
import { openLectureCapture } from "./lectureAudio";
import { createLectureSpeakerTracker, downloadLectureBlob, lectureNotesPrompt, lectureQuestionPrompt, lectureSourceFiles, lectureTime, lectureTranscript } from "./lectureSession";
import { plainWritingText } from "./plainWritingText";

const panel={padding:18,border:"1px solid var(--gwm-border)",borderRadius:14,background:"var(--gwm-card)",marginBottom:16};
const field={width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:"1px solid var(--gwm-border)",background:"var(--gwm-surface)",color:"var(--gwm-text)",fontFamily:"inherit",fontSize:14,lineHeight:1.6};
const row={display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"};
const muted={color:"var(--gwm-muted)",fontSize:12,lineHeight:1.6};
function Button({children,primary=false,...props}){return <button type="button" {...props} style={{minHeight:42,padding:"9px 14px",borderRadius:8,border:`1px solid ${primary?"#79BAEC":"var(--gwm-border)"}`,background:primary?"rgba(121,186,236,.14)":"var(--gwm-surface)",color:"var(--gwm-text)",fontFamily:"inherit",fontWeight:750,cursor:props.disabled?"not-allowed":"pointer",opacity:props.disabled?.5:1}}>{children}</button>;}

const TranscriptSegment=memo(function TranscriptSegment({segment,index,onEdit}){
  return <div style={{borderTop:"1px solid var(--gwm-border)",paddingTop:12,marginTop:12}}>
    <div style={{...row,marginBottom:7}}><span style={muted}>~{lectureTime(segment.at)}</span><input aria-label={`Speaker for segment ${index+1}`} value={segment.speaker} maxLength={60} onChange={event=>onEdit(segment.id,"speaker",event.target.value)} style={{...field,width:180,padding:"5px 9px"}}/><span style={muted}>{segment.status==="pending"?"Transcribing…":segment.status==="failed"?"Transcription failed — retry available":segment.status==="empty"?"No clear speech detected":""}</span></div>
    {segment.status==="failed"&&<div style={muted}>{segment.error}</div>}
    <textarea aria-label={`Transcript segment ${index+1}`} value={segment.text} placeholder={segment.status==="pending"?"Waiting for transcription…":"Edit or add the words you heard"} disabled={segment.status==="pending"} onChange={event=>onEdit(segment.id,"text",event.target.value)} rows={2} style={{...field,resize:"vertical"}}/>
  </div>;
});

export default function LectureMode({request,ensureAI,user,save}){
  const [title,setTitle]=useState("");
  const [language,setLanguage]=useState("");
  const [status,setStatus]=useState("idle");
  const [seconds,setSeconds]=useState(0);
  const [segments,setSegments]=useState([]);
  const [pending,setPending]=useState(0);
  const [recording,setRecording]=useState(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [notes,setNotes]=useState("");
  const [question,setQuestion]=useState("");
  const [answers,setAnswers]=useState([]);
  const [thinking,setThinking]=useState("");
  const [saved,setSaved]=useState(false);
  const [visible,setVisible]=useState(40);
  const [grouped,setGrouped]=useState(true);
  const [recordingUrl,setRecordingUrl]=useState("");
  const mounted=useRef(true),sessionRef=useRef(null),segmentsRef=useRef([]),aiRef=useRef(null);
  const setTranscript=useCallback(update=>{
    const next=typeof update==="function"?update(segmentsRef.current):update;
    segmentsRef.current=next;setSegments(next);setSaved(false);
  },[]);
  useEffect(()=>{mounted.current=true;return()=>{
    mounted.current=false;aiRef.current?.abort();
    const session=sessionRef.current;sessionRef.current=null;
    session?.controller.abort();session?.queue.cancel();session?.capture?.stop();session?.audio.clear();
  };},[]);
  useEffect(()=>{
    if(!recording||typeof URL.createObjectURL!=="function"){setRecordingUrl("");return;}
    const url=URL.createObjectURL(recording);setRecordingUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[recording]);
  const editSegment=useCallback((id,key,value)=>{
    if(key==="text")sessionRef.current?.audio.delete(id);
    setTranscript(lines=>lines.map(line=>line.id===id?{...line,[key]:value,...(key==="text"?{status:"ready"}:{})}:line));
  },[setTranscript]);
  const current=session=>mounted.current&&sessionRef.current===session;

  const pauseSession=session=>{
    if(!current(session)||session.phase!=="recording")return;
    session.phase="paused";session.capture?.pause();session.segmenter?.flush();setStatus("paused");
  };
  const stopSession=async session=>{
    if(!current(session)||!["recording","paused"].includes(session.phase))return;
    session.phase="stopping";setStatus("stopping");session.segmenter?.flush();
    try{const result=await session.capture.stop();if(current(session)){setRecording(result.blob);setSeconds(result.seconds);session.phase="stopped";setStatus("stopped");}}
    catch(captureError){if(current(session)){setError(captureError.message||"The recording could not be saved.");setStatus("stopped");}}
  };

  const transcribeSegment=(session,id)=>{
    const segment=session?.audio.get(id);if(!segment||!current(session))return;
    setTranscript(lines=>lines.map(line=>line.id===id?{...line,status:"pending",error:""}:line));
    session.queue.run(async signal=>{
      const text=cleanMeetingTranscriptSegment(await session.transcriber.transcribe(segment.audio,{sampleRate:segment.sampleRate,signal,language:session.language||undefined,prompt:session.title.slice(0,300)}));
      if(!current(session)||signal.aborted)return;
      session.audio.delete(id);
      setTranscript(lines=>lines.map(line=>line.id===id?{...line,text:isUsefulMeetingTranscript(text)?text:"",status:isUsefulMeetingTranscript(text)?"ready":"empty"}:line));
    }).catch(transcriptionError=>{
      if(!current(session)||transcriptionError?.name==="AbortError")return;
      setTranscript(lines=>lines.map(line=>line.id===id?{...line,status:"failed",error:transcriptionError.message||"Try this segment again."}:line));
      if(session.audio.size>=10){pauseSession(session);setNotice("Recording paused while transcription catches up. Retry failed segments, then resume.");}
    });
  };

  const start=async()=>{
    if(sessionRef.current)return;
    const session={controller:new AbortController(),audio:new Map(),phase:"starting",id:0,elapsed:0,lastTick:-1,language,title,speakers:createLectureSpeakerTracker()};
    sessionRef.current=session;setStatus("starting");setError("");setNotice("");
    session.queue=createMeetingTaskQueue({concurrency:2,onPendingChange:count=>{if(current(session))setPending(count);}});
    session.transcriber=createMeetingTranscriber({server:transcribeOnServer,local:(samples,options)=>transcribeLocalAudio(samples,undefined,options),prepareLocal:()=>prepareLocalWhisper(),onModeChange:({mode})=>{if(current(session)&&mode==="local")setNotice("Using the on-device speech model. Its first use downloads the model; transcription may take longer.");}});
    try{
      session.capture=await openLectureCapture({signal:session.controller.signal,
        onFrame:(samples,sampleRate,elapsed)=>{
          if(!current(session)||session.phase!=="recording")return;
          session.elapsed=elapsed;
          const tick=Math.floor(elapsed);if(tick!==session.lastTick){session.lastTick=tick;setSeconds(elapsed);}
          if(!session.segmenter)session.segmenter=createSpeechSegmenter({sampleRate,maxChunkMs:10000,onSegment:segment=>{
            if(!current(session))return;
            const id=++session.id;
            session.audio.set(id,segment);
            const at=Math.max(0,session.elapsed-segment.durationMs/1000);
            const speaker=session.speakers.assign(analyzeVoice(segment.audio,segment.sampleRate));
            setTranscript(lines=>[...lines,{id,at,speaker,text:"",status:"pending"}]);
            transcribeSegment(session,id);
            if(session.audio.size>=10)Promise.resolve().then(()=>{if(current(session)&&session.audio.size>=10){pauseSession(session);setNotice("Recording paused while transcription catches up. Retry failed segments, then resume.");}});
          }});
          session.segmenter.push(samples);
        },
        onEnded:()=>{if(current(session)){setNotice("The microphone disconnected. Your captured audio has been kept.");stopSession(session);}},
        onLimit:()=>{if(current(session)){setNotice("This recording reached the session storage or duration limit. Download it before starting another lecture.");stopSession(session);}},
      });
      if(!current(session)||session.controller.signal.aborted){session.capture.stop();return;}
      session.phase="recording";setStatus("recording");
    }catch(captureError){
      if(!current(session))return;
      session.controller.abort();session.queue.cancel();sessionRef.current=null;setStatus("idle");
      if(captureError.name!=="AbortError")setError(captureError.name==="NotAllowedError"?"Microphone access was denied. Allow microphone access in your browser, then try again.":captureError.message||"Could not start recording.");
    }
  };
  const resume=async()=>{
    const session=sessionRef.current;if(!session||session.phase!=="paused")return;
    try{await session.capture.resume();if(current(session)&&session.phase==="paused"){session.phase="recording";setStatus("recording");setNotice("");}}
    catch(captureError){if(current(session))setError(captureError.message||"Could not resume the microphone.");}
  };
  const clear=()=>{
    const session=sessionRef.current;sessionRef.current=null;
    session?.controller.abort();session?.queue.cancel();session?.capture?.stop();session?.audio.clear();aiRef.current?.abort();aiRef.current=null;
    setStatus("idle");setSeconds(0);setPending(0);setRecording(null);setTranscript([]);setNotes("");setAnswers([]);setQuestion("");setThinking("");setError("");setNotice("");setVisible(40);setSaved(false);
  };
  const runAI=async kind=>{
    if(aiRef.current||!segmentsRef.current.some(line=>line.text.trim()))return;
    const asked=question.trim();if(kind==="answer"&&!asked)return;
    const controller=new AbortController();aiRef.current=controller;setThinking(kind);setError("");
    const source=lectureTranscript(segmentsRef.current);
    try{
      ensureAI?.();
      const prompt=kind==="notes"?lectureNotesPrompt(title):lectureQuestionPrompt({question:asked,history:answers});
      const result=plainWritingText(await request(prompt.system,prompt.user,kind==="notes"?6500:1800,lectureSourceFiles(source),user?.email,{mode:"lecture",signal:controller.signal,outputLanguage:"auto",timeoutMs:90000}));
      if(!mounted.current||controller.signal.aborted||aiRef.current!==controller)return;
      if(!result)throw new Error("No response was returned. Please try again.");
      if(kind==="notes")setNotes(result);
      else{setAnswers(history=>[...history,{question:asked,answer:result}]);setQuestion(draft=>draft.trim()===asked?"":draft);}
      setSaved(false);
    }catch(aiError){if(mounted.current&&!controller.signal.aborted)setError(aiError.message||"Could not generate a response. Try again.");}
    finally{if(mounted.current&&aiRef.current===controller){aiRef.current=null;setThinking("");}}
  };

  const transcript=useMemo(()=>lectureTranscript(segments),[segments]);
  const hasText=useMemo(()=>segments.some(segment=>segment.text.trim()),[segments]);
  const failed=useMemo(()=>segments.filter(segment=>segment.status==="failed"),[segments]);
  const content=useMemo(()=>`${title.trim()||"Lecture"}\n\n${notes?`Study notes\n\n${notes}\n\n`:""}Transcript\n\n${transcript}${answers.length?`\n\nQuestions and answers\n\n${answers.map(item=>`${item.question}\n\n${item.answer}`).join("\n\n")}`:""}`,[title,notes,transcript,answers]);
  const displayed=useMemo(()=>{
    const latest=segments.slice(-visible).map((segment,index)=>({segment,index:Math.max(0,segments.length-visible)+index}));
    if(!grouped)return [["",latest]];
    const groups=new Map();
    latest.forEach(item=>{const name=item.segment.speaker.trim()||"Unclear voice";if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);});
    return [...groups.entries()];
  },[segments,visible,grouped]);
  const download=()=>{try{downloadLectureBlob(new Blob([content],{type:"text/plain;charset=utf-8"}),"lecture-notes.txt");}catch(downloadError){setError(downloadError.message||"Could not download notes.");}};
  const saveNotes=()=>{try{
    const entry={title:title.trim()||"Lecture notes",input:`Recorded lecture · ${lectureTime(seconds)} · ${segments.length} transcript segments`,output:content};
    // Reserve room for history's id, mode, and timestamp metadata. The full
    // transcript appears once in output; duplicating it in input halves capacity.
    if(JSON.stringify(entry).length>349000)throw new Error("This lecture is too large for history. Use Download notes and transcript to keep the complete lecture.");
    save?.(entry);setSaved(true);
  }catch(saveError){setError(saveError.message||"Could not save lecture notes.");}};

  return <div style={{color:"var(--gwm-text)"}}>
    <section style={panel} aria-label="Lecture recording">
      <h2 style={{fontSize:21,margin:"0 0 6px"}}>Lecture</h2><p style={{...muted,margin:"0 0 16px"}}>Record a lecture, review who said what, and turn it into study notes.</p>
      <label style={{display:"block",marginBottom:12}}>Lecture title<input aria-label="Lecture title" value={title} maxLength={160} onChange={event=>{setTitle(event.target.value);setSaved(false);}} placeholder="e.g. Biology · Cell division" style={{...field,marginTop:6}}/></label>
      <div style={{...row,justifyContent:"space-between",marginBottom:14}}><label style={muted}>Spoken language <select aria-label="Lecture language" value={language} disabled={status!=="idle"} onChange={event=>setLanguage(event.target.value)} style={{...field,width:"auto",marginLeft:6}}>{MEETING_LANGUAGES.map(item=><option key={item.value||"auto"} value={item.value}>{item.label}</option>)}</select></label><span role="status" style={{fontWeight:750}}>{status==="recording"?"Recording":status==="paused"?"Paused":status==="starting"?"Opening microphone…":status==="stopping"?"Saving recording…":status==="stopped"?"Recorded":"Ready"} · {lectureTime(seconds)}</span></div>
      <div style={row}>
        {status==="idle"&&<Button primary onClick={start}>Start recording</Button>}
        {status==="recording"&&<Button onClick={()=>pauseSession(sessionRef.current)}>Pause recording</Button>}
        {status==="paused"&&<Button primary disabled={pending>0||sessionRef.current?.audio.size>=10} onClick={resume}>Resume recording</Button>}
        {["recording","paused"].includes(status)&&<Button onClick={()=>stopSession(sessionRef.current)}>Stop recording</Button>}
        {status==="starting"&&<Button onClick={clear}>Cancel microphone request</Button>}
        {status!=="idle"&&status!=="starting"&&<Button onClick={clear}>Clear lecture</Button>}
        {recording&&<Button onClick={()=>{try{const extension=recording.type.includes("wav")?"wav":recording.type.includes("ogg")?"ogg":recording.type.includes("mp4")?"m4a":"webm";downloadLectureBlob(recording,`lecture-recording.${extension}`);}catch(downloadError){setError(downloadError.message||"Could not download recording.");}}}>Download recording</Button>}
      </div>
      {recordingUrl&&<audio aria-label="Lecture recording playback" controls src={recordingUrl} style={{width:"100%",marginTop:14}}/>}
      <p style={{...muted,margin:"12px 0 0"}}>Keep this page open while recording. The recording stays in this session until downloaded; clearing or leaving removes it. Speech segments are sent for transcription.</p>
    </section>
    {notice&&<div role="status" style={{...panel,...muted}}>{notice}</div>}
    {error&&<div role="alert" style={{...panel,color:"var(--gwm-red-text)"}}>{error}</div>}
    <section style={panel} aria-label="Lecture transcript">
      <div style={{...row,justifyContent:"space-between"}}><h3 style={{margin:0}}>Transcript</h3><span style={muted}>{pending?`${pending} segment${pending===1?"":"s"} transcribing…`:`${segments.length} segments`}</span></div>
      <p style={muted}>Speaker labels are acoustic suggestions. Review and edit them; similar voices and overlapping speech may be grouped incorrectly. The audio download contains all voices together. Timestamps are approximate.</p>
      {!!segments.length&&<div role="group" aria-label="Transcript view" style={row}><Button aria-pressed={!grouped} onClick={()=>setGrouped(false)}>By time</Button><Button aria-pressed={grouped} onClick={()=>setGrouped(true)}>By speaker</Button></div>}
      {!segments.length&&<p style={muted}>Spoken words will appear here after a short pause.</p>}
      {failed.length>0&&<Button disabled={pending>0} onClick={()=>failed.forEach(segment=>transcribeSegment(sessionRef.current,segment.id))}>Retry failed segments ({failed.length})</Button>}
      {segments.length>visible&&<Button onClick={()=>setVisible(count=>count+40)}>Show earlier segments ({segments.length-visible})</Button>}
      {displayed.flatMap(([speaker,items])=>[...(speaker?[<h4 key={`speaker:${speaker}`}>{speaker}</h4>]:[]),...items.map(({segment,index})=><TranscriptSegment key={`segment:${segment.id}`} segment={segment} index={index} onEdit={editSegment}/>)])}
    </section>
    <section style={panel} aria-label="Lecture study notes">
      <div style={row}><Button primary disabled={!hasText||!!thinking} onClick={()=>runAI("notes")}>{thinking==="notes"?"Creating study notes…":notes?"Regenerate study notes":"Generate Study Notes"}</Button>{thinking&&<Button onClick={()=>{aiRef.current?.abort();aiRef.current=null;setThinking("");}}>Cancel generation</Button>}</div>
      <p style={muted}>Notes and answers use the transcript available when you click. Finish transcription and review corrections for complete notes.</p>
      {notes&&<><h3>Study notes</h3><textarea aria-label="Study notes" value={notes} disabled={thinking==="notes"} onChange={event=>{setNotes(event.target.value);setSaved(false);}} rows={16} style={{...field,resize:"vertical"}}/></>}
      {hasText&&<div style={{...row,marginTop:12}}><Button onClick={download}>Download notes and transcript</Button>{save&&<Button onClick={saveNotes} disabled={saved}>{saved?"Saved to history":"Save to history"}</Button>}</div>}
    </section>
    <section style={panel} aria-label="Ask about the lecture"><h3 style={{margin:"0 0 12px"}}>Ask about the lecture</h3>
      {answers.map((item,index)=><div key={index} style={{marginBottom:18,borderBottom:"1px solid var(--gwm-border)",paddingBottom:14}}><div style={{fontWeight:750,marginBottom:7}}>{item.question}</div><div style={{whiteSpace:"pre-wrap",lineHeight:1.75}}>{item.answer}</div></div>)}
      <label style={{display:"block"}}>Your question<textarea aria-label="Question about the lecture" value={question} maxLength={3000} onChange={event=>setQuestion(event.target.value)} rows={3} placeholder="Explain the main idea, or ask about something you missed…" style={{...field,margin:"7px 0 10px",resize:"vertical"}}/></label>
      <Button primary disabled={!hasText||!question.trim()||!!thinking} onClick={()=>runAI("answer")}>{thinking==="answer"?"Finding the answer…":"Ask AI"}</Button>
    </section>
  </div>;
}
