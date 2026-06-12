import React, { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg: "#000000", surface: "#080d14", card: "#0c1220", border: "#162030",
  blue: "#79BAEC", blueGlow: "rgba(121,186,236,0.2)", accent: "#a8d4f5",
  accentSoft: "rgba(121,186,236,0.1)",
  violet: "#9b7fe8", violetSoft: "rgba(155,127,232,0.1)", violetGlow: "rgba(155,127,232,0.2)",
  text: "#ffffff", muted: "#8eacc4",
  green: "#3ddba4", red: "#f06b6b", yellow: "#f5c842",
};

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
input,button,select,textarea{font-family:inherit;outline:none;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:#162030;border-radius:2px;}
select{-webkit-appearance:none;appearance:none;}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
body{background:#000;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(121,186,236,0.4)}70%{box-shadow:0 0 0 8px rgba(121,186,236,0)}}
@keyframes slideUpModal{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes floatGhost{0%,100%{transform:translateY(0px)}50%{transform:translateY(-7px)}}
@keyframes blinkGhost{0%,88%,100%{transform:scaleY(1)}93%{transform:scaleY(0.08)}}
@keyframes wiggleGhost{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes inkDraw{0%{stroke-dashoffset:70;opacity:0}20%{opacity:1}100%{stroke-dashoffset:0;opacity:0.7}}
@keyframes hatTilt{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes shimmerDot{0%{opacity:0.4}50%{opacity:1}100%{opacity:0.4}}
.ghost-group{animation:floatGhost 3.2s ease-in-out infinite;}
.blink-group{animation:blinkGhost 4.5s ease-in-out infinite;transform-origin:200px 189px;}
.pen-group{animation:wiggleGhost 2.2s ease-in-out infinite;transform-origin:261px 175px;}
.hat-group{animation:hatTilt 3.2s ease-in-out infinite;transform-origin:200px 124px;}
.ink1{stroke-dasharray:70;animation:inkDraw 2s ease-in-out infinite;}
.ink2{stroke-dasharray:70;animation:inkDraw 2s ease-in-out 0.4s infinite;}
.ink3{stroke-dasharray:70;animation:inkDraw 2s ease-in-out 0.8s infinite;}
`;

const CONTACT_EMAIL = "myghosthehezjspt@gmail.com";

const MODES = [
  { id:"reply",    icon:"💬", label:"AI Replies", access:"free"        },
  { id:"email",    icon:"📧", label:"Email",       access:"free"        },
  { id:"grammar",  icon:"✅", label:"Grammar",     access:"free"        },
  { id:"essay",    icon:"✍️",  label:"Essay",       access:"pro+student" },
  { id:"academic", icon:"🎓", label:"Academic",    access:"student"     },
  { id:"cv",       icon:"💼", label:"CV/Resume",   access:"pro+student" },
  { id:"author",   icon:"📖", label:"Author",      access:"pro+student" },
  { id:"humanize", icon:"🧠", label:"Humanize",    access:"student"     },
  { id:"history",  icon:"🕐", label:"History",     access:"free"        },
];

const TONES = [
  {id:"chill",        emoji:"😌",label:"Chill",        desc:"laid-back, unbothered"},
  {id:"confident",    emoji:"💪",label:"Confident",    desc:"direct, assured"},
  {id:"flirty",       emoji:"😏",label:"Flirty",       desc:"playful, suggestive"},
  {id:"professional", emoji:"💼",label:"Professional", desc:"clean, polished"},
];

const LEVELS = ["A1","A2","B1","B2","C1","C2"];
const ESSAY_TYPES = ["Argumentative","Descriptive","Expository","Narrative","Compare & Contrast","Reflective"];
const GRAMMAR_STYLES = [
  {id:"formal",  icon:"🎩",label:"Formal",  desc:"Elevated, authoritative"},
  {id:"academic",icon:"📚",label:"Academic",desc:"Scholarly, precise"},
  {id:"casual",  icon:"🗣️",label:"Casual",  desc:"Natural, conversational"},
];
const EMAIL_TYPES = [
  {id:"professional", icon:"💼",label:"Professional",desc:"Work emails"},
  {id:"follow-up",    icon:"🔄",label:"Follow-up",   desc:"Check-ins"},
  {id:"apology",      icon:"🙏",label:"Apology",     desc:"Make it right"},
  {id:"request",      icon:"📋",label:"Request",     desc:"Ask for something"},
  {id:"cold-outreach",icon:"🚀",label:"Cold Outreach",desc:"First contact"},
  {id:"thank-you",    icon:"🌟",label:"Thank You",   desc:"Gratitude"},
];
const FICTION_GENRES = [
  {id:"fantasy",   icon:"🧙",label:"Fantasy",    desc:"Magic, worlds"},
  {id:"sci-fi",    icon:"🚀",label:"Sci-Fi",     desc:"Tech, space"},
  {id:"romance",   icon:"💕",label:"Romance",    desc:"Love, tension"},
  {id:"thriller",  icon:"🔪",label:"Thriller",   desc:"Suspense, twists"},
  {id:"mystery",   icon:"🔍",label:"Mystery",    desc:"Clues, reveals"},
  {id:"historical",icon:"⚔️", label:"Historical", desc:"Past eras"},
  {id:"literary",  icon:"🌿",label:"Literary",   desc:"Character-driven"},
  {id:"ya",        icon:"✨",label:"Young Adult",desc:"Teen voices"},
];
const NONFICTION_GENRES = [
  {id:"memoir",  icon:"📔",label:"Memoir",        desc:"Personal stories"},
  {id:"selfhelp",icon:"💡",label:"Self-Help",     desc:"Growth, mindset"},
  {id:"essay-nf",icon:"🖊️", label:"Personal Essay",desc:"Opinion, voice"},
  {id:"travel",  icon:"🗺️", label:"Travel Writing",desc:"Places, journeys"},
];

const SOCIAL_PROVIDERS = [
  {id:"google",   label:"Continue with Google",   iconType:"google",   bg:"#fff",    color:"#111"},
  {id:"email",    label:"Continue with Email",    iconType:"email",    bg:C.surface, color:C.text, border:`1px solid ${C.border}`},
];

const TERMS_CONTENT = [
  {h:"1. Acceptance of Terms",b:"By creating an account and using GhostwriterMe, you agree to these Terms. If you disagree, do not use the Service."},
  {h:"2. Age Requirement",b:"You must be at least 13 years old. Users under 18 require parental or guardian consent."},
  {h:"3. User Responsibility",b:"All content generated is produced at your direction and under your sole responsibility. GhostwriterMe bears no liability for content users create or how it is used."},
  {h:"4. Academic Integrity",b:"Humanize My Writing is a writing improvement and learning tool. Users are solely responsible for complying with their institution's academic integrity policies."},
  {h:"5. Prohibited Uses",b:"Do not generate harmful, illegal, defamatory, or fraudulent content. Violation results in immediate account termination."},
  {h:"6. No Warranty",b:"AI-generated content is provided as-is without warranty. Verify all content before use."},
  {h:"7. Limitation of Liability",b:"GhostwriterMe shall not be liable for any damages arising from your use of the Service."},
  {h:"8. Subscriptions & Billing",b:"Subscriptions are billed as selected. 3-day free trials begin upon payment authorization — no charge until day 4. Cancel anytime."},
  {h:"9. Contact & Governing Law",b:"Questions? Email us at "+CONTACT_EMAIL+". These Terms are governed by the laws of Thailand."},
];

const HS = {
  key:(email,mode)=>"gwm2_"+email+"_"+mode,
  save:(email,mode,entry)=>{try{const k=HS.key(email,mode);const prev=HS.load(email,mode);localStorage.setItem(k,JSON.stringify([{...entry,id:Date.now(),ts:new Date().toISOString()},...prev].slice(0,50)));}catch(e){}},
  load:(email,mode)=>{try{const r=localStorage.getItem(HS.key(email,mode));return r?JSON.parse(r):[];}catch{return[];}},
  loadAll:(email)=>{const ms=["reply","email","essay","academic","cv","author","grammar","humanize"];return ms.flatMap(m=>HS.load(email,m).map(e=>({...e,mode:m}))).sort((a,b)=>new Date(b.ts)-new Date(a.ts));},
};

const hasSR=typeof window!=="undefined"&&("SpeechRecognition" in window||"webkitSpeechRecognition" in window);
const hasTTS=typeof window!=="undefined"&&"speechSynthesis" in window;

function useMic(onResult){
  const [active,setActive]=useState(false);const ref=useRef(null);
  const toggle=useCallback(()=>{
    if(!hasSR){alert("Voice input not supported. Use Chrome.");return;}
    if(active){ref.current?.stop();setActive(false);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const r=new SR();r.continuous=false;r.interimResults=false;r.lang="en-US";
    r.onresult=e=>onResult(e.results[0][0].transcript);
    r.onend=()=>setActive(false);r.onerror=()=>setActive(false);
    r.start();ref.current=r;setActive(true);
  },[active,onResult]);
  return{active,toggle};
}

const speak=(text)=>{if(!hasTTS)return;window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));};
const stopSpeak=()=>{if(hasTTS)window.speechSynthesis.cancel();};

async function callClaude(system,user,maxTokens=1500,imageData=null,imageType=null){
  let userContent;
  if(imageData&&imageType){
    const base64=imageData.split(",")[1];
    userContent=[{type:"image",source:{type:"base64",media_type:imageType,data:base64}},{type:"text",text:user}];
  }else{userContent=user;}
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:maxTokens,system,messages:[{role:"user",content:userContent}]})});
  if(!r.ok){const err=await r.json().catch(()=>({}));throw new Error(err?.error?.message||"API error "+r.status);}
  const d=await r.json();
  return d.content?.map(b=>b.text||"").join("")||"";
}

function ContactModal({onClose}){
  const [subject,setSubject]=useState("");const [message,setMessage]=useState("");const [sent,setSent]=useState(false);
  const handleSend=()=>{const sub=encodeURIComponent(subject||"GhostwriterMe — Support Request");const body=encodeURIComponent(message||"");window.location.href="mailto:"+CONTACT_EMAIL+"?subject="+sub+"&body="+body;setSent(true);};
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:480,background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 0 0",padding:"22px 18px 32px",animation:"slideUpModal 0.3s ease"}}>
        <div style={{width:32,height:3,borderRadius:2,background:C.border,margin:"0 auto 18px"}}/>
        {!sent?(
          <>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:18}}>
              <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✉️</div>
              <div><div style={{fontSize:15,fontWeight:900,color:"#fff"}}>Contact Us</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>We typically reply within 24 hours</div></div>
            </div>
            <div style={{background:C.accentSoft,border:"1px solid rgba(121,186,236,0.22)",borderRadius:8,padding:"9px 12px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div><div style={{fontSize:11,color:C.muted,marginBottom:2,letterSpacing:"0.05em"}}>OUR EMAIL</div><div style={{fontSize:13,fontWeight:700,color:C.blue}}>{CONTACT_EMAIL}</div></div>
              <button onClick={()=>navigator.clipboard.writeText(CONTACT_EMAIL)} style={{padding:"5px 10px",borderRadius:6,background:"transparent",border:"1px solid rgba(121,186,236,0.3)",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Copy</button>
            </div>
            <div style={{marginBottom:11}}><label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Subject</label><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Billing question..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div style={{marginBottom:16}}><label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Message</label><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} placeholder="Tell us what's on your mind..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,lineHeight:1.6,resize:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
              {["Billing","Bug report","Feature request","General question"].map(t=>(
                <button key={t} onClick={()=>setSubject(t)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${C.border}`,background:subject===t?C.accentSoft:"transparent",color:subject===t?C.blue:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{t}</button>
              ))}
            </div>
            <button onClick={handleSend} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 20px ${C.blueGlow}`,marginBottom:10}}>Open Email App →</button>
            <div style={{textAlign:"center",fontSize:12,color:C.muted}}>This will open your default email app with the message pre-filled.</div>
          </>
        ):(
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>📬</div>
            <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:6}}>Email App Opened!</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:20}}>Send the email from your mail app.<br/>We'll get back to you within 24 hours.</div>
            <div style={{background:C.accentSoft,border:"1px solid rgba(121,186,236,0.22)",borderRadius:8,padding:"10px 14px",marginBottom:18}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:2}}>Or email us directly at</div>
              <div style={{fontSize:13,fontWeight:700,color:C.blue}}>{CONTACT_EMAIL}</div>
            </div>
            <button onClick={onClose} style={{width:"100%",padding:"11px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

const Spin=({size=16,color="#fff"})=>(<span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.1)",borderTopColor:color,animation:"spin 0.7s linear infinite",flexShrink:0}}/>);

function SocialIcon({type}){
  if(type==="google")return <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;
  return <span style={{fontSize:16}}>✉️</span>;
}

const Card=({children,style:s,glow,glowColor})=>{const gc=glowColor||C.blue;return <div style={{background:C.card,border:`1px solid ${glow?gc+"55":C.border}`,borderRadius:12,padding:"16px",...(glow?{boxShadow:`0 0 20px ${gc}22`}:{}),...s}}>{children}</div>;};
const ErrBox=({msg})=><div style={{marginTop:10,padding:"10px 14px",background:"#1a0000",border:"1px solid #3a0808",borderRadius:8,fontSize:13,color:C.red}}>{msg}</div>;

function CopyBtn({text}){
  const [done,setDone]=useState(false);
  return <button onClick={()=>{navigator.clipboard.writeText(text);setDone(true);setTimeout(()=>setDone(false),2000);}} style={{padding:"6px 13px",borderRadius:6,background:done?"#0a2a18":"transparent",border:`1px solid ${done?C.green:C.border}`,color:done?C.green:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{done?"✓ Copied":"Copy"}</button>;
}

function ListenBtn({text}){
  const [on,setOn]=useState(false);
  return <button onClick={()=>{if(on){stopSpeak();setOn(false);}else{speak(text);setOn(true);}}} style={{padding:"6px 12px",borderRadius:6,background:on?C.accentSoft:"transparent",border:`1px solid ${on?C.blue:C.border}`,color:on?C.blue:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}}>{on?"⏹ Stop":"🔊 Listen"}</button>;
}

const OutputActions=({text})=>(<div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={text}/><ListenBtn text={text}/></div>);

function ImageInput({onImage,imageData,onClear}){
  const fileRef=useRef(null);const camRef=useRef(null);
  const handle=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>onImage(ev.target.result,f.type);r.readAsDataURL(f);};
  if(imageData)return(<div style={{marginBottom:12,position:"relative",display:"inline-block"}}><img src={imageData} alt="Attached" style={{maxWidth:"100%",maxHeight:160,borderRadius:8,border:`1px solid ${C.border}`,display:"block"}}/><button onClick={onClear} style={{position:"absolute",top:6,right:6,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button><div style={{fontSize:12,color:C.muted,marginTop:4}}>📎 Image attached — AI will read it</div></div>);
  return(<div style={{display:"flex",gap:7,marginBottom:12}}><input ref={fileRef} type="file" accept="image/*" onChange={handle} style={{display:"none"}}/><input ref={camRef} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:"none"}}/><button onClick={()=>fileRef.current?.click()} style={{padding:"7px 12px",borderRadius:7,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>🖼️ Add Image</button><button onClick={()=>camRef.current?.click()} style={{padding:"7px 12px",borderRadius:7,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>📷 Camera</button></div>);
}

function SaveAsImageBtn({text,title}){
  const [saving,setSaving]=useState(false);
  const save=()=>{setSaving(true);try{const canvas=document.createElement("canvas");const scale=2,width=800,padding=48,lineH=28,maxW=width-padding*2;const ctx0=canvas.getContext("2d");ctx0.font="16px Cabinet Grotesk,system-ui,sans-serif";const words=text.split(" "),lines=[];let cur="";for(const w of words){const test=cur?cur+" "+w:w;if(ctx0.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}else{cur=test;}}if(cur)lines.push(cur);const headerH=80,footerH=48,height=headerH+lines.length*lineH+padding+footerH;canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext("2d");ctx.scale(scale,scale);ctx.fillStyle="#0c1220";ctx.fillRect(0,0,width,height);const grad=ctx.createLinearGradient(0,0,width,0);grad.addColorStop(0,"#79BAEC");grad.addColorStop(1,"#a8d4f5");ctx.fillStyle=grad;ctx.fillRect(0,0,width,4);ctx.fillStyle="#ffffff";ctx.font="bold 18px Cabinet Grotesk,system-ui,sans-serif";ctx.fillText("👻 GhostwriterMe",padding,36);if(title){ctx.fillStyle="#79BAEC";ctx.font="12px Cabinet Grotesk,system-ui,sans-serif";ctx.fillText(title.toUpperCase(),padding,58);}ctx.strokeStyle="#162030";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padding,headerH-8);ctx.lineTo(width-padding,headerH-8);ctx.stroke();ctx.fillStyle="#ddeeff";ctx.font="16px Cabinet Grotesk,system-ui,sans-serif";lines.forEach((line,i)=>{ctx.fillText(line,padding,headerH+i*lineH+20);});ctx.fillStyle="#3d5a75";ctx.font="12px system-ui,sans-serif";ctx.fillText("ghostwriterme.com",padding,height-18);ctx.textAlign="right";ctx.fillText(new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),width-padding,height-18);const link=document.createElement("a");link.download="ghostwriterme-result.png";link.href=canvas.toDataURL("image/png");link.click();}catch(e){alert("Could not save image. Try Copy instead.");}setSaving(false);};
  return <button onClick={save} disabled={saving} style={{padding:"6px 13px",borderRadius:6,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>{saving?"Saving...":"🖼️ Save as Image"}</button>;
}

const Toggle=({on,set})=>(<div onClick={set} style={{width:36,height:20,borderRadius:10,background:on?C.blue:"#162030",position:"relative",transition:"background 0.2s",flexShrink:0,cursor:"pointer"}}><div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left 0.2s"}}/></div>);

function MicBtn({onResult,sm}){
  const {active,toggle}=useMic(onResult);const sz=sm?30:34;
  return <button onClick={toggle} style={{width:sz,height:sz,borderRadius:"50%",border:`1.5px solid ${active?C.blue:C.border}`,background:active?C.accentSoft:"transparent",color:active?C.blue:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,transition:"all 0.2s",animation:active?"micPulse 1.5s infinite":"none"}}>{active?"⏹":"🎤"}</button>;
}

function FInput({label,type="text",placeholder,value,onChange,error,icoL,icoR,onIcoR,voice}){
  const [f,setF]=useState(false);
  return(<div style={{marginBottom:12}}>{label&&<label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>{label}</label>}<div style={{position:"relative",display:"flex",alignItems:"center",gap:6}}><div style={{position:"relative",flex:1}}>{icoL&&<span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>{icoL}</span>}<input type={type} placeholder={placeholder} value={value} onChange={onChange} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",background:C.surface,border:`1px solid ${error?C.red:f?C.blue:C.border}`,borderRadius:8,padding:`10px ${icoR?40:12}px 10px ${icoL?38:12}px`,color:C.text,fontSize:14,transition:"border-color 0.2s"}}/>{icoR&&<span onClick={onIcoR} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:14}}>{icoR}</span>}</div>{voice&&<MicBtn onResult={t=>onChange({target:{value:value+(value?" ":"")+t}})} sm/>}</div>{error&&<div style={{fontSize:12,color:C.red,marginTop:3}}>{error}</div>}</div>);
}

function FArea({label,placeholder,value,onChange,rows=4,hint,voice}){
  const [f,setF]=useState(false);
  return(<div style={{marginBottom:12}}>{label&&<label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>{label}</label>}<div style={{position:"relative"}}><textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",background:C.surface,border:`1px solid ${f?C.blue:C.border}`,borderRadius:8,padding:"11px 13px",color:C.text,fontSize:14,lineHeight:1.7,resize:"vertical",fontFamily:"inherit",transition:"border-color 0.2s"}}/>{voice&&<div style={{position:"absolute",bottom:7,right:7}}><MicBtn onResult={t=>onChange({target:{value:value+(value?"\\n":"")+t}})} sm/></div>}</div>{hint&&<div style={{fontSize:12,color:C.muted,marginTop:3}}>{hint}</div>}</div>);
}

function FSelect({label,value,onChange,options}){
  return(<div style={{marginBottom:0}}>{label&&<label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>{label}</label>}<div style={{position:"relative"}}><select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 32px 10px 12px",color:C.text,fontSize:14,fontFamily:"inherit",cursor:"pointer"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select><span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted,fontSize:12}}>▾</span></div></div>);
}

const PriBtn=({children,onClick,loading,disabled,fullWidth=true,variant="blue"})=>{
  const bg=variant==="violet"?"linear-gradient(135deg,#9b7fe8,#c4b5fd)":loading||disabled?"#0c1220":`linear-gradient(135deg,${C.blue},${C.accent})`;
  return <button onClick={onClick} disabled={loading||disabled} style={{width:fullWidth?"100%":"auto",padding:"12px 20px",borderRadius:8,border:"none",background:bg,color:loading||disabled?C.muted:"#000",fontSize:14,fontWeight:800,cursor:loading||disabled?"not-allowed":"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:loading||disabled?"none":variant==="violet"?"0 4px 20px rgba(155,127,232,0.3)":`0 4px 20px ${C.blueGlow}`,fontFamily:"inherit",letterSpacing:"0.01em"}}>{loading?<><Spin/> Processing...</>:children}</button>;
};

const SecBtn=({children,onClick})=>(<button onClick={onClick} style={{width:"100%",padding:"11px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.text;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>{children}</button>);

function PlanBadge({plan}){
  const map={free:{label:"FREE",bg:"rgba(61,219,164,0.12)",color:C.green},pro:{label:"PRO",bg:C.accentSoft,color:C.blue},student:{label:"STUDENT",bg:C.violetSoft,color:C.violet}};
  const d=map[plan];if(!d)return null;
  return <span style={{background:d.bg,color:d.color,fontSize:11,fontWeight:800,letterSpacing:"0.1em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",flexShrink:0}}>{d.label}</span>;
}

function TermsModal({onClose}){
  return(<div style={{position:"fixed",inset:0,zIndex:500,background:C.bg,display:"flex",flexDirection:"column",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}><div style={{background:"rgba(0,0,0,0.98)",borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Terms & Conditions</div><button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div><div style={{flex:1,overflowY:"auto",padding:"20px 16px 48px",maxWidth:620,width:"100%",margin:"0 auto"}}>{TERMS_CONTENT.map((s,i)=>(<div key={i} style={{marginBottom:20}}><div style={{fontSize:14,fontWeight:700,color:C.blue,marginBottom:5}}>{s.h}</div><div style={{fontSize:13,color:C.muted,lineHeight:1.75}}>{s.b}</div>{i<TERMS_CONTENT.length-1&&<div style={{height:1,background:C.border,marginTop:16}}/>}</div>))}</div><div style={{padding:"13px 16px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.98)"}}><button onClick={onClose} style={{width:"100%",maxWidth:460,margin:"0 auto",display:"block",padding:"12px",borderRadius:8,background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",border:"none",fontFamily:"inherit"}}>Got it — Close ✓</button></div></div>);
}

function SafetyScreen({onAccept}){
  const [c1,setC1]=useState(false);const [c2,setC2]=useState(false);const [c3,setC3]=useState(false);
  const all=c1&&c2&&c3;
  const CheckRow=({checked,set,children})=>(<div onClick={set} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px",background:checked?C.accentSoft:C.surface,border:`1px solid ${checked?C.blue:C.border}`,borderRadius:9,cursor:"pointer",transition:"all 0.15s",marginBottom:8}}><div style={{width:17,height:17,borderRadius:4,border:`2px solid ${checked?C.blue:C.border}`,background:checked?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>{checked&&<span style={{color:"#000",fontSize:11,fontWeight:900}}>✓</span>}</div><div style={{fontSize:13,color:checked?C.text:C.muted,lineHeight:1.6,transition:"color 0.15s"}}>{children}</div></div>);
  return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",fontFamily:"'Cabinet Grotesk',sans-serif"}}><div style={{width:"100%",maxWidth:420,animation:"fadeUp 0.4s ease"}}><div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:48,marginBottom:10,animation:"glow 3s ease infinite"}}>🛡️</div><div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.01em",marginBottom:6}}>Before You Begin</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Read and accept all three conditions to continue.</div></div><div style={{background:"rgba(245,200,66,0.06)",border:"1px solid rgba(245,200,66,0.2)",borderRadius:9,padding:"11px 13px",marginBottom:18,display:"flex",gap:8}}><span style={{fontSize:16,flexShrink:0}}>⚠️</span><div style={{fontSize:13,color:C.yellow,lineHeight:1.6}}>AI content is generated under <strong>your direction</strong>. You are solely responsible for how it is used.</div></div><CheckRow checked={c1} set={()=>setC1(!c1)}><strong style={{color:c1?"#fff":C.muted}}>I take full responsibility</strong> for all content I generate. GhostwriterMe is not liable.</CheckRow><CheckRow checked={c2} set={()=>setC2(!c2)}><strong style={{color:c2?"#fff":C.muted}}>I will not use this tool</strong> to create harmful, illegal, or deceptive content.</CheckRow><CheckRow checked={c3} set={()=>setC3(!c3)}><strong style={{color:c3?"#fff":C.muted}}>I understand AI output may contain errors</strong> and I will verify content before use.</CheckRow><div style={{display:"flex",gap:4,marginBottom:16,marginTop:4}}>{[c1,c2,c3].map((c,i)=><div key={i} style={{height:2,flex:1,borderRadius:1,background:c?C.blue:C.border,transition:"background 0.3s"}}/>)}</div><button onClick={onAccept} disabled={!all} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:all?`linear-gradient(135deg,${C.blue},${C.accent})`:"#0c1220",color:all?"#000":C.muted,fontSize:14,fontWeight:800,cursor:all?"pointer":"not-allowed",transition:"all 0.3s",fontFamily:"inherit",boxShadow:all?`0 4px 20px ${C.blueGlow}`:"none"}}>{all?"I Agree — Enter GhostwriterMe →":"Accept "+[c1,c2,c3].filter(x=>!x).length+" more to continue"}</button></div></div>);
}

// === GHOST LOGO (from app icon) ===
function GhostLogo({size=140}){
  return(
    <div style={{width:size,height:size}}>
      <svg width={size} height={size} viewBox="60 60 280 230" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ghostGrad" cx="42%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="65%" stopColor="#eaf4fc"/>
            <stop offset="100%" stopColor="#c5e4f5"/>
          </radialGradient>
          <radialGradient id="blushL" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffafc2" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="#ffafc2" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="blushR" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffafc2" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="#ffafc2" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3a3a5e"/>
            <stop offset="100%" stopColor="#23233f"/>
          </linearGradient>
          <linearGradient id="penGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#90cbee"/>
            <stop offset="100%" stopColor="#4fa3d4"/>
          </linearGradient>
        </defs>
        <g className="ghost-group">
          <path d="M 138 222 Q 138 130 200 118 Q 262 130 262 222 L 262 292 Q 251 305 241 292 Q 230 279 220 292 Q 210 305 200 292 Q 190 279 180 292 Q 170 305 159 292 Q 149 279 140 292 Q 138 296 138 292 Z" fill="url(#ghostGrad)"/>
          <ellipse cx="180" cy="152" rx="16" ry="22" fill="white" opacity="0.25" transform="rotate(-18 180 152)"/>
          <ellipse cx="164" cy="204" rx="19" ry="11" fill="url(#blushL)"/>
          <ellipse cx="236" cy="204" rx="19" ry="11" fill="url(#blushR)"/>
          <g className="blink-group">
            <ellipse cx="180" cy="189" rx="12" ry="14" fill="#1a2535"/>
            <ellipse cx="176" cy="184" rx="4.5" ry="4.5" fill="white"/>
            <ellipse cx="184" cy="193" rx="2" ry="2" fill="white" opacity="0.45"/>
            <ellipse cx="220" cy="189" rx="12" ry="14" fill="#1a2535"/>
            <ellipse cx="216" cy="184" rx="4.5" ry="4.5" fill="white"/>
            <ellipse cx="224" cy="193" rx="2" ry="2" fill="white" opacity="0.45"/>
          </g>
          <path d="M 191 210 Q 200 218 209 210" fill="none" stroke="#1a2535" strokeWidth="2.8" strokeLinecap="round"/>
          <g className="hat-group">
            <ellipse cx="200" cy="124" rx="46" ry="10" fill="#2a2a45"/>
            <ellipse cx="196" cy="104" rx="40" ry="28" fill="url(#hatGrad)"/>
            <ellipse cx="188" cy="96" rx="16" ry="10" fill="white" opacity="0.1" transform="rotate(-10 188 96)"/>
            <circle cx="205" cy="88" r="4" fill="#79BAEC" opacity="0.9"/>
            <circle cx="205" cy="88" r="2" fill="#5aaad4"/>
            <path d="M 157 122 Q 200 130 243 122" fill="none" stroke="#79BAEC" strokeWidth="3.5" opacity="0.6"/>
          </g>
          <g className="pen-group">
            <rect x="256" y="150" width="11" height="52" rx="3.5" fill="url(#penGrad)"/>
            <rect x="258" y="168" width="4" height="22" rx="2" fill="#3d90c0" opacity="0.6"/>
            <polygon points="256,202 267,202 261.5,220" fill="#f0c040"/>
            <polygon points="259,218 264,218 261.5,226" fill="#c8a020"/>
            <rect x="256" y="144" width="11" height="8" rx="3" fill="#3d90c0"/>
            <rect x="258" y="152" width="3" height="14" rx="1.5" fill="white" opacity="0.3"/>
            <path className="ink1" d="M 228 238 Q 240 232 256 234" fill="none" stroke="#79BAEC" strokeWidth="2.2" strokeLinecap="round"/>
            <path className="ink2" d="M 224 252 Q 238 246 253 249" fill="none" stroke="#79BAEC" strokeWidth="1.7" strokeLinecap="round"/>
            <path className="ink3" d="M 228 266 Q 240 260 252 263" fill="none" stroke="#79BAEC" strokeWidth="1.3" strokeLinecap="round"/>
          </g>
        </g>
        <g>
          <path d="M 78 88 L 80.5 81 L 83 88 L 90 90.5 L 83 93 L 80.5 100 L 78 93 L 71 90.5 Z" fill="#79BAEC" opacity="0.55"/>
          <path d="M 318 72 L 319.8 67 L 321.6 72 L 327 73.8 L 321.6 75.6 L 319.8 81 L 318 75.6 L 312.6 73.8 Z" fill="#ffd700" opacity="0.5"/>
        </g>
      </svg>
    </div>
  );
}

// === LANDING SCREEN ===
function LandingScreen({onGetStarted,onSignIn}){
  const modes=[
    {icon:"💬",label:"AI Replies",tier:"Free",tierColor:C.muted,bg:"#0d2035"},
    {icon:"📧",label:"Email Writer",tier:"Free",tierColor:C.muted,bg:"#0d2035"},
    {icon:"✅",label:"Grammar",tier:"Free",tierColor:C.muted,bg:"#0d2035"},
    {icon:"✍️",label:"Essay Writer",tier:"Pro",tierColor:C.blue,bg:"#111a26"},
    {icon:"🎓",label:"Academic",tier:"Student",tierColor:C.violet,bg:"#130e28"},
    {icon:"🧠",label:"Humanize",tier:"Student",tierColor:C.violet,bg:"#130e28"},
  ];
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 20px 40px",fontFamily:"'Cabinet Grotesk',sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:420,height:420,borderRadius:"50%",border:"1px solid #0d1f30",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",width:260,height:260,borderRadius:"50%",border:"1px solid #0d1f30",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:80,right:-40,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(155,127,232,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:120,left:-30,width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle,rgba(121,186,236,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>

        <div style={{display:"flex",justifyContent:"center",marginBottom:14,animation:"fadeUp 0.5s ease both"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:"#0d1a26",border:"1px solid #1a3148",fontSize:12,color:C.blue,fontWeight:700}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"glow 2s ease infinite"}}/>
            9 AI writing modes &middot; Free to start
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"center",marginBottom:4,animation:"fadeUp 0.5s 0.1s ease both"}}>
          <GhostLogo size={140}/>
        </div>

        <div style={{textAlign:"center",marginBottom:10,animation:"fadeUp 0.5s 0.1s ease both"}}>
          <div style={{fontSize:36,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",lineHeight:1.05}}>GhostwriterMe</div>
          <div style={{fontSize:13,color:"#3d5a75",letterSpacing:"0.2em",marginTop:5,fontWeight:700,textTransform:"uppercase"}}>Your Words. Perfected.</div>
        </div>

        <div style={{textAlign:"center",marginBottom:26,animation:"fadeUp 0.5s 0.18s ease both"}}>
          <div style={{fontSize:17,color:C.accent,fontWeight:700,lineHeight:1.5}}>
            Write like you mean it.<br/>
            <span style={{color:C.muted,fontWeight:400,fontSize:15}}>For non-native speakers, students,<br/>and anyone who wants to sound better.</span>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:24,animation:"fadeUp 0.5s 0.18s ease both"}}>
          {modes.map(m=>(
            <div key={m.label} style={{background:"#0a141e",border:"1px solid #162030",borderRadius:10,padding:"11px 12px",display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,background:m.bg}}>{m.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{m.label}</div>
                <div style={{fontSize:11,color:m.tierColor,marginTop:1}}>{m.tier}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:9,animation:"fadeUp 0.5s 0.26s ease both"}}>
          <button onClick={onGetStarted} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:C.blue,color:"#000",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.01em",transition:"transform 0.15s,background 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background=C.accent;e.currentTarget.style.transform="scale(1.02)";}} onMouseLeave={e=>{e.currentTarget.style.background=C.blue;e.currentTarget.style.transform="scale(1)";}}>
            Get Started — It's Free →
          </button>
          <button onClick={onSignIn} style={{width:"100%",padding:"14px",borderRadius:12,background:"transparent",border:"1px solid #1e2e3d",color:C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"border-color 0.15s,color 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2e3d";e.currentTarget.style.color=C.muted;}}>
            Already have an account? Sign In
          </button>
        </div>

        <div style={{marginTop:20,textAlign:"center",animation:"fadeUp 0.5s 0.26s ease both"}}>
          <div style={{fontSize:12,color:"#1e3448"}}>No credit card &middot; Works on any device &middot; Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}

const Section=({title,children})=>(
  <div style={{marginBottom:22}}>
    <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10,paddingLeft:2}}>{title}</div>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      {children}
    </div>
  </div>
);

const Row=({icon,label,children,onClick,danger,last})=>(
  <div onClick={onClick} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 14px",borderBottom:last?"none":`1px solid ${C.border}`,cursor:onClick?"pointer":"default",transition:"background 0.15s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.background=danger?"rgba(240,107,107,0.05)":C.surface;}}
    onMouseLeave={e=>{if(onClick)e.currentTarget.style.background="transparent";}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16,width:22,textAlign:"center"}}>{icon}</span>
      <span style={{fontSize:14,color:danger?C.red:C.text}}>{label}</span>
    </div>
    <div>{children}</div>
  </div>
);

// === SETTINGS SCREEN ===
function SettingsScreen({user,onBack,onSignOut,onSave,onContact,onShowTerms,onChangePlan,onCancelPlan}){
  const [displayName,setDisplayName]=useState(user.name||"");
  const [language,setLanguage]=useState(()=>localStorage.getItem("gwm_lang")||"en");
  const [notifEmail,setNotifEmail]=useState(()=>localStorage.getItem("gwm_notif_email")!=="false");
  const [notifPromo,setNotifPromo]=useState(()=>localStorage.getItem("gwm_notif_promo")!=="false");
  const [saved,setSaved]=useState(false);
  const [cancelConfirm,setCancelConfirm]=useState(false);

  const planMap={free:{label:"Free Plan",color:C.green,bg:"rgba(61,219,164,0.12)"},pro:{label:"Pro Plan",color:C.blue,bg:C.accentSoft},student:{label:"Student Plan",color:C.violet,bg:C.violetSoft}};
  const planInfo=planMap[user.plan]||planMap.free;
  const isPaid=user.plan!=="free";
  const fmtDate=x=>x?new Date(x).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"";

  const handleSave=()=>{
    localStorage.setItem("gwm_lang",language);
    localStorage.setItem("gwm_notif_email",notifEmail);
    localStorage.setItem("gwm_notif_promo",notifPromo);
    onSave({...user,name:displayName.trim()||user.name});
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif",color:C.text}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.95)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{width:32,height:32,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
        <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>Settings</div>
      </div>

      <div style={{maxWidth:500,margin:"0 auto",padding:"20px 16px 60px"}}>

        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:22}}>
          <div style={{width:50,height:50,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{user.avatar}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
            <div style={{marginTop:6}}><span style={{background:planInfo.bg,color:planInfo.color,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,letterSpacing:"0.08em"}}>{planInfo.label}</span></div>
          </div>
        </div>

        <Section title="Account">
          <div style={{padding:"13px 14px",borderBottom:`1px solid ${C.border}`}}>
            <label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase"}}>Display Name</label>
            <input value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:14,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          <Row icon="✉️" label={user.email} last>
            <span style={{fontSize:12,color:C.muted}}>Email</span>
          </Row>
        </Section>

        <Section title="Appearance">
          <Row icon="🌙" label="Dark Mode" last>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:12,color:C.muted}}>Always on</span>
              <Toggle on={true} set={()=>{}}/>
            </div>
          </Row>
        </Section>

        <Section title="Language">
          <div style={{padding:"13px 14px"}}>
            <div style={{position:"relative"}}>
              <select value={language} onChange={e=>setLanguage(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 32px 10px 12px",color:C.text,fontSize:14,fontFamily:"inherit",cursor:"pointer"}}>
                <option value="en">🇬🇧 English</option>
                <option value="th">🇹🇭 ภาษาไทย</option>
              </select>
              <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted,fontSize:12}}>▾</span>
            </div>
          </div>
        </Section>

        <Section title="Notifications">
          <Row icon="📬" label="Email Updates">
            <Toggle on={notifEmail} set={()=>setNotifEmail(!notifEmail)}/>
          </Row>
          <Row icon="🎁" label="Promotions & Offers" last>
            <Toggle on={notifPromo} set={()=>setNotifPromo(!notifPromo)}/>
          </Row>
        </Section>

        <Section title="My Plan">
          <Row icon={user.plan==="student"?"🎓":user.plan==="pro"?"⚡":"🆓"} label={planInfo.label}>
            {!isPaid&&<span style={{fontSize:12,color:C.muted}}>Current</span>}
            {isPaid&&user.cancelAtPeriodEnd&&<span style={{fontSize:12,color:C.yellow}}>Cancelled</span>}
            {isPaid&&!user.cancelAtPeriodEnd&&<span style={{fontSize:12,color:C.green}}>Active ✓</span>}
          </Row>
          {isPaid&&user.renewsAt&&(
            <Row icon="📅" label={user.cancelAtPeriodEnd?"Access until":"Renews on"}>
              <span style={{fontSize:12,color:user.cancelAtPeriodEnd?C.yellow:C.muted}}>{fmtDate(user.renewsAt)}</span>
            </Row>
          )}
          <Row icon="🔄" label="Change Plan" onClick={onChangePlan} last={!isPaid}>
            <span style={{color:C.muted,fontSize:13}}>›</span>
          </Row>
          {isPaid&&user.cancelAtPeriodEnd&&(
            <Row icon="▶" label="Resume Subscription" onClick={()=>onCancelPlan(false)} last>
              <span style={{color:C.green,fontSize:13}}>›</span>
            </Row>
          )}
          {isPaid&&!user.cancelAtPeriodEnd&&!cancelConfirm&&(
            <Row icon="✕" label="Cancel Subscription" onClick={()=>setCancelConfirm(true)} danger last>
              <span style={{color:C.muted,fontSize:13}}>›</span>
            </Row>
          )}
          {isPaid&&!user.cancelAtPeriodEnd&&cancelConfirm&&(
            <div style={{padding:"13px 14px"}}>
              <div style={{fontSize:13,color:C.text,marginBottom:4,fontWeight:700}}>Cancel your subscription?</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.5}}>You keep all {user.plan==="student"?"Student":"Pro"} features until <span style={{color:C.text,fontWeight:700}}>{fmtDate(user.renewsAt)}</span>. After that your account switches to Free. You can resume anytime before then.</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setCancelConfirm(false)} style={{flex:1,padding:"9px",borderRadius:7,background:"transparent",border:`1px solid ${C.border}`,color:C.text,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Keep Plan</button>
                <button onClick={()=>{onCancelPlan(true);setCancelConfirm(false);}} style={{flex:1,padding:"9px",borderRadius:7,background:"rgba(240,107,107,0.12)",border:"1px solid rgba(240,107,107,0.4)",color:C.red,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Confirm Cancel</button>
              </div>
            </div>
          )}
        </Section>
        {isPaid&&user.cancelAtPeriodEnd&&(
          <div style={{background:"rgba(245,200,66,0.06)",border:"1px solid rgba(245,200,66,0.2)",borderRadius:9,padding:"10px 13px",marginTop:-12,marginBottom:22,fontSize:13,color:C.yellow,lineHeight:1.6}}>
            Subscription cancelled. {user.plan==="student"?"Student":"Pro"} features stay active until {fmtDate(user.renewsAt)}.
          </div>
        )}

        <Section title="About">
          <Row icon="📄" label="Terms & Conditions" onClick={onShowTerms}>
            <span style={{color:C.muted,fontSize:13}}>›</span>
          </Row>
          <Row icon="🔒" label="Privacy Policy" onClick={()=>{}}>
            <span style={{color:C.muted,fontSize:13}}>›</span>
          </Row>
          <Row icon="✉️" label="Contact Us" onClick={onContact}>
            <span style={{color:C.muted,fontSize:13}}>›</span>
          </Row>
          <Row icon="ℹ️" label="Version" last>
            <span style={{fontSize:12,color:C.muted}}>1.0.0</span>
          </Row>
        </Section>

        <button onClick={handleSave} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:saved?`linear-gradient(135deg,${C.green},#2ab888)`:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginBottom:10,transition:"all 0.3s",boxShadow:saved?"0 4px 20px rgba(61,219,164,0.3)":`0 4px 20px ${C.blueGlow}`}}>
          {saved?"✓ Saved!":"Save Changes"}
        </button>

        <button onClick={onSignOut} style={{width:"100%",padding:"12px",borderRadius:10,background:"transparent",border:"1px solid rgba(240,107,107,0.3)",color:C.red,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(240,107,107,0.07)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AuthScreen({onAuth,defaultTab="signup"}){
  const [tab,setTab]=useState(defaultTab);const [showEmail,setShowEmail]=useState(false);
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [pw,setPw]=useState("");
  const [age,setAge]=useState("");const [showPw,setShowPw]=useState(false);
  const [agreed,setAgreed]=useState(false);const [loading,setLoading]=useState(null);
  const [errs,setErrs]=useState({});const [showTC,setShowTC]=useState(false);
  const handleSocial=id=>{if(id==="email"){setShowEmail(true);return;}setLoading(id);setTimeout(()=>{setLoading(null);onAuth({name:"Demo User",email:"demo@ghostwriterme.com",avatar:"🧠",plan:"free"});},1300);};
  const handleSubmit=()=>{const e={};if(!email.includes("@"))e.email="Enter a valid email";if(pw.length<6)e.pw="6+ characters";if(tab==="signup"){if(!name.trim())e.name="Required";const n=parseInt(age,10);if(!age||isNaN(n)||n<1||n>120)e.age="Enter valid age";else if(n<13)e.age="Must be 13 or older";if(!agreed)e.terms="Required";}if(Object.keys(e).length){setErrs(e);return;}setLoading("email");setTimeout(()=>{setLoading(null);onAuth({name:tab==="signup"?name:"Demo User",email,avatar:"✨",plan:"free"});},1300);};
  return(
    <>{showTC&&<TermsModal onClose={()=>setShowTC(false)}/>}
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{textAlign:"center",marginBottom:26,animation:"fadeUp 0.4s ease"}}><div style={{fontSize:32,fontWeight:900,letterSpacing:"-0.02em",color:"#fff",lineHeight:1}}>👻 GhostwriterMe</div><div style={{fontSize:11,color:C.muted,letterSpacing:"0.18em",marginTop:5}}>AI WRITING SUITE</div></div>
      <div style={{width:"100%",maxWidth:370,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 18px",animation:"fadeUp 0.4s 0.08s ease both",boxShadow:"0 20px 50px rgba(0,0,0,0.7)"}}>
        <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:20}}>
          {["signin","signup"].map(t=>(<button key={t} onClick={()=>{setTab(t);setShowEmail(false);setErrs({});setAgreed(false);setAge("");}} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:tab===t?C.blue:"transparent",color:tab===t?"#000":C.muted,fontSize:13,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{t==="signin"?"Sign In":"Create Account"}</button>))}
        </div>
        {!showEmail?(
          <><div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:3}}>{tab==="signin"?"Welcome back 👋":"Join GhostwriterMe"}</div><div style={{fontSize:13,color:C.muted,marginBottom:18,lineHeight:1.5}}>{tab==="signin"?"Access your AI writing suite.":"Free forever. No card needed."}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{SOCIAL_PROVIDERS.map(s=>(<button key={s.id} onClick={()=>handleSocial(s.id)} disabled={!!loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"15px",borderRadius:8,border:s.border||"none",background:s.bg,color:s.color,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",transition:"opacity 0.2s,transform 0.15s",opacity:loading&&loading!==s.id?0.4:1,fontFamily:"inherit"}} onMouseEnter={e=>{if(!loading)e.currentTarget.style.transform="scale(1.015)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
            {loading===s.id?<Spin color={s.color==="#fff"?"#fff":"#333"}/>:<SocialIcon type={s.iconType}/>}{loading===s.id?"Connecting...":s.label}
          </button>))}</div></>
        ):(
          <div style={{animation:"slideIn 0.25s ease"}}>
            <button onClick={()=>setShowEmail(false)} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>← Back</button>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:16}}>{tab==="signin"?"Sign in with email":"Sign up with email"}</div>
            {tab==="signup"&&(<><FInput label="Full Name" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} error={errs.name} icoL="👤"/><div style={{marginBottom:12}}><label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Your Age</label><input type="number" min="1" max="120" placeholder="e.g. 20" value={age} onChange={e=>setAge(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${errs.age?C.red:C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14}}/>{errs.age&&<div style={{fontSize:12,color:C.red,marginTop:3}}>{errs.age}</div>}<div style={{fontSize:12,color:C.muted,marginTop:3}}>Minimum age: 13</div></div></>)}
            <FInput label="Email" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} error={errs.email} icoL="✉️"/>
            <FInput label="Password" type={showPw?"text":"password"} placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} error={errs.pw} icoL="🔒" icoR={showPw?"🙈":"👁️"} onIcoR={()=>setShowPw(!showPw)}/>
            {tab==="signin"&&<div style={{textAlign:"right",marginTop:-5,marginBottom:12}}><span style={{fontSize:13,color:C.blue,cursor:"pointer"}}>Forgot password?</span></div>}
            {tab==="signup"&&(<div style={{marginBottom:12}}><div onClick={()=>{setAgreed(!agreed);if(errs.terms)setErrs({...errs,terms:""});}} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"10px 12px",background:agreed?C.accentSoft:C.surface,border:`1px solid ${errs.terms?C.red:agreed?C.blue:C.border}`,borderRadius:8,cursor:"pointer",transition:"all 0.15s"}}><div style={{width:16,height:16,borderRadius:3,border:`2px solid ${agreed?C.blue:errs.terms?C.red:C.border}`,background:agreed?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{agreed&&<span style={{color:"#000",fontSize:11,fontWeight:900}}>✓</span>}</div><div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>I agree to the{" "}<span onClick={e=>{e.stopPropagation();setShowTC(true);}} style={{color:C.blue,fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Terms & Conditions</span>{" "}and{" "}<span style={{color:C.blue,fontWeight:700,cursor:"pointer"}}>Privacy Policy</span></div></div>{errs.terms&&<div style={{fontSize:12,color:C.red,marginTop:3}}>{errs.terms}</div>}</div>)}
            <PriBtn loading={loading==="email"} onClick={handleSubmit}>{tab==="signin"?"Sign In →":"Create Account →"}</PriBtn>
          </div>
        )}
        <div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:14,lineHeight:1.6}}>By continuing you agree to our{" "}<span onClick={()=>setShowTC(true)} style={{color:C.blue,cursor:"pointer"}}>Terms</span>{" "}&amp;{" "}<span style={{color:C.blue,cursor:"pointer"}}>Privacy</span></div>
      </div>
    </div></>
  );
}

