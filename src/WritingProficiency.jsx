import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CEFR_LEVELS, CEFR_DESCRIPTIONS, normalizeCefrLevel } from "./cefrWriting";

const WritingProficiencyContext=createContext(null);

function useLocalProficiency(defaultLevel){
  const [level,updateLevel]=useState(()=>normalizeCefrLevel(defaultLevel));
  const levelRef=useRef(level);
  const [pending,setPending]=useState(0);
  const pendingRef=useRef(0);
  const setLevel=useCallback(value=>{
    if(pendingRef.current)return;
    const nextLevel=normalizeCefrLevel(value);
    levelRef.current=nextLevel;updateLevel(nextLevel);
  },[]);
  // Live microphone callbacks can retain this function for an entire session.
  // Read the latest selection when a request starts, then pin that request to
  // its snapshot even if the callback was created before the selection changed.
  const runAtLevel=useCallback(async task=>{
    const requestLevel=levelRef.current;
    pendingRef.current+=1;setPending(pendingRef.current);
    try{return await task(requestLevel);}
    finally{pendingRef.current-=1;setPending(pendingRef.current);}
  },[]);
  return useMemo(()=>({level,setLevel,pending,runAtLevel}),[level,setLevel,pending,runAtLevel]);
}

export function useWritingProficiency(defaultLevel="B2"){
  const inherited=useContext(WritingProficiencyContext);
  const local=useLocalProficiency(defaultLevel);
  return inherited||local;
}

export function CefrLevelSelector({level,onChange,disabled=false}){
  return <div role="group" aria-label="English level (CEFR)" style={{marginBottom:16}}>
    <div style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--gwm-muted)",marginBottom:7}}>English level (CEFR)</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:5}}>
      {CEFR_LEVELS.map(value=><button key={value} type="button" aria-pressed={level===value} disabled={disabled} onClick={()=>onChange(value)} style={{minHeight:40,padding:"7px 2px",borderRadius:7,border:`1px solid ${level===value?"#79BAEC":"var(--gwm-border)"}`,background:level===value?"rgba(121,186,236,0.13)":"var(--gwm-surface)",color:level===value?"var(--gwm-text)":"var(--gwm-muted)",fontFamily:"inherit",fontSize:13,fontWeight:level===value?800:500,cursor:disabled?"wait":"pointer",opacity:disabled?0.65:1}}>{value}</button>)}
    </div>
    <div aria-live="polite" style={{fontSize:12,lineHeight:1.5,color:"var(--gwm-muted)",marginTop:6}}>{CEFR_DESCRIPTIONS[level]}</div>
    <div style={{fontSize:11,lineHeight:1.5,color:"var(--gwm-muted)",marginTop:3}}>Applies to your next writing and feedback. Existing results keep their original wording.</div>
  </div>;
}

export function WritingProficiencyProvider({children,defaultLevel="B2",showSelector=true}){
  const value=useLocalProficiency(defaultLevel);
  return <WritingProficiencyContext.Provider value={value}>
    {showSelector&&<CefrLevelSelector level={value.level} onChange={value.setLevel} disabled={value.pending>0}/>}
    {children}
  </WritingProficiencyContext.Provider>;
}