function PricingScreen({user,onSelect,onContact,onBack}){
  const [tab,setTab]=useState("pro");const [proBill,setProBill]=useState("monthly");const [stuBill,setStuBill]=useState("bimonthly");

  const FREE_F=["3 AI replies / day","Email Mode — unlimited","Grammar check","History (last 50)","🎤 Voice input on all fields","🔊 Text-to-speech on all outputs"];
  const PRO_F=["Unlimited AI replies","✍️ Essay Writer (CEFR A1–C2)","💼 CV / Resume Builder","📖 Author Mode (12 genres)","Full history across all modes","Priority generation speed"];
  const STU_F=["Everything in Pro","🎓 Academic Essay + auto-citations (Student exclusive)","🧠 Humanize My Writing (Student exclusive)","CEFR-matched voice output","Draft-to-final coaching","Argument weakness scanner","Student voice calibration","Priority support"];

  const allProF=[...FREE_F,...PRO_F];const allStuF=[...FREE_F,...PRO_F,...STU_F];
  const tabs=[{id:"free",label:"Free",color:C.green},{id:"pro",label:"Pro",color:C.blue},{id:"student",label:"🎓 Student",color:C.violet}];

  const getPrice=()=>{
    if(tab==="free")return{main:"$0",per:"forever",sub:null,intro:null};
    if(tab==="pro"){
      if(proBill==="monthly")return{main:"$7",per:"/ month",sub:"First 3 months — new users",intro:"Then $12 / month"};
      return{main:"$60",per:"/ year",sub:"Best annual rate",intro:null};
    }
    if(stuBill==="bimonthly")return{main:"$15",per:"/ 2 months",sub:"First 2 months — new users",intro:"Then $20 / 2 months"};
    return{main:"$96",per:"/ year",sub:"Best annual rate",intro:null};
  };

  const price=getPrice();const tabColor=tab==="student"?C.violet:tab==="pro"?C.blue:C.green;
  const features=tab==="student"?allStuF:tab==="pro"?allProF:FREE_F;
  const freeCount=FREE_F.length;const proCount=FREE_F.length+PRO_F.length;
  const handleCTA=()=>{if(tab==="free"){onSelect("free",null);return;}onSelect(tab,tab==="pro"?proBill:stuBill);};

  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 14px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{width:"100%",maxWidth:440}}>
        {onBack&&<button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:4,fontFamily:"inherit",padding:0}}>← Back to app</button>}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,animation:"fadeUp 0.4s ease"}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{user.avatar}</div>
          <div><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Hey {user.name.split(" ")[0]} 👋</div><div style={{fontSize:13,color:C.muted}}>{user.email}</div></div>
        </div>
        <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",marginBottom:4,animation:"fadeUp 0.4s 0.05s ease both"}}>Choose your plan</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:18,animation:"fadeUp 0.4s 0.08s ease both"}}>All plans include voice input and text-to-speech.</div>
        <div style={{display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:3,marginBottom:14,animation:"fadeUp 0.4s 0.1s ease both"}}>
          {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 4px",borderRadius:7,border:"none",background:tab===t.id?t.color:"transparent",color:tab===t.id?"#000":C.muted,fontSize:13,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{t.label}</button>))}
        </div>
        {tab==="pro"&&(<div style={{display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:3,marginBottom:12,animation:"fadeUp 0.2s ease"}}>{[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly"}].map(b=>(<button key={b.id} onClick={()=>setProBill(b.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:proBill===b.id?C.blue:"transparent",color:proBill===b.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>))}</div>)}
        {tab==="student"&&(<div style={{display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:3,marginBottom:12,animation:"fadeUp 0.2s ease"}}>{[{id:"bimonthly",label:"Every 2 Months"},{id:"yearly",label:"Yearly"}].map(b=>(<button key={b.id} onClick={()=>setStuBill(b.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:stuBill===b.id?C.violet:"transparent",color:stuBill===b.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>))}</div>)}
        {tab==="student"&&(<div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.25)",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",gap:8,animation:"fadeUp 0.2s ease"}}><span style={{fontSize:16,flexShrink:0}}>🎓</span><div style={{fontSize:13,color:C.violet,lineHeight:1.6}}>Includes exclusive <strong>Academic Essay</strong> with auto-citations + <strong>Humanize My Writing</strong> — Student-only tools.</div></div>)}
        <div style={{background:tab==="student"?`linear-gradient(150deg,rgba(155,127,232,0.07),${C.card})`:tab==="pro"?`linear-gradient(150deg,rgba(121,186,236,0.08),${C.card})`:C.card,border:`1px solid ${tab==="student"?"rgba(155,127,232,0.4)":tab==="pro"?C.blue:C.border}`,borderRadius:12,padding:"18px",position:"relative",overflow:"hidden",boxShadow:tab==="student"?`0 0 28px ${C.violetGlow}`:tab==="pro"?`0 0 28px ${C.blueGlow}`:"none",marginBottom:14,animation:"fadeUp 0.3s ease"}}>
          {tab!=="free"&&(<div style={{position:"absolute",top:-1,right:14,background:tab==="student"?"linear-gradient(135deg,#9b7fe8,#c4b5fd)":`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:11,fontWeight:900,letterSpacing:"0.08em",padding:"3px 10px",borderRadius:"0 0 6px 6px"}}>{tab==="student"?"🎓 STUDENT PLAN":"MOST POPULAR"}</div>)}
          <div style={{fontSize:12,letterSpacing:"0.12em",color:tabColor,textTransform:"uppercase",marginBottom:5}}>{tab.toUpperCase()}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:2}}><span style={{fontSize:34,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:"-0.02em"}}>{price.main}</span><span style={{fontSize:13,color:C.muted}}>{price.per}</span></div>
          {price.sub&&<div style={{fontSize:13,color:C.green,marginBottom:price.intro?2:14}}>{price.sub}</div>}
          {price.intro&&<div style={{fontSize:12,color:C.muted,marginBottom:14}}>{price.intro}</div>}
          {!price.sub&&<div style={{marginBottom:14}}/>}
          <ul style={{listStyle:"none",marginBottom:16,display:"flex",flexDirection:"column",gap:5,maxHeight:270,overflowY:"auto"}}>
            {features.map((feat,i)=>{const isProEx=tab==="pro"&&i>=freeCount;const isStuEx=tab==="student"&&i>=proCount;const isProBas=tab==="student"&&i>=freeCount&&i<proCount;return(<li key={feat} style={{fontSize:13,color:isStuEx?C.accent:isProEx||isProBas?C.text:C.muted,display:"flex",alignItems:"flex-start",gap:6}}><span style={{color:isStuEx?C.violet:isProEx?C.blue:isProBas?C.blue:C.green,flexShrink:0,marginTop:1}}>✓</span>{feat}</li>);})}
          </ul>
          {tab!=="free"&&(<div style={{background:tab==="student"?C.violetSoft:C.accentSoft,border:`1px solid ${tab==="student"?"rgba(155,127,232,0.2)":"rgba(121,186,236,0.2)"}`,borderRadius:8,padding:"9px 11px",marginBottom:13,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🎁</span><div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>3-day free trial</div><div style={{fontSize:12,color:C.muted}}>No charge until day 4 · Cancel anytime</div></div></div>)}
          {tab==="free"&&<SecBtn onClick={handleCTA}>Continue Free</SecBtn>}
          {tab==="pro"&&<PriBtn onClick={handleCTA}>Start Free Trial →</PriBtn>}
          {tab==="student"&&<PriBtn onClick={handleCTA} variant="violet">Start Student Free Trial 🎓</PriBtn>}
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:5,flexWrap:"wrap",animation:"fadeUp 0.4s 0.18s ease both"}}>
          {tabs.filter(t=>t.id!==tab).map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.color=t.color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>View {t.id==="student"?"Student":t.id==="pro"?"Pro":"Free"} plan</button>))}
        </div>
        <div style={{marginTop:24,textAlign:"center"}}><button onClick={onContact} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Questions? Contact us ✉️</button></div>
      </div>
    </div>
  );
}

function PaymentScreen({user,billing,targetPlan,onComplete}){
  const [method,setMethod]=useState(null);const [step,setStep]=useState("method");const [loading,setLoading]=useState(false);
  const [card,setCard]=useState({number:"",name:"",expiry:"",cvv:""});const [cErr,setCErr]=useState({});
  const isStudent=targetPlan==="student";const planColor=isStudent?C.violet:C.blue;

  const priceDisplay=isStudent?(billing==="yearly"?"$96 / year":"$15 / 2 months"):(billing==="yearly"?"$60 / year":"$7 / month");
  const introNote=isStudent&&billing!=="yearly"?"Intro offer · then $20 / 2 months":!isStudent&&billing==="monthly"?"Intro offer · then $12 / month":null;

  const METHODS=[
    {id:"card",  label:"Credit / Debit Card",icon:"💳",desc:"Visa, Mastercard",color:"#1a2e50"},
    {id:"paypal",label:"PayPal",             icon:"🅿️",desc:"Pay with PayPal", color:"#003087"},
  ];

  const fmt4=v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp=v=>{const n=v.replace(/\D/g,"").slice(0,4);return n.length>2?n.slice(0,2)+"/"+n.slice(2):n;};
  const brand=n=>{const d=n.replace(/\s/g,"");if(d.startsWith("4"))return"VISA";if(d.startsWith("5"))return"MC";return null;};

  const validateCard=()=>{const e={};if(card.number.replace(/\s/g,"").length<16)e.number="Enter 16-digit number";if(!card.name.trim())e.name="Name required";if(card.expiry.length<5)e.expiry="MM/YY";if(card.cvv.length<3)e.cvv="3 digits";setCErr(e);return!Object.keys(e).length;};
  const handlePay=()=>{if(method==="card"&&!validateCard())return;setLoading(true);setTimeout(()=>{setLoading(false);setStep("success");},2000);};

  if(step==="success")return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif"}}><div style={{textAlign:"center",maxWidth:320,animation:"fadeUp 0.5s ease"}}><div style={{fontSize:64,marginBottom:12,animation:"pulse 2s ease infinite"}}>🎉</div><div style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",marginBottom:6}}>You're in!</div><div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:22}}>{isStudent?"Student plan activated!":"3-day free trial started."}<br/>All features unlocked. 🚀</div><PriBtn onClick={onComplete} variant={isStudent?"violet":"blue"}>Enter the App →</PriBtn></div></div>);

  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 14px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{marginBottom:18}}><div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>Payment</div><div style={{fontSize:13,color:C.muted}}>Secure checkout · SSL encrypted · Cancel anytime</div></div>
        <Card style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>GhostwriterMe {isStudent?"Student":"Pro"}</div><div style={{fontSize:13,color:C.muted,marginTop:1}}>{billing} · after 3-day trial</div>{introNote&&<div style={{fontSize:12,color:C.green,marginTop:4}}>{introNote}</div>}</div>
            <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:900,color:planColor}}>{priceDisplay.split(" ")[0]}</div><div style={{fontSize:12,color:C.green,marginTop:1}}>Today: $0.00 ✓</div></div>
          </div>
        </Card>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9}}>Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {METHODS.map(m=>(<button key={m.id} onClick={()=>setMethod(m.id)} style={{display:"flex",alignItems:"center",gap:11,padding:"12px",background:method===m.id?C.accentSoft:C.card,border:`1px solid ${method===m.id?planColor:C.border}`,borderRadius:9,cursor:"pointer",transition:"all 0.2s",textAlign:"left",fontFamily:"inherit"}}><div style={{width:38,height:38,borderRadius:8,flexShrink:0,background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{m.icon}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{m.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{m.desc}</div></div>{method===m.id&&<div style={{width:18,height:18,borderRadius:"50%",background:planColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,color:"#000",fontWeight:900}}>✓</span></div>}</button>))}
          </div>
        </div>
        {method==="card"&&(<Card style={{marginBottom:14,animation:"slideIn 0.3s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><div style={{fontSize:13,color:C.muted}}>Card details</div><div style={{display:"flex",gap:4}}>{["VISA","MC"].map(b=><div key={b} style={{background:brand(card.number)===b?"#fff":"transparent",border:`1px solid ${brand(card.number)===b?"#fff":C.border}`,borderRadius:3,padding:"1px 6px",fontSize:11,fontWeight:900,color:brand(card.number)===b?"#000":C.muted}}>{b}</div>)}</div></div><FInput label="Card Number" placeholder="1234 5678 9012 3456" icoL="💳" value={card.number} onChange={e=>setCard({...card,number:fmt4(e.target.value)})} error={cErr.number}/><FInput label="Cardholder Name" placeholder="As shown on card" icoL="👤" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} error={cErr.name}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><FInput label="Expiry" placeholder="MM/YY" value={card.expiry} onChange={e=>setCard({...card,expiry:fmtExp(e.target.value)})} error={cErr.expiry}/><FInput label="CVV" type="password" placeholder="•••" value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value.replace(/\D/g,"").slice(0,4)})} error={cErr.cvv}/></div><div style={{fontSize:12,color:C.muted}}>🔒 Processed by Stripe. We never store card data.</div></Card>)}
        {method==="paypal"&&<Card style={{marginBottom:14,textAlign:"center",animation:"slideIn 0.3s ease"}}><div style={{fontSize:30,marginBottom:7}}>🅿️</div><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:3}}>PayPal</div><div style={{fontSize:13,color:C.muted}}>You'll be redirected to PayPal to approve.</div></Card>}
        {method&&(<div style={{animation:"fadeUp 0.3s ease"}}><PriBtn loading={loading} onClick={handlePay} variant={isStudent?"violet":"blue"}>{method==="paypal"?"Continue to PayPal →":"Confirm & Start Free Trial →"}</PriBtn><div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:7}}>🔒 Secure · No charge today · Cancel anytime</div></div>)}
      </div>
    </div>
  );
}

function HistoryMode({user}){
  const [filter,setFilter]=useState("all");const [items,setItems]=useState([]);const [exp,setExp]=useState(null);
  const ML={reply:"AI Reply",email:"Email",essay:"Essay",academic:"Academic",cv:"CV",author:"Author",grammar:"Grammar",humanize:"Humanize"};
  const MI={reply:"💬",email:"📧",essay:"✍️",academic:"🎓",cv:"💼",author:"📖",grammar:"✅",humanize:"🧠"};
  useEffect(()=>{setItems(HS.loadAll(user.email));},[user.email]);
  const filtered=filter==="all"?items:items.filter(i=>i.mode===filter);
  if(!items.length)return(<div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:40,marginBottom:10}}>🕐</div><div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:5}}>No history yet</div><div style={{fontSize:13,color:C.muted}}>Generated content will appear here.</div></div>);
  return(<div><div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:3}}>{["all",...Object.keys(ML)].map(m=>(<button key={m} onClick={()=>setFilter(m)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,border:`1px solid ${filter===m?C.blue:C.border}`,background:filter===m?C.accentSoft:"transparent",color:filter===m?C.blue:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{m==="all"?"All":(MI[m]||"")+" "+(ML[m]||m)}</button>))}</div><div style={{fontSize:12,color:C.muted,marginBottom:9}}>{filtered.length} item{filtered.length!==1?"s":""}</div>{filtered.map(item=>(<Card key={item.id} style={{marginBottom:8}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:exp===item.id?9:0}}><div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}><span style={{fontSize:16,flexShrink:0}}>{MI[item.mode]||"📝"}</span><div style={{minWidth:0}}><div style={{fontSize:12,color:C.muted}}>{ML[item.mode]||item.mode} · {new Date(item.ts).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div><div style={{fontSize:13,color:C.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title||item.output?.slice(0,55)||"Untitled"}</div></div></div><button onClick={()=>setExp(exp===item.id?null:item.id)} style={{flexShrink:0,padding:"4px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginLeft:6}}>{exp===item.id?"Hide":"View"}</button></div>{exp===item.id&&(<div style={{animation:"fadeUp 0.2s ease"}}>{item.input&&<div style={{fontSize:12,color:C.muted,background:C.surface,borderRadius:6,padding:"7px 10px",marginBottom:7,lineHeight:1.5}}><strong>Input:</strong> {item.input}</div>}<div style={{fontSize:13,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto",background:C.surface,borderRadius:6,padding:"9px 11px"}}>{item.output}</div><OutputActions text={item.output}/></div>)}</Card>))}</div>);
}

function ReplyMode({user,isPro}){
  const [msg,setMsg]=useState("");const [tone,setTone]=useState("confident");const [noDesp,setNoDesp]=useState(false);
  const [replies,setReplies]=useState([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [used,setUsed]=useState(0);
  const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const FREE_LIMIT=3;const ref=useRef(null);
  const gen=async()=>{
    if(!msg.trim())return;if(!isPro&&used>=FREE_LIMIT){setError("Free limit reached.");return;}
    setLoading(true);setError("");setReplies([]);
    const t=TONES.find(x=>x.id===tone);
    const sys="You are GhostwriterMe — witty, socially calibrated. No em-dashes. "+(noDesp?"Strip ALL clingy energy. Unbothered only. ":"")+"Tone: "+t.label+" — "+t.desc+". Return ONLY valid JSON: {\"replies\":[{\"option\":1,\"text\":\"...\",\"vibe\":\"one-word\"},{\"option\":2,\"text\":\"...\",\"vibe\":\"one-word\"},{\"option\":3,\"text\":\"...\",\"vibe\":\"one-word\"}]}";
    try{const raw=await callClaude(sys,'Message:\n"'+msg+'"',1000,imgData,imgType);const p=JSON.parse(raw.replace(/```json|```/g,"").trim());setReplies(p.replies||[]);setUsed(u=>u+1);if(user&&p.replies?.[0])HS.save(user.email,"reply",{title:"Reply to: "+msg.slice(0,40),input:msg,output:p.replies[0].text});setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),80);}
    catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}
  };
  return(
    <div>
      {!isPro&&<div style={{background:C.accentSoft,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 12px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:C.muted}}>{FREE_LIMIT-used} free replies left today</span><span style={{fontSize:13,color:C.blue,fontWeight:700}}>Upgrade →</span></div>}
      <FArea label="Paste the Message" placeholder="Paste the message you received..." value={msg} onChange={e=>setMsg(e.target.value)} rows={4} voice/>
      <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8,marginTop:2}}>Pick Your Energy</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {TONES.map(t=>(<button key={t.id} onClick={()=>setTone(t.id)} style={{background:tone===t.id?C.accentSoft:C.surface,border:`1px solid ${tone===t.id?C.blue:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:16}}>{t.emoji}</div><div style={{fontSize:13,fontWeight:700,marginTop:3}}>{t.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{t.desc}</div></button>))}
      </div>
      <div onClick={()=>setNoDesp(!noDesp)} style={{background:noDesp?C.accentSoft:C.surface,border:`1px solid ${noDesp?C.blue:C.border}`,borderRadius:8,padding:"11px 13px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.15s",marginBottom:13}}>
        <div><div style={{fontSize:13,fontWeight:700}}>💀 Don't Sound Desperate</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>Strips clingy energy. Unbothered only.</div></div>
        <Toggle on={noDesp} set={()=>setNoDesp(!noDesp)}/>
      </div>
      <ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/>
      <PriBtn onClick={gen} loading={loading} disabled={!msg.trim()}>✍️ Generate Replies</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {replies.length>0&&(<div ref={ref} style={{marginTop:20,animation:"fadeUp 0.4s ease"}}>{replies.map((r,i)=>(<Card key={i} style={{marginTop:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{r.vibe}</span><span style={{fontSize:12,color:C.muted}}>Option {r.option}</span></div><div style={{fontSize:14,lineHeight:1.7,color:C.text}}>{r.text}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={r.text}/><ListenBtn text={r.text}/><SaveAsImageBtn text={r.text} title="AI Reply"/></div></Card>))}</div>)}
    </div>
  );
}

function EmailMode({user}){
  const [etype,setEtype]=useState("professional");const [ctx,setCtx]=useState("");const [rec,setRec]=useState("");
  const [kp,setKp]=useState("");const [tone,setTone]=useState("professional");const [len,setLen]=useState("medium");
  const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const gen=async()=>{if(!ctx.trim())return;setLoading(true);setError("");setRes(null);const eObj=EMAIL_TYPES.find(e=>e.id===etype);const tObj=TONES.find(t=>t.id===tone);const wt={short:"~80 words",medium:"~150 words",long:"~250 words"}[len];try{const raw=await callClaude("Expert email writer. Return ONLY valid JSON: {\"subject\":\"...\",\"body\":\"...\",\"tip\":\"brief tip\"}","Write a "+eObj.label+" email. Context: "+ctx+(rec?" Recipient: "+rec:"")+(kp?" Key points: "+kp:"")+" Tone: "+tObj.label+" Length: "+wt,1000,imgData,imgType);const r=JSON.parse(raw.replace(/```json|```/g,"").trim());setRes(r);if(user)HS.save(user.email,"email",{title:r.subject,input:ctx,output:r.body});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  return(<div><div style={{background:"rgba(61,219,164,0.06)",border:"1px solid rgba(61,219,164,0.15)",borderRadius:7,padding:"8px 12px",marginBottom:13,display:"flex",alignItems:"center",gap:7}}><PlanBadge plan="free"/><span style={{fontSize:13,color:C.muted}}>Unlimited — free for all users</span></div><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Email Type</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>{EMAIL_TYPES.map(e=><button key={e.id} onClick={()=>setEtype(e.id)} style={{background:etype===e.id?C.accentSoft:C.surface,border:`1px solid ${etype===e.id?C.blue:C.border}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:16}}>{e.icon}</div><div style={{fontSize:13,fontWeight:700,marginTop:2}}>{e.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{e.desc}</div></button>)}</div><FArea label="Situation / Context" placeholder="What's this email about?" value={ctx} onChange={e=>setCtx(e.target.value)} rows={3} voice/><FInput label="Recipient (optional)" placeholder="e.g. My manager, a recruiter..." icoL="👤" value={rec} onChange={e=>setRec(e.target.value)} voice/><FArea label="Key Points (optional)" placeholder="e.g. Ask about timeline..." value={kp} onChange={e=>setKp(e.target.value)} rows={2} voice/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><FSelect label="Tone" value={tone} onChange={setTone} options={TONES.map(t=>({value:t.id,label:t.emoji+" "+t.label}))}/><FSelect label="Length" value={len} onChange={setLen} options={[{value:"short",label:"Short"},{value:"medium",label:"Medium"},{value:"long",label:"Long"}]}/></div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={gen} loading={loading} disabled={!ctx.trim()}>📧 Generate Email</PriBtn>{error&&<ErrBox msg={error}/>}{res&&<div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><Card style={{marginBottom:9}}><div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Subject</div><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{res.subject}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res.subject}/><ListenBtn text={res.subject}/><SaveAsImageBtn text={res.subject} title="Email Subject"/></div></Card><Card style={{marginBottom:9}}><div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7}}>Body</div><div style={{fontSize:14,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap"}}>{res.body}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res.body}/><ListenBtn text={res.body}/><SaveAsImageBtn text={res.body} title="Email"/></div></Card>{res.tip&&<div style={{background:"rgba(245,200,66,0.06)",border:"1px solid rgba(245,200,66,0.15)",borderRadius:8,padding:"10px 12px",display:"flex",gap:8}}><span style={{fontSize:16}}>💡</span><div style={{fontSize:13,color:C.yellow,lineHeight:1.6}}>{res.tip}</div></div>}</div>}</div>);
}

function GrammarMode({user}){
  const [text,setText]=useState("");const [style,setStyle]=useState("formal");const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const check=async()=>{if(!text.trim())return;setLoading(true);setError("");setRes(null);const s=GRAMMAR_STYLES.find(x=>x.id===style);try{const raw=await callClaude("Expert grammar checker. Return ONLY valid JSON: {\"errors\":[{\"type\":\"grammar|spelling|punctuation|style\",\"original\":\"...\",\"fixed\":\"...\",\"explanation\":\"brief\"}],\"rewritten\":\"full rewritten\",\"score\":0-100,\"summary\":\"one sentence\"}","Check & rewrite in "+s.label+" ("+s.desc+") style:\\n\\n\""+text+"\"",2000,imgData,imgType);const r=JSON.parse(raw.replace(/```json|```/g,"").trim());setRes(r);if(user)HS.save(user.email,"grammar",{title:"Grammar: "+text.slice(0,40),input:text,output:r.rewritten});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  const sc=res?(res.score>=80?C.green:res.score>=60?C.yellow:C.red):C.blue;
  return(<div><FArea label="Paste Your Text" placeholder="Any text — email, essay, message..." value={text} onChange={e=>setText(e.target.value)} rows={6} voice/><div style={{marginBottom:12}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Rewrite Style</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{GRAMMAR_STYLES.map(s=><button key={s.id} onClick={()=>setStyle(s.id)} style={{background:style===s.id?C.accentSoft:C.surface,border:`1px solid ${style===s.id?C.blue:C.border}`,borderRadius:8,padding:"11px 7px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:18,marginBottom:4}}>{s.icon}</div><div style={{fontSize:13,fontWeight:700}}>{s.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2,lineHeight:1.3}}>{s.desc}</div></button>)}</div></div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={check} loading={loading} disabled={!text.trim()}>✅ Check & Rewrite</PriBtn>{error&&<ErrBox msg={error}/>}{res&&<div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><Card style={{marginBottom:9,display:"flex",alignItems:"center",gap:14}}><div style={{width:54,height:54,borderRadius:"50%",border:`3px solid ${sc}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:16,fontWeight:900,color:sc,lineHeight:1}}>{res.score}</span><span style={{fontSize:11,color:C.muted}}>SCORE</span></div><div><div style={{fontSize:14,color:C.text,marginBottom:2}}>{res.summary}</div><div style={{fontSize:13,color:C.muted}}>{res.errors?.length||0} issue{res.errors?.length!==1?"s":""} found</div></div></Card>{res.errors?.length>0&&<Card style={{marginBottom:9}}><div style={{fontSize:11,color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Issues Found</div>{res.errors.map((e,i)=>{const tc={grammar:C.red,spelling:"#93c5fd",punctuation:C.green,style:"#c4b5fd"}[e.type]||C.muted;return<div key={i} style={{padding:"8px 0",borderBottom:i<res.errors.length-1?`1px solid ${C.border}`:"none"}}><span style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:tc,background:tc+"22",padding:"2px 5px",borderRadius:3}}>{e.type}</span><div style={{display:"flex",gap:6,fontSize:13,marginTop:5,marginBottom:2,flexWrap:"wrap",alignItems:"center"}}><span style={{color:C.red,textDecoration:"line-through"}}>{e.original}</span><span style={{color:C.muted}}>→</span><span style={{color:C.green}}>{e.fixed}</span></div><div style={{fontSize:12,color:C.muted}}>{e.explanation}</div></div>;})}</Card>}<Card><div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Rewritten — {GRAMMAR_STYLES.find(s=>s.id===style)?.label}</div><div style={{fontSize:14,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap"}}>{res.rewritten}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res.rewritten}/><ListenBtn text={res.rewritten}/><SaveAsImageBtn text={res.rewritten} title="Grammar Rewrite"/></div></Card></div>}</div>);
}

function EssayMode({user}){
  const [topic,setTopic]=useState("");const [details,setDetails]=useState("");const [level,setLevel]=useState("B2");const [type,setType]=useState("Argumentative");const [wc,setWc]=useState("500");const [essay,setEssay]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const LD={A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-intermediate",C1:"Advanced",C2:"Mastery"};
  const gen=async()=>{if(!topic.trim())return;setLoading(true);setError("");setEssay("");try{const res=await callClaude("Expert essay writer. Calibrate EXACTLY to CEFR level. Write ONLY the essay.","Write a "+type+" essay on: \""+topic+"\"\\nKey points: "+(details||"none")+"\\nCEFR: "+level+"\\nWords: ~"+wc,2000,imgData,imgType);setEssay(res);if(user)HS.save(user.email,"essay",{title:topic,input:type+", "+level+", "+wc+"w",output:res});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  return(<div><FArea label="Essay Topic" placeholder="e.g. The impact of social media on mental health" value={topic} onChange={e=>setTopic(e.target.value)} rows={2} voice/><FArea label="Key Points (optional)" placeholder="e.g. Stats, comparisons, case studies..." value={details} onChange={e=>setDetails(e.target.value)} rows={3} voice/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><FSelect label="Essay Type" value={type} onChange={setType} options={ESSAY_TYPES}/><FSelect label="Word Count" value={wc} onChange={setWc} options={["100","150","200","300","500","750","1000","1500","2000"].map(n=>({value:n,label:n+" words"}))}/></div><div style={{marginBottom:13}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:7}}>English Level (CEFR)</div><div style={{display:"flex",gap:5}}>{LEVELS.map(l=><button key={l} onClick={()=>setLevel(l)} style={{flex:1,padding:"7px 2px",borderRadius:6,background:level===l?C.accentSoft:C.surface,border:`1px solid ${level===l?C.blue:C.border}`,color:level===l?"#fff":C.muted,fontSize:13,fontWeight:level===l?800:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>{LD[level]}</div></div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>✍️ Generate Essay</PriBtn>{error&&<ErrBox msg={error}/>}{essay&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{type} · {level}</span><span style={{fontSize:12,color:C.muted}}>~{essay.split(/\s+/).length}w</span></div><div style={{fontSize:14,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{essay}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={essay}/><ListenBtn text={essay}/><SaveAsImageBtn text={essay} title={type+" Essay"}/></div></Card>}</div>);
}

function AcademicMode({user}){
  const [topic,setTopic]=useState("");const [details,setDetails]=useState("");const [cites,setCites]=useState([{type:"url",value:""}]);const [wc,setWc]=useState("1000");const [style,setStyle]=useState("APA");const [essay,setEssay]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const addC=()=>setCites([...cites,{type:"url",value:""}]);const remC=i=>setCites(cites.filter((_,j)=>j!==i));const updC=(i,fld,v)=>{const c=[...cites];c[i]={...c[i],[fld]:v};setCites(c);};
  const gen=async()=>{if(!topic.trim())return;setLoading(true);setError("");setEssay("");const cl=cites.filter(c=>c.value.trim()).map((c,i)=>"["+(i+1)+"] "+(c.type==="url"?"URL":"PDF")+": "+c.value).join("\\n");const prompt="Academic essay: \""+topic+"\"\\nArguments: "+(details||"none")+"\\nWords: ~"+wc+"\\nStyle: "+style+(cl?"\\nSources:\\n"+cl:"");try{const res=await callClaude("Expert academic writer. C1/C2 English. Use "+style+" citations. Include References. Write ONLY the essay.",prompt,2500,imgData,imgType);setEssay(res);if(user)HS.save(user.email,"academic",{title:topic,input:style+", "+wc+"w",output:res});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  return(<div><FArea label="Thesis / Topic" placeholder="e.g. The role of AI in modern healthcare" value={topic} onChange={e=>setTopic(e.target.value)} rows={2} voice/><FArea label="Arguments & Key Points" placeholder="e.g. ML accuracy, ethical concerns..." value={details} onChange={e=>setDetails(e.target.value)} rows={3} voice/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}><FSelect label="Citation Style" value={style} onChange={setStyle} options={["APA","MLA","Chicago","Harvard","Vancouver","IEEE"]}/><FSelect label="Word Count" value={wc} onChange={setWc} options={["100","150","200","500","750","1000","1500","2000","3000"].map(n=>({value:n,label:n+" words"}))}/></div><div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase"}}>Sources to Cite</div><button onClick={addC} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:5,padding:"3px 9px",color:C.blue,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button></div>{cites.map((c,i)=>(<div key={i} style={{display:"flex",gap:6,marginBottom:7,alignItems:"center"}}><select value={c.type} onChange={e=>updC(i,"type",e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 6px",color:C.text,fontSize:13,fontFamily:"inherit",width:76,flexShrink:0}}><option value="url">🔗 URL</option><option value="pdf">📄 PDF</option></select><input value={c.value} onChange={e=>updC(i,"value",e.target.value)} placeholder={c.type==="url"?"https://...":"Author, Title, Year..."} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:13,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>{cites.length>1&&<button onClick={()=>remC(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,flexShrink:0}}>✕</button>}</div>))}</div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>🎓 Generate Academic Essay</PriBtn>{error&&<ErrBox msg={error}/>}{essay&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>Academic · {style}</span><span style={{fontSize:12,color:C.muted}}>~{essay.split(/\s+/).length}w</span></div><div style={{fontSize:14,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"'Instrument Serif',Georgia,serif"}}>{essay}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={essay}/><ListenBtn text={essay}/><SaveAsImageBtn text={essay} title={"Academic Essay · "+style}/></div></Card>}</div>);
}

const CV_TEMPLATES=[
  {id:"modern",label:"Modern",desc:"Accent header"},
  {id:"classic",label:"Classic",desc:"Serif, formal"},
  {id:"minimal",label:"Minimal",desc:"Clean, airy"},
];
const CV_ACCENTS=["#1e3a5f","#2563eb","#0d9488","#7c2d3e","#111111"];

function buildCvHtml(d,p,t,accent){
  const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const fonts={modern:"'Helvetica Neue',Arial,sans-serif",classic:"Georgia,'Times New Roman',serif",minimal:"'Helvetica Neue',Arial,sans-serif"};
  const f=fonts[t]||fonts.modern;
  const name=esc(p.name||"Your Name"),title=esc(p.title||"");
  const contact=[p.email,p.phone,p.location,p.link].filter(Boolean).map(esc).join(" &nbsp;&middot;&nbsp; ");
  const photoImg=p.photo?('<img src="'+p.photo+'" style="width:88px;height:88px;border-radius:50%;object-fit:cover;flex-shrink:0;'+(t==="modern"?"border:3px solid rgba(255,255,255,0.55);":"border:2px solid "+accent+";")+'"/>'):"";
  let header;
  if(t==="modern"){
    header='<div style="background:'+accent+';color:#fff;padding:30px 36px;display:flex;align-items:center;gap:22px;">'+photoImg+'<div><div style="font-size:30px;font-weight:800;letter-spacing:0.5px;">'+name+'</div>'+(title?'<div style="font-size:14px;opacity:0.92;margin-top:4px;">'+title+'</div>':"")+(contact?'<div style="font-size:11.5px;opacity:0.85;margin-top:8px;">'+contact+'</div>':"")+'</div></div>';
  }else if(t==="classic"){
    header='<div style="text-align:center;padding:34px 36px 18px;">'+(photoImg?'<div style="display:flex;justify-content:center;margin-bottom:12px;">'+photoImg+'</div>':"")+'<div style="font-size:30px;font-weight:700;letter-spacing:2px;color:#111;">'+name.toUpperCase()+'</div>'+(title?'<div style="font-size:13px;color:'+accent+';margin-top:5px;letter-spacing:1px;">'+title+'</div>':"")+(contact?'<div style="font-size:11.5px;color:#555;margin-top:8px;">'+contact+'</div>':"")+'<div style="height:2px;background:'+accent+';width:64px;margin:16px auto 0;"></div></div>';
  }else{
    header='<div style="padding:36px 40px 8px;display:flex;align-items:center;gap:20px;">'+photoImg+'<div><div style="font-size:28px;font-weight:700;color:#111;">'+name+'</div>'+(title?'<div style="font-size:13px;color:#666;margin-top:3px;">'+title+'</div>':"")+(contact?'<div style="font-size:11px;color:#888;margin-top:7px;">'+contact+'</div>':"")+'</div></div>';
  }
  const st=t==="classic"?('font-size:13px;letter-spacing:2.5px;color:'+accent+';font-weight:700;margin:0 0 10px;border-bottom:1px solid #ddd;padding-bottom:5px;'):t==="modern"?('font-size:12.5px;letter-spacing:2px;color:'+accent+';font-weight:800;margin:0 0 10px;text-transform:uppercase;'):'font-size:11px;letter-spacing:2.5px;color:#999;font-weight:700;margin:0 0 10px;text-transform:uppercase;';
  const secWrap=(label,inner)=>inner?('<div style="margin-bottom:20px;"><div style="'+st+'">'+(t==="classic"?label.toUpperCase():label)+'</div>'+inner+'</div>'):"";
  const summary=d.summary?('<div style="font-size:12.5px;line-height:1.65;color:#333;">'+esc(d.summary)+'</div>'):"";
  const exp=(d.experience||[]).map(e=>'<div style="margin-bottom:13px;"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;"><span style="font-size:13.5px;font-weight:700;color:#222;">'+esc(e.role)+'</span><span style="font-size:11px;color:#888;">'+esc(e.period)+'</span></div><div style="font-size:12px;color:'+accent+';margin:1px 0 5px;font-weight:600;">'+esc(e.company)+'</div><ul style="margin:0;padding-left:16px;">'+(e.bullets||[]).map(b=>'<li style="font-size:12px;line-height:1.6;color:#444;margin-bottom:2px;">'+esc(b)+'</li>').join("")+'</ul></div>').join("");
  const skills=(d.skills||[]).length?(t==="modern"?('<div style="display:flex;flex-wrap:wrap;gap:6px;">'+d.skills.map(s=>'<span style="background:'+accent+'18;color:'+accent+';font-size:11px;font-weight:600;padding:4px 10px;border-radius:12px;">'+esc(s)+'</span>').join("")+'</div>'):('<div style="font-size:12.5px;line-height:1.8;color:#333;">'+d.skills.map(esc).join(" &middot; ")+'</div>')):"";
  const edu=(d.education||[]).map(e=>'<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;"><span style="font-size:13px;font-weight:700;color:#222;">'+esc(e.degree)+'</span><span style="font-size:11px;color:#888;">'+esc(e.period)+'</span></div><div style="font-size:12px;color:#555;">'+esc(e.school)+'</div></div>').join("");
  const ach=(d.achievements||[]).length?('<ul style="margin:0;padding-left:16px;">'+d.achievements.map(a=>'<li style="font-size:12px;line-height:1.6;color:#444;margin-bottom:3px;">'+esc(a)+'</li>').join("")+'</ul>'):"";
  const body='<div style="padding:'+(t==="modern"?"26px 36px 36px":"10px 40px 40px")+';">'+secWrap("Professional Summary",summary)+secWrap("Experience",exp)+secWrap("Skills",skills)+secWrap("Education",edu)+secWrap("Achievements",ach)+'</div>';
  return '<div style="font-family:'+f+';background:#ffffff;color:#222;width:100%;">'+header+body+'</div>';
}

function CVMode({user}){
  const [step,setStep]=useState("form");
  const [personal,setPersonal]=useState({photo:null,name:"",title:"",email:"",phone:"",location:"",link:""});
  const [tr,setTr]=useState("");const [exp,setExp]=useState("");const [ski,setSki]=useState("");const [edu,setEdu]=useState("");const [ach,setAch]=useState("");
  const [template,setTemplate]=useState("modern");const [accent,setAccent]=useState(CV_ACCENTS[0]);
  const [cvData,setCvData]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const photoRef=useRef(null);
  const setP=(k,v)=>setPersonal(p=>({...p,[k]:v}));
  const onPhoto=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setP("photo",ev.target.result);r.readAsDataURL(f);};

  const gen=async()=>{
    if(!exp.trim()&&!personal.title.trim()&&!tr.trim()){setError("Add at least a job title, target role, or some experience.");return;}
    setLoading(true);setError("");
    const sys='Expert CV writer. Strong action verbs, quantified impact where plausible, concise professional language. Do NOT invent specific employers, dates, or numbers that are not implied by the input. Return ONLY valid JSON, no markdown fences: {"summary":"2-3 sentence professional summary","experience":[{"role":"","company":"","period":"","bullets":["",""]}],"skills":["",""],"education":[{"degree":"","school":"","period":""}],"achievements":[""]}';
    const u="Create polished CV content."+(tr?" Target role: "+tr+".":"")+(personal.title?" Current title: "+personal.title+".":"")+" Experience: "+(exp||"none provided")+". Skills: "+(ski||"none provided")+". Education: "+(edu||"none provided")+". Achievements: "+(ach||"none provided")+". Rewrite everything professionally. 2-4 strong bullets per role. If a section has no input, return an empty array for it.";
    try{
      const raw=await callClaude(sys,u,2000);
      const data=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setCvData(data);setStep("preview");
      if(user)HS.save(user.email,"cv",{title:"CV: "+(tr||personal.title||personal.name||"Untitled"),input:template,output:(data.summary||"")+"\n\n"+(data.experience||[]).map(e=>e.role+" at "+e.company).join("\n")});
    }catch(e){setError(e.message||"Something went wrong.");}
    finally{setLoading(false);}
  };

  const cvText=()=>{
    if(!cvData)return"";
    let s=[personal.name,personal.title,[personal.email,personal.phone,personal.location,personal.link].filter(Boolean).join(" | ")].filter(Boolean).join("\n")+"\n";
    if(cvData.summary)s+="\nSUMMARY\n"+cvData.summary+"\n";
    if(cvData.experience?.length){s+="\nEXPERIENCE\n";cvData.experience.forEach(e=>{s+=e.role+" | "+e.company+" | "+e.period+"\n";(e.bullets||[]).forEach(b=>{s+="- "+b+"\n";});});}
    if(cvData.skills?.length)s+="\nSKILLS\n"+cvData.skills.join(", ")+"\n";
    if(cvData.education?.length){s+="\nEDUCATION\n";cvData.education.forEach(e=>{s+=e.degree+" | "+e.school+" | "+e.period+"\n";});}
    if(cvData.achievements?.length){s+="\nACHIEVEMENTS\n";cvData.achievements.forEach(a=>{s+="- "+a+"\n";});}
    return s;
  };

  const downloadPdf=()=>{
    const html=buildCvHtml(cvData,personal,template,accent);
    const w=window.open("","_blank");
    if(!w){alert("Please allow popups to download your CV.");return;}
    w.document.write('<html><head><title>'+(personal.name||"CV")+'</title><meta charset="utf-8"/><style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body style="margin:0;background:#fff;">'+html+'</body></html>');
    w.document.close();
    setTimeout(()=>{w.focus();w.print();},400);
  };

  if(step==="preview"&&cvData){
    return(
      <div style={{animation:"fadeUp 0.3s ease"}}>
        <button onClick={()=>setStep("form")} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>&#8592; Edit Info</button>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {CV_TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>setTemplate(t.id)} style={{flex:1,padding:"8px 6px",borderRadius:8,background:template===t.id?C.accentSoft:C.surface,border:`1px solid ${template===t.id?C.blue:C.border}`,color:template===t.id?"#fff":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {t.label}
              <div style={{fontSize:11,fontWeight:400,color:C.muted,marginTop:1}}>{t.desc}</div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase"}}>Accent</span>
          {CV_ACCENTS.map(a=>(
            <button key={a} onClick={()=>setAccent(a)} style={{width:24,height:24,borderRadius:"50%",background:a,border:accent===a?`2px solid ${C.blue}`:"2px solid transparent",cursor:"pointer",padding:0,boxShadow:accent===a?`0 0 0 2px ${C.bg}`:"none"}}/>
          ))}
        </div>
        <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:12}} dangerouslySetInnerHTML={{__html:buildCvHtml(cvData,personal,template,accent)}}/>
        <PriBtn onClick={downloadPdf}>Download as PDF</PriBtn>
        <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
          <CopyBtn text={cvText()}/>
          <button onClick={gen} disabled={loading} style={{padding:"6px 13px",borderRadius:6,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{loading?"Regenerating...":"Regenerate Content"}</button>
        </div>
        <div style={{fontSize:12,color:C.muted,marginTop:10,lineHeight:1.6}}>Tip: "Download as PDF" opens your browser's print dialog. Choose "Save as PDF" as the destination.</div>
        {error&&<ErrBox msg={error}/>}
      </div>
    );
  }

  return(
    <div>
      <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Profile Photo (optional)</div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <input ref={photoRef} type="file" accept="image/*" onChange={onPhoto} style={{display:"none"}}/>
        <div onClick={()=>photoRef.current?.click()} style={{width:64,height:64,borderRadius:"50%",background:C.surface,border:`2px dashed ${personal.photo?C.blue:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
          {personal.photo?<img src={personal.photo} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.3}}>Add<br/>Photo</span>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:C.text,fontWeight:600}}>{personal.photo?"Photo added":"Upload a photo"}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:1}}>Square photos look best on the CV.</div>
          {personal.photo&&<button onClick={()=>setP("photo",null)} style={{marginTop:4,padding:"3px 9px",borderRadius:5,background:"transparent",border:`1px solid ${C.border}`,color:C.red,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:0}}>
        <FInput label="Full Name" placeholder="Your name" value={personal.name} onChange={e=>setP("name",e.target.value)}/>
        <FInput label="Job Title" placeholder="e.g. Product Manager" value={personal.title} onChange={e=>setP("title",e.target.value)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:0}}>
        <FInput label="Email" type="email" placeholder="you@email.com" value={personal.email} onChange={e=>setP("email",e.target.value)}/>
        <FInput label="Phone" placeholder="+66 ..." value={personal.phone} onChange={e=>setP("phone",e.target.value)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:0}}>
        <FInput label="Location" placeholder="e.g. Bangkok, Thailand" value={personal.location} onChange={e=>setP("location",e.target.value)}/>
        <FInput label="Website / LinkedIn" placeholder="linkedin.com/in/you" value={personal.link} onChange={e=>setP("link",e.target.value)}/>
      </div>

      <FInput label="Target Role (optional)" placeholder="The job you're applying for" value={tr} onChange={e=>setTr(e.target.value)}/>
      <FArea label="Work Experience" placeholder="Company, title, years, what you did. Rough notes are fine, the AI will polish them." value={exp} onChange={e=>setExp(e.target.value)} rows={4} voice/>
      <FArea label="Skills" placeholder="e.g. Python, Figma, team leadership, Thai/English" value={ski} onChange={e=>setSki(e.target.value)} rows={2} voice/>
      <FArea label="Education" placeholder="e.g. BSc Computer Science, Chulalongkorn University, 2019-2023" value={edu} onChange={e=>setEdu(e.target.value)} rows={2}/>
      <FArea label="Achievements (optional)" placeholder="e.g. Grew revenue 40%, Dean's List" value={ach} onChange={e=>setAch(e.target.value)} rows={2} voice/>

      <PriBtn onClick={gen} loading={loading}>Generate My CV</PriBtn>
      {error&&<ErrBox msg={error}/>}
    </div>
  );
}

function AuthorMode({user}){
  const [cat,setCat]=useState("fiction");const [genre,setGenre]=useState("fantasy");const [nfg,setNfg]=useState("memoir");const [prompt,setPrompt]=useState("");const [chars,setChars]=useState("");const [setting,setSetting]=useState("");const [ot,setOt]=useState("scene");const [len,setLen]=useState("medium");const [pov,setPov]=useState("third");const [res,setRes]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const OT=[{id:"scene",label:"Scene",desc:"Narrative"},{id:"opening",label:"Opening",desc:"Hook reader"},{id:"chapter",label:"Chapter",desc:"Full chapter"},{id:"outline",label:"Outline",desc:"Plot structure"},{id:"character",label:"Character",desc:"Profile"},{id:"dialogue",label:"Dialogue",desc:"Conversation"}];
  const ag=cat==="fiction"?FICTION_GENRES.find(g=>g.id===genre):NONFICTION_GENRES.find(g=>g.id===nfg);
  const wt={short:"~300 words",medium:"~600 words",long:"~1200 words"}[len];
  const gen=async()=>{if(!prompt.trim())return;setLoading(true);setError("");setRes("");const isFic=cat==="fiction";const sys=isFic?"Master "+(ag?.label)+" fiction author. Show don't tell. Write ONLY the content.":"Award-winning "+(ag?.label)+" non-fiction author. Write ONLY the content.";const pm={first:"First person",third:"Third person limited",omniscient:"Third person omniscient"};const fullP="Write a "+(ot==="chapter"?"full chapter":ot)+" in the "+(ag?.label)+" "+(isFic?"genre":"style")+".\\n"+prompt+"\\n"+(chars?"Characters: "+chars+"\\n":"")+(setting?"Setting: "+setting+"\\n":"")+(isFic?"POV: "+pm[pov]+"\\n":"")+"Length: "+wt+"\\nMake it feel like a published "+(ag?.label)+(isFic?" novel":" book")+".";try{const r=await callClaude(sys,fullP,2500,imgData,imgType);setRes(r);if(user)HS.save(user.email,"author",{title:(ag?.label)+": "+prompt.slice(0,40),input:ot+", "+len,output:r});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  return(<div><div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:14}}>{[{id:"fiction",label:"📖 Fiction"},{id:"nonfiction",label:"📰 Non-Fiction"}].map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:cat===c.id?C.blue:"transparent",color:cat===c.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{c.label}</button>)}</div><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Genre</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>{(cat==="fiction"?FICTION_GENRES:NONFICTION_GENRES).map(g=>{const a=cat==="fiction"?genre===g.id:nfg===g.id;return<button key={g.id} onClick={()=>cat==="fiction"?setGenre(g.id):setNfg(g.id)} style={{background:a?C.accentSoft:C.surface,border:`1px solid ${a?C.blue:C.border}`,borderRadius:8,padding:"8px 9px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16,flexShrink:0}}>{g.icon}</span><div><div style={{fontSize:13,fontWeight:700}}>{g.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{g.desc}</div></div></button>;})}</div><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>What to Generate</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>{OT.map(o=><button key={o.id} onClick={()=>setOt(o.id)} style={{background:ot===o.id?C.accentSoft:C.surface,border:`1px solid ${ot===o.id?C.blue:C.border}`,borderRadius:7,padding:"8px 6px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:13,fontWeight:700}}>{o.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{o.desc}</div></button>)}</div><FArea label="Story / Piece Brief" placeholder={cat==="fiction"?"e.g. A young mage discovers a forbidden spell...":"e.g. The day I realized I had been living someone else's life..."} value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3} voice/><FArea label="Characters (optional)" placeholder={cat==="fiction"?"e.g. Kira — 23, skeptical...":"e.g. My father, my old boss..."} value={chars} onChange={e=>setChars(e.target.value)} rows={2} voice/><FArea label="Setting (optional)" placeholder={cat==="fiction"?"e.g. Floating island city":"e.g. Rural Thailand, 2018"} value={setting} onChange={e=>setSetting(e.target.value)} rows={2}/><div style={{display:"grid",gridTemplateColumns:cat==="fiction"?"1fr 1fr 1fr":"1fr 1fr",gap:12,marginBottom:12}}><FSelect label="Length" value={len} onChange={setLen} options={[{value:"short",label:"Short (~300w)"},{value:"medium",label:"Medium (~600w)"},{value:"long",label:"Long (~1200w)"}]}/>{cat==="fiction"&&<FSelect label="POV" value={pov} onChange={setPov} options={[{value:"first",label:"First Person"},{value:"third",label:"Third Limited"},{value:"omniscient",label:"Omniscient"}]}/>}<FSelect label="Output" value={ot} onChange={setOt} options={OT.map(o=>({value:o.id,label:o.label}))}/></div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={gen} loading={loading} disabled={!prompt.trim()}>📖 Generate {ot.charAt(0).toUpperCase()+ot.slice(1)}</PriBtn>{error&&<ErrBox msg={error}/>}{res&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:11}}><span style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{ag?.label} · {ot}</span><span style={{fontSize:12,color:C.muted}}>~{res.split(/\s+/).length}w</span></div><div style={{fontSize:14,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"'Instrument Serif',Georgia,serif",fontStyle:"italic"}}>{res}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res}/><ListenBtn text={res}/><SaveAsImageBtn text={res} title={ag?.label+" · "+ot}/></div></Card>}</div>);
}

function HumanizeMode({user}){
  const [text,setText]=useState("");const [level,setLevel]=useState("B2");const [intensity,setIntensity]=useState("moderate");const [purpose,setPurpose]=useState("essay");const [res,setRes]=useState(null);const [phase,setPhase]=useState("");const [error,setError]=useState("");const [view,setView]=useState("output");
  const LD={A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-intermediate",C1:"Advanced",C2:"Near-native"};
  const PURPOSES=[{id:"essay",icon:"✍️",label:"Essay",desc:"Academic"},{id:"email",icon:"📧",label:"Email",desc:"Professional"},{id:"report",icon:"📊",label:"Report",desc:"Formal"},{id:"personal",icon:"💬",label:"Personal",desc:"Casual/Blog"}];
  const INTENSITIES=[{id:"light",label:"Light",desc:"Fix obvious AI patterns, keep structure"},{id:"moderate",label:"Moderate",desc:"Rewrite rhythm and sentence variety"},{id:"deep",label:"Deep",desc:"Full transformation at your level"}];
  const RULES="STRICT RULES: 1. NO em dashes. 2. No colon to introduce lists mid-sentence. 3. No not-only-but-also. 4. Never start with: Furthermore, Moreover, Additionally, In conclusion, To summarize, Notably, Evidently, Consequently, Nevertheless. 5. Never use: delve, navigate, landscape, realm, crucial, vital, foster, leverage, robust, multifaceted, comprehensive, streamline, cutting-edge, pivotal, testament, transformative, paradigm, holistic, synergy. 6. Always use contractions. 7. Vary sentence length. 8. Imperfect paragraph lengths. 9. Simple connectors only. 10. Minor imperfections OK. 11. Match CEFR "+level+". 12. Match purpose: "+purpose+".";
  const process=async()=>{
    if(!text.trim())return;setPhase("pass1");setError("");setRes(null);
    const iMap={light:"Fix 3 to 5 obvious AI patterns. Keep original structure.",moderate:"Rewrite most sentences. Break up long ones. Same meaning but feels human.",deep:"Fully rewrite. Sound like a real "+LD[level]+" English speaker. Unrecognizable as AI."};
    const p1sys="You are an expert at making AI-written text sound like a real human wrote it.\\n\\n"+RULES+"\\n\\nReturn ONLY valid JSON with no markdown fences:\\n{\"humanized\":\"the rewritten text\",\"changes\":[{\"what\":\"short label\",\"why\":\"why this sounds more human\"}]}";
    let p1;
    try{const r1=await callClaude(p1sys,"Intensity: "+intensity+" — "+iMap[intensity]+"\\n\\nOriginal text:\\n"+text,2000);p1=JSON.parse(r1.replace(/```json|```/g,"").trim());}
    catch(e){setError("Pass 1 error: "+(e?.message||"unknown"));setPhase("");return;}
    setPhase("pass2");
    const p2sys="You are a strict human-writing reviewer. Fix any remaining AI patterns.\\n\\n"+RULES+"\\n\\nReturn ONLY valid JSON:\\n{\"humanized\":\"reviewed text\",\"note\":\"one short sentence\"}";
    let finalText,note;
    try{const r2=await callClaude(p2sys,"Review and fix:\\n\\n"+p1.humanized,2000);const d2=JSON.parse(r2.replace(/```json|```/g,"").trim());finalText=d2.humanized||p1.humanized;note=d2.note||"";}
    catch(e){finalText=p1.humanized;note="";}
    const finalRes={humanized:finalText,changes:p1.changes||[],note};
    setRes(finalRes);setView("output");if(user)HS.save(user.email,"humanize",{title:"Humanized: "+text.slice(0,40),input:text,output:finalText});setPhase("");
  };
  const diffWords=(orig,updated)=>{const ow=orig.split(/\s+/),uw=updated.split(/\s+/);return uw.map((word,i)=>({word,changed:ow[i]!==word}));};
  const isLoading=phase!=="";const loadingLabel=phase==="pass1"?"Pass 1 — Rewriting...":phase==="pass2"?"Pass 2 — Reviewing...":"";
  return(
    <div>
      <div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.28)",borderRadius:8,padding:"11px 13px",marginBottom:14,display:"flex",gap:9}}>
        <span style={{fontSize:16,flexShrink:0}}>🧠</span>
        <div><div style={{fontSize:13,fontWeight:800,color:C.violet,marginBottom:2}}>Humanize My Writing — Student Exclusive</div><div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>Two-pass AI removal. Strips em dashes, robotic transitions, buzzwords, and uniform sentence patterns.</div></div>
      </div>
      <FArea label="Paste Your Text" placeholder="Paste any AI-generated or overly formal text here..." value={text} onChange={e=>setText(e.target.value)} rows={6} voice/>
      <div style={{marginBottom:13}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:7}}>Your English Level (CEFR)</div><div style={{display:"flex",gap:5}}>{LEVELS.map(l=>(<button key={l} onClick={()=>setLevel(l)} style={{flex:1,padding:"7px 2px",borderRadius:6,background:level===l?C.violetSoft:C.surface,border:`1px solid ${level===l?C.violet:C.border}`,color:level===l?C.violet:C.muted,fontSize:13,fontWeight:level===l?800:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>))}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>{LD[level]}</div></div>
      <div style={{marginBottom:13}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Writing Purpose</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{PURPOSES.map(p=>(<button key={p.id} onClick={()=>setPurpose(p.id)} style={{background:purpose===p.id?C.violetSoft:C.surface,border:`1px solid ${purpose===p.id?C.violet:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:16}}>{p.icon}</div><div style={{fontSize:13,fontWeight:700,marginTop:2}}>{p.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{p.desc}</div></button>))}</div></div>
      <div style={{marginBottom:14}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Transformation Intensity</div>{INTENSITIES.map(iv=>(<div key={iv.id} onClick={()=>setIntensity(iv.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:intensity===iv.id?C.violetSoft:C.surface,border:`1px solid ${intensity===iv.id?C.violet:C.border}`,borderRadius:8,cursor:"pointer",transition:"all 0.15s",marginBottom:6}}><div><div style={{fontSize:13,fontWeight:700,color:intensity===iv.id?C.violet:C.text}}>{iv.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{iv.desc}</div></div><div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${intensity===iv.id?C.violet:C.border}`,background:intensity===iv.id?C.violet:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{intensity===iv.id&&<div style={{width:7,height:7,borderRadius:"50%",background:"#000"}}/>}</div></div>))}</div>
      <button onClick={process} disabled={isLoading||!text.trim()} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:isLoading||!text.trim()?"#0c1220":"linear-gradient(135deg,#9b7fe8,#c4b5fd)",color:isLoading||!text.trim()?C.muted:"#000",fontSize:14,fontWeight:800,cursor:isLoading||!text.trim()?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:9,transition:"all 0.2s",boxShadow:isLoading||!text.trim()?"none":"0 4px 20px rgba(155,127,232,0.3)"}}>
        {isLoading?(<><Spin color="#9b7fe8"/><span style={{color:C.violet}}>{loadingLabel}</span></>):"🧠 Humanize My Writing"}
      </button>
      {isLoading&&(<div style={{marginTop:10,display:"flex",gap:6,alignItems:"center"}}><div style={{flex:1,height:3,borderRadius:2,background:phase==="pass1"||phase==="pass2"?"rgba(155,127,232,0.6)":C.border,transition:"background 0.4s"}}/><div style={{flex:1,height:3,borderRadius:2,background:phase==="pass2"?"rgba(155,127,232,0.6)":C.border,transition:"background 0.4s"}}/><div style={{fontSize:12,color:C.violet,flexShrink:0}}>{phase==="pass1"?"1 of 2":"2 of 2"}</div></div>)}
      {error&&<ErrBox msg={error}/>}
      {res&&(<div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
        {res.note&&<div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.2)",borderRadius:8,padding:"9px 12px",marginBottom:10,display:"flex",gap:8}}><span style={{fontSize:16}}>💡</span><div style={{fontSize:13,color:C.violet,lineHeight:1.6}}>{res.note}</div></div>}
        {res.changes?.length>0&&(<Card style={{marginBottom:10,borderColor:"rgba(155,127,232,0.3)"}}><div style={{fontSize:11,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:9}}>What Changed</div>{res.changes.map((c,i)=>(<div key={i} style={{display:"flex",gap:8,paddingBottom:i<res.changes.length-1?8:0,marginBottom:i<res.changes.length-1?8:0,borderBottom:i<res.changes.length-1?`1px solid ${C.border}`:"none"}}><span style={{color:C.violet,flexShrink:0,fontSize:13,marginTop:1}}>✓</span><div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{c.what}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>{c.why}</div></div></div>))}</Card>)}
        <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:10}}>{[{id:"output",label:"✅ Final Output"},{id:"compare",label:"🔍 Before vs After"}].map(v=>(<button key={v.id} onClick={()=>setView(v.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:view===v.id?C.violet:"transparent",color:view===v.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{v.label}</button>))}</div>
        {view==="output"&&(<Card glow glowColor={C.violet}><div style={{fontSize:11,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Humanized Output · 2-Pass Reviewed</div><div style={{fontSize:14,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{res.humanized}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res.humanized}/><ListenBtn text={res.humanized}/><SaveAsImageBtn text={res.humanized} title="Humanized Writing"/></div></Card>)}
        {view==="compare"&&(<div><div style={{display:"flex",gap:10,marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(240,107,107,0.25)",border:"1px solid rgba(240,107,107,0.5)"}}/>Original</div><div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(155,127,232,0.25)",border:"1px solid rgba(155,127,232,0.5)"}}/>Changed words</div></div><div style={{marginBottom:10}}><div style={{fontSize:11,color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Before</div><div style={{background:"rgba(240,107,107,0.05)",border:"1px solid rgba(240,107,107,0.2)",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{text}</div></div><div style={{marginBottom:10}}><div style={{fontSize:11,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>After</div><div style={{background:"rgba(155,127,232,0.05)",border:"1px solid rgba(155,127,232,0.25)",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{diffWords(text,res.humanized).map((w,i)=>(<span key={i}><span style={{background:w.changed?"rgba(155,127,232,0.22)":"transparent",borderRadius:w.changed?3:0,padding:w.changed?"1px 2px":0,color:w.changed?C.violet:C.text,fontWeight:w.changed?700:400}}>{w.word}</span>{i<res.humanized.split(/\s+/).length-1?" ":""}</span>))}</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>{[{label:"Original words",val:text.split(/\s+/).filter(Boolean).length},{label:"Final words",val:res.humanized.split(/\s+/).filter(Boolean).length},{label:"Words changed",val:diffWords(text,res.humanized).filter(w=>w.changed).length},{label:"Change rate",val:Math.round(diffWords(text,res.humanized).filter(w=>w.changed).length/Math.max(res.humanized.split(/\s+/).filter(Boolean).length,1)*100)+"%"}].map(s=>(<div key={s.label} style={{flex:1,minWidth:70,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:C.violet}}>{s.val}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.label}</div></div>))}</div><OutputActions text={res.humanized}/></div>)}
      </div>)}
    </div>
  );
}

function TrialModal({mode,targetPlan,onStart,onClose}){
  const [bill,setBill]=useState("monthly");
  const isStudent=targetPlan==="student";const planColor=isStudent?C.violet:C.blue;
  const M={essay:{icon:"✍️",title:"Essay Writer",perks:["CEFR A1-C2 levels","6 essay types","Word count control","Instant generation"]},academic:{icon:"🎓",title:"Academic Essay",perks:["APA, MLA, Chicago & more","URL/PDF citations","Auto-references","C1/C2 English"]},cv:{icon:"💼",title:"CV / Resume Builder",perks:["4 CV styles","ATS-optimised","Full CV or by section","Tailored to role"]},author:{icon:"📖",title:"Author Mode",perks:["8 fiction + 4 non-fiction","Scene, chapter, outline","POV selector","Literary quality"]},humanize:{icon:"🧠",title:"Humanize My Writing",perks:["CEFR-matched output","3 intensity levels","4 writing contexts","Change breakdown"]}};
  const h=M[mode]||M.essay;
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",animation:"fadeUp 0.2s ease"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:500,background:C.card,border:`1px solid ${isStudent?"rgba(155,127,232,0.4)":C.border}`,borderRadius:"14px 14px 0 0",padding:"20px 16px 28px",animation:"slideUpModal 0.3s ease",maxHeight:"92vh",overflowY:"auto",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
        <div style={{width:32,height:3,borderRadius:2,background:C.border,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:15}}>
          <div style={{width:44,height:44,borderRadius:10,background:isStudent?"linear-gradient(135deg,#9b7fe8,#c4b5fd)":`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{h.icon}</div>
          <div><div style={{fontSize:16,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>{h.title}</div><div style={{fontSize:13,color:C.muted,marginTop:1}}>{isStudent?"Student plan exclusive":"Unlock with a free trial"}</div></div>
        </div>
        {isStudent&&<div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.22)",borderRadius:7,padding:"9px 11px",marginBottom:12,fontSize:13,color:C.violet,lineHeight:1.5}}>🎓 Student exclusive — includes Academic Essay + Humanize My Writing tools.</div>}
        <div style={{background:C.surface,borderRadius:9,padding:"11px 13px",marginBottom:14}}>{h.perks.map(p=><div key={p} style={{display:"flex",gap:8,fontSize:13,color:C.text,padding:"3px 0"}}><span style={{color:isStudent?C.violet:C.green,flexShrink:0}}>✓</span>{p}</div>)}</div>
        {!isStudent&&(<div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:12}}>{[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly"}].map(b=><button key={b.id} onClick={()=>setBill(b.id)} style={{flex:1,padding:"6px",borderRadius:5,border:"none",background:bill===b.id?C.blue:"transparent",color:bill===b.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>)}</div>)}
        <div style={{background:isStudent?"rgba(155,127,232,0.07)":C.accentSoft,border:`1px solid ${isStudent?"rgba(155,127,232,0.25)":"rgba(121,186,236,0.22)"}`,borderRadius:10,padding:"13px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.02em"}}>
                {isStudent?"$15":(bill==="monthly"?"$7":"$60")}
                <span style={{fontSize:13,color:C.muted,fontWeight:400}}>{isStudent?" / 2 months":bill==="monthly"?" / month":" / year"}</span>
              </div>
              <div style={{fontSize:13,color:C.green,marginTop:1}}>{isStudent?"Intro offer · then $20 / 2 months":bill==="monthly"?"Intro offer · then $12 / month":"Best annual rate"}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:1}}>billed in USD</div>
            </div>
            <div style={{background:isStudent?C.violetSoft:C.accentSoft,border:`1px solid ${planColor}44`,borderRadius:6,padding:"6px 9px",textAlign:"center"}}>
              <div style={{fontSize:12,color:planColor,fontWeight:800}}>🎁 3 DAYS FREE</div>
              <div style={{fontSize:11,color:C.muted,marginTop:1}}>No charge until day 4</div>
            </div>
          </div>
          <PriBtn onClick={()=>onStart(bill,targetPlan)} variant={isStudent?"violet":"blue"}>{isStudent?"Start Student Free Trial 🎓":"Start Free Trial →"}</PriBtn>
          <div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:7}}>Cancel anytime · No charge until day 4</div>
        </div>
        <button onClick={onClose} style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Maybe later</button>
      </div>
    </div>
  );
}

function AppShell({user,onSignOut,onUpdateUser,activeMode,setActiveMode,onUpgrade,onChangePlan,onCancelPlan}){
  const [showContact,setShowContact]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showTerms,setShowTerms]=useState(false);

  const isPro=user.plan==="pro"||user.plan==="student";
  const isStudent=user.plan==="student";

  const locked=m=>{
    if(m.access==="free")return false;
    if(m.access==="pro+student")return !isPro;
    if(m.access==="student")return !isStudent;
    return false;
  };

  const renderMode=()=>{
    switch(activeMode){
      case"reply":return <ReplyMode user={user} isPro={isPro}/>;
      case"email":return <EmailMode user={user}/>;
      case"grammar":return <GrammarMode user={user}/>;
      case"essay":return <EssayMode user={user}/>;
      case"academic":return <AcademicMode user={user}/>;
      case"cv":return <CVMode user={user}/>;
      case"author":return <AuthorMode user={user}/>;
      case"humanize":return <HumanizeMode user={user}/>;
      case"history":return <HistoryMode user={user}/>;
      default:return null;
    }
  };

  const currentMode=MODES.find(m=>m.id===activeMode);

  if(showSettings){
    return(
      <>
        {showTerms&&<TermsModal onClose={()=>setShowTerms(false)}/>}
        <SettingsScreen
          user={user}
          onBack={()=>setShowSettings(false)}
          onSignOut={onSignOut}
          onSave={u=>{onUpdateUser(u);}}
          onContact={()=>setShowContact(true)}
          onShowTerms={()=>setShowTerms(true)}
          onChangePlan={onChangePlan}
          onCancelPlan={onCancelPlan}
        />
        {showContact&&<ContactModal onClose={()=>setShowContact(false)}/>}
      </>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Cabinet Grotesk',sans-serif",display:"flex",flexDirection:"column"}}>
      {showContact&&<ContactModal onClose={()=>setShowContact(false)}/>}
      {showTerms&&<TermsModal onClose={()=>setShowTerms(false)}/>}

      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.95)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:600,margin:"0 auto",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>👻</span>
            <span style={{fontSize:15,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>GhostwriterMe</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <PlanBadge plan={user.plan}/>
            <button onClick={()=>setShowSettings(true)} style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",flexShrink:0,padding:0}}>{user.avatar}</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",width:"100%",padding:"16px 16px 0",flex:1}}>
        {currentMode&&(
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:3}}>
              <span style={{fontSize:22}}>{currentMode.icon}</span>
              <span style={{fontSize:19,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>{currentMode.label}</span>
              {currentMode.access!=="free"&&<PlanBadge plan={currentMode.access==="student"?"student":"pro"}/>}
            </div>
          </div>
        )}

        {locked(currentMode||{})?(
          <div style={{textAlign:"center",padding:"50px 16px",animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:44,marginBottom:12}}>{currentMode.access==="student"?"🎓":"🔒"}</div>
            <div style={{fontSize:17,fontWeight:900,color:"#fff",marginBottom:6}}>{currentMode.label} is {currentMode.access==="student"?"Student-exclusive":"a Pro feature"}</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:18,maxWidth:320,margin:"0 auto 18px"}}>
              {currentMode.access==="student"?"Unlock this and other Student-only tools with a free trial.":"Upgrade to unlock this and other Pro features."}
            </div>
            <div style={{maxWidth:280,margin:"0 auto"}}>
              <PriBtn onClick={()=>onUpgrade(activeMode,currentMode.access==="student"?"student":"pro")} variant={currentMode.access==="student"?"violet":"blue"}>
                {currentMode.access==="student"?"Unlock with Student Plan 🎓":"Start Free Trial →"}
              </PriBtn>
            </div>
          </div>
        ):(
          <div style={{animation:"fadeUp 0.3s ease",paddingBottom:16}}>
            {renderMode()}
          </div>
        )}
      </div>

      <div style={{position:"sticky",bottom:0,background:"rgba(0,0,0,0.95)",backdropFilter:"blur(14px)",borderTop:`1px solid ${C.border}`,zIndex:50}}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex",overflowX:"auto",padding:"6px 6px"}}>
          {MODES.map(m=>{
            const active=activeMode===m.id;
            const isLocked=locked(m);
            return(
              <button key={m.id} onClick={()=>setActiveMode(m.id)} style={{flex:"1 0 auto",minWidth:62,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 4px",border:"none",background:"transparent",cursor:"pointer",position:"relative",fontFamily:"inherit"}}>
                <span style={{fontSize:18,opacity:active?1:isLocked?0.35:0.7,filter:active?"none":"grayscale(20%)"}}>{m.icon}</span>
                <span style={{fontSize:10,fontWeight:active?800:500,color:active?C.blue:isLocked?"#3d5a75":C.muted,letterSpacing:"0.01em"}}>{m.label}</span>
                {isLocked&&<span style={{position:"absolute",top:2,right:6,fontSize:9}}>🔒</span>}
                {active&&<div style={{position:"absolute",bottom:0,left:"30%",right:"30%",height:2,borderRadius:1,background:C.blue}}/>}
              </button>
            );
          })}
        </div>
        <div style={{textAlign:"center",padding:"4px 0 8px",display:"flex",justifyContent:"center",gap:14}}>
          <span onClick={()=>setShowSettings(true)} style={{fontSize:11,color:C.muted,cursor:"pointer"}}>Settings ⚙️</span>
          <span onClick={()=>setShowContact(true)} style={{fontSize:11,color:C.muted,cursor:"pointer"}}>Contact ✉️</span>
          <span onClick={()=>setShowTerms(true)} style={{fontSize:11,color:C.muted,cursor:"pointer"}}>Terms</span>
        </div>
      </div>
    </div>
  );
}

export default function GhostwriterMeApp(){
  const [screen,setScreen]=useState("landing");
  const [authTab,setAuthTab]=useState("signup");
  const [user,setUser]=useState(null);
  const [activeMode,setActiveMode]=useState("reply");
  const [trialInfo,setTrialInfo]=useState(null);
  const [paymentInfo,setPaymentInfo]=useState(null);

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=GLOBAL_CSS;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);

  useEffect(()=>{
    if(user&&user.plan!=="free"&&user.cancelAtPeriodEnd&&user.renewsAt&&new Date(user.renewsAt)<=new Date()){
      setUser(u=>({...u,plan:"free",billing:null,renewsAt:null,cancelAtPeriodEnd:false}));
    }
  },[user]);

  const handleGetStarted=()=>{setAuthTab("signup");setScreen("auth");};
  const handleSignIn=()=>{setAuthTab("signin");setScreen("auth");};
  const handleAuth=u=>{setUser(u);setScreen("safety");};
  const handleSafetyAccept=()=>{setScreen("app");};
  const handleSignOut=()=>{setUser(null);setScreen("landing");};
  const handleUpdateUser=u=>{setUser(u);};

  const handleUpgrade=(mode,targetPlan)=>{setTrialInfo({mode,targetPlan});setScreen("pricing");};
  const handlePricingSelect=(plan,billing)=>{
    if(plan==="free"){setUser(u=>u?{...u,plan:"free"}:u);setScreen("app");return;}
    setPaymentInfo({targetPlan:plan,billing:billing||"monthly"});
    setScreen("payment");
  };
  const handleTrialStart=(billing,targetPlan)=>{
    setPaymentInfo({targetPlan,billing});
    setTrialInfo(null);
    setScreen("payment");
  };
  const handlePaymentComplete=()=>{
    if(paymentInfo){
      const months={monthly:1,bimonthly:2,yearly:12}[paymentInfo.billing]||1;
      const end=new Date();end.setMonth(end.getMonth()+months);
      setUser(u=>({...u,plan:paymentInfo.targetPlan,billing:paymentInfo.billing,renewsAt:end.toISOString(),cancelAtPeriodEnd:false}));
    }
    setPaymentInfo(null);
    setScreen("app");
  };

  if(screen==="landing")return <LandingScreen onGetStarted={handleGetStarted} onSignIn={handleSignIn}/>;
  if(screen==="auth")return <AuthScreen onAuth={handleAuth} defaultTab={authTab}/>;
  if(screen==="safety")return <SafetyScreen onAccept={handleSafetyAccept}/>;
  if(screen==="pricing")return <PricingScreen user={user} onSelect={handlePricingSelect} onContact={()=>{}} onBack={()=>setScreen("app")}/>;
  if(screen==="payment")return <PaymentScreen user={user} billing={paymentInfo?.billing||"monthly"} targetPlan={paymentInfo?.targetPlan||"pro"} onComplete={handlePaymentComplete}/>;

  return(
    <>
      <AppShell user={user} onSignOut={handleSignOut} onUpdateUser={handleUpdateUser} activeMode={activeMode} setActiveMode={setActiveMode} onUpgrade={handleUpgrade} onChangePlan={()=>setScreen("pricing")} onCancelPlan={flag=>setUser(u=>({...u,cancelAtPeriodEnd:flag!==false}))}/>
      {trialInfo&&<TrialModal mode={trialInfo.mode} targetPlan={trialInfo.targetPlan} onStart={handleTrialStart} onClose={()=>setTrialInfo(null)}/>}
    </>
  );
}
