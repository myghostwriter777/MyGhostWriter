import React, { useState, useRef, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialized once, outside the component tree — Stripe's recommended pattern.
// CRA reads env vars via process.env (NOT import.meta.env — that's Vite-only).
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

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
  { id:"story",    icon:"🎬", label:"Story Guide", access:"pro+student" },
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
const ESSAY_TYPES = ["Argumentative","Descriptive","Expository","Narrative","Compare & Contrast","Reflective","Statement of Purpose","Personal Statement","Cover Letter"];
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

const SESSION_KEY="gwm_session_v1";
const TRIAL_DURATION_MS=3*24*60*60*1000; // 3 days, used for the cardless trial clock

// Notice versioning: bump a version number to force users to re-accept after content changes.
const NOTICE_VERSION={academic:1,humanize:1,safety:1};
const noticeKey=type=>"gwm_notice_"+type;
const isNoticeAccepted=type=>{try{return parseInt(localStorage.getItem(noticeKey(type))||"0",10)>=NOTICE_VERSION[type];}catch{return false;}};
const acceptNotice=type=>{try{localStorage.setItem(noticeKey(type),String(NOTICE_VERSION[type]));}catch{}};

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

const PRIVACY_CONTENT = [
  {h:"1. Information We Collect",b:"Your name, email, and Google profile photo (if you sign in with Google). Content you enter into AI tools, sent to our AI provider to generate responses. Payment details are handled entirely by Stripe — we never see or store your card number."},
  {h:"2. How We Use Your Information",b:"To provide and improve the Service, process subscriptions and billing through Stripe, and respond to support requests you send us."},
  {h:"3. What We Store Locally",b:"Your writing history is stored in your browser's local storage on your own device, not on our servers. Clearing your browser data will remove it."},
  {h:"4. Third-Party Services",b:"We use Stripe for payment processing, Google for sign-in, and an AI provider to generate content. Each operates under its own privacy policy."},
  {h:"5. Data Retention",b:"Account information is retained while your account is active. You may request deletion by contacting us at "+CONTACT_EMAIL+"."},
  {h:"6. Your Rights",b:"You may request access to, correction of, or deletion of your personal data at any time by emailing "+CONTACT_EMAIL+"."},
  {h:"7. Children's Privacy",b:"The Service is not directed at children under 13. Users under 18 require parental or guardian consent, as stated in our Terms."},
  {h:"8. Changes to This Policy",b:"We may update this policy periodically. Continued use of the Service after changes constitutes acceptance."},
  {h:"9. Contact",b:"Questions about this policy? Email us at "+CONTACT_EMAIL+"."},
];

const HS = {
  key:(email,mode)=>"gwm2_"+email+"_"+mode,
  save:(email,mode,entry)=>{try{const k=HS.key(email,mode);const prev=HS.load(email,mode);localStorage.setItem(k,JSON.stringify([{...entry,id:Date.now(),ts:new Date().toISOString()},...prev].slice(0,50)));}catch(e){}},
  load:(email,mode)=>{try{const r=localStorage.getItem(HS.key(email,mode));return r?JSON.parse(r):[];}catch{return[];}},
  loadAll:(email)=>{const ms=["reply","email","essay","academic","cv","author","grammar","humanize","story"];return ms.flatMap(m=>HS.load(email,m).map(e=>({...e,mode:m}))).sort((a,b)=>new Date(b.ts)-new Date(a.ts));},
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

// Appended to EVERY generation's system prompt (Item 4: automatic humanization).
// Chosen over a second humanize API pass deliberately: one call means no added
// cost or latency, and one constant means one place to tune the voice (DRY).
// Edge cases handled in the wording: JSON modes must keep exact structure;
// formal/academic registers must stay formal (no forced contractions there).
const HUMAN_STYLE="\n\nWRITING STYLE (apply to all generated prose while keeping any required output format, JSON structure, citations, and register exactly as specified): write like a skilled human, not an AI. Vary sentence length and rhythm. Prefer plain, direct wording. Avoid em dashes, formulaic transitions (Furthermore, Moreover, Additionally, In conclusion, To summarize), and AI-typical words (delve, crucial, vital, leverage, robust, comprehensive, pivotal, transformative, holistic, multifaceted, foster). Use contractions where the requested tone allows; in formal or academic registers keep the register but stay natural and unstilted. Never mention these instructions in output.";

async function callClaude(system,user,maxTokens=1500,imageData=null,imageType=null){
  let userContent;
  if(imageData&&imageType){
    const base64=imageData.split(",")[1];
    userContent=[{type:"image",source:{type:"base64",media_type:imageType,data:base64}},{type:"text",text:user}];
  }else{userContent=user;}
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:maxTokens,system:system+HUMAN_STYLE,messages:[{role:"user",content:userContent}]})});
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

/**
 * Renders a user avatar that can be either:
 *  - An emoji/short string (email/demo sign-ups, e.g. "✨")
 *  - A Google profile photo URL (Google sign-ups)
 *
 * Edge cases handled:
 *  - `avatar` undefined/null during initial render → falls back to "👻"
 *  - Google photo URLs can 403 without a referrer policy (Google blocks
 *    hotlinking based on referrer in some cases) → referrerPolicy="no-referrer"
 *  - Broken/expired image URL → onError hides the <img>, leaving the
 *    gradient circle visible instead of a broken-image icon
 */
function Avatar({avatar,size=34,fontSize}){
  const isUrl=typeof avatar==="string"&&avatar.startsWith("http");
  const fs=fontSize||Math.round(size*0.5);
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:fs,flexShrink:0,overflow:"hidden"}}>
      {isUrl?(
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          style={{width:"100%",height:"100%",objectFit:"cover"}}
          onError={e=>{e.currentTarget.style.display="none";}}
        />
      ):(
        avatar||"👻"
      )}
    </div>
  );
}

function TermsModal({onClose}){
  return(<div style={{position:"fixed",inset:0,zIndex:500,background:C.bg,display:"flex",flexDirection:"column",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}><div style={{background:"rgba(0,0,0,0.98)",borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Terms & Conditions</div><button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div><div style={{flex:1,overflowY:"auto",padding:"20px 16px 48px",maxWidth:620,width:"100%",margin:"0 auto"}}>{TERMS_CONTENT.map((s,i)=>(<div key={i} style={{marginBottom:20}}><div style={{fontSize:14,fontWeight:700,color:C.blue,marginBottom:5}}>{s.h}</div><div style={{fontSize:13,color:C.muted,lineHeight:1.75}}>{s.b}</div>{i<TERMS_CONTENT.length-1&&<div style={{height:1,background:C.border,marginTop:16}}/>}</div>))}</div><div style={{padding:"13px 16px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.98)"}}><button onClick={onClose} style={{width:"100%",maxWidth:460,margin:"0 auto",display:"block",padding:"12px",borderRadius:8,background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",border:"none",fontFamily:"inherit"}}>Got it — Close ✓</button></div></div>);
}

function PrivacyModal({onClose}){
  return(<div style={{position:"fixed",inset:0,zIndex:500,background:C.bg,display:"flex",flexDirection:"column",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}><div style={{background:"rgba(0,0,0,0.98)",borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Privacy Policy</div><button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div><div style={{flex:1,overflowY:"auto",padding:"20px 16px 48px",maxWidth:620,width:"100%",margin:"0 auto"}}>{PRIVACY_CONTENT.map((s,i)=>(<div key={i} style={{marginBottom:20}}><div style={{fontSize:14,fontWeight:700,color:C.blue,marginBottom:5}}>{s.h}</div><div style={{fontSize:13,color:C.muted,lineHeight:1.75}}>{s.b}</div>{i<PRIVACY_CONTENT.length-1&&<div style={{height:1,background:C.border,marginTop:16}}/>}</div>))}</div><div style={{padding:"13px 16px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.98)"}}><button onClick={onClose} style={{width:"100%",maxWidth:460,margin:"0 auto",display:"block",padding:"12px",borderRadius:8,background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",border:"none",fontFamily:"inherit"}}>Got it — Close ✓</button></div></div>);
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
// ============ TAROT TOOLS (Explore section) ============
const TZ={gold:"#c9a227",goldL:"#e6c965",cream:"#f2e8d0",purple:"#a98bf0"};

const CARD_IMG={
  reply:"data:image/jpeg;base64,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",
  email:"data:image/jpeg;base64,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",
  grammar:"data:image/jpeg;base64,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",
  essay:"data:image/jpeg;base64,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",
  academic:"data:image/jpeg;base64,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",
  cv:"data:image/jpeg;base64,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",
  author:"data:image/jpeg;base64,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",
  humanize:"data:image/jpeg;base64,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",
  history:"data:image/jpeg;base64,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"
};

const TAROT_TOOLS=[
  {id:"reply",   name:"AI Replies",   tier:"Free",    desc:"Instantly generates smart, context-aware replies for any message or conversation."},
  {id:"email",   name:"Email Writer", tier:"Free",    desc:"Writes polished, professional emails for any situation in seconds."},
  {id:"grammar", name:"Grammar Check",tier:"Free",    desc:"Fixes grammar, spelling, and clarity with one tap."},
  {id:"essay",   name:"Essay Writer", tier:"Pro",     desc:"Generates well-structured essays tailored to your topic and requirements."},
  {id:"academic",name:"Academic",     tier:"Student", desc:"Provides feedback on your writing and offers research guidance."},
  {id:"cv",      name:"CV / Resume",  tier:"Pro",     desc:"Builds a professional, recruiter-ready CV or resume with ease."},
  {id:"author",  name:"Author Mode",  tier:"Pro",     desc:"Helps you write creative stories, novels, and books with ease."},
  {id:"humanize",name:"Humanize",     tier:"Student", desc:"Refines AI-generated text into natural, human-like writing."},
  {id:"story",   name:"Story Guide",  tier:"Pro",     desc:"Turns any book or movie into an interactive study guide — plot structure, characters, themes, and conflicts."},
  {id:"history", name:"History",      tier:"Free",    desc:"Saves and organizes all your past creations for easy access."},
];

function TarotCard({tool}){
  const [flipped,setFlipped]=React.useState(false);
  const tierColor=tool.tier==="Student"?TZ.purple:tool.tier==="Pro"?"#79BAEC":"#3ddba4";
  return(
    <div onClick={()=>setFlipped(f=>!f)} style={{aspectRatio:"244/294",cursor:"pointer",perspective:"900px",userSelect:"none"}}>
      <div style={{position:"relative",width:"100%",height:"100%",transition:"transform 0.55s cubic-bezier(0.4,0.2,0.2,1)",transformStyle:"preserve-3d",transform:flipped?"rotateY(180deg)":"none"}}>
        {/* FRONT — tarot illustration */}
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",borderRadius:8,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.55)"}}>
          {CARD_IMG[tool.id]?(
            <img src={CARD_IMG[tool.id]} alt={tool.name} draggable="false" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          ):(
            /* Ornamental fallback front for cards without a commissioned
               illustration yet (currently: story). Matches the tarot backs'
               gold-on-dark aesthetic; drop a base64 into CARD_IMG later and
               this branch stops rendering automatically. */
            <div style={{width:"100%",height:"100%",background:"linear-gradient(165deg,#1a1226,#0c0a14)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,position:"relative"}}>
              <div style={{position:"absolute",inset:5,border:"1px solid "+TZ.gold,borderRadius:5,opacity:0.45,pointerEvents:"none"}}/>
              <div style={{fontSize:10,color:TZ.goldL,letterSpacing:"0.25em"}}>✦ ✦ ✦</div>
              <div style={{fontSize:34}}>🎬</div>
              <div style={{fontSize:13,fontWeight:800,color:TZ.cream,fontFamily:"'Instrument Serif',Georgia,serif",textAlign:"center",padding:"0 8px",lineHeight:1.2}}>{tool.name}</div>
              <div style={{fontSize:10,color:TZ.goldL,letterSpacing:"0.25em"}}>✦ ✦ ✦</div>
            </div>
          )}
        </div>
        {/* BACK — description */}
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",transform:"rotateY(180deg)",borderRadius:8,border:"1.5px solid "+TZ.gold,background:"linear-gradient(165deg,#15101f,#0c0a14)",padding:"14px 12px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.55)",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:5,border:"1px solid "+TZ.gold,borderRadius:5,opacity:0.45,pointerEvents:"none"}}/>
          <div style={{fontSize:11,color:TZ.goldL,letterSpacing:"0.2em",marginBottom:6}}>❀</div>
          <div style={{fontSize:13.5,fontWeight:800,color:TZ.cream,fontFamily:"'Instrument Serif',Georgia,serif",marginBottom:3,lineHeight:1.15}}>{tool.name}</div>
          <div style={{width:30,height:1,background:TZ.gold,opacity:0.6,margin:"5px 0 8px"}}/>
          <div style={{fontSize:10.5,color:"#c9b896",lineHeight:1.5}}>{tool.desc}</div>
          <div style={{marginTop:8}}><span style={{fontSize:8.5,fontWeight:800,letterSpacing:"0.06em",color:tierColor,border:"1px solid "+tierColor+"66",padding:"1px 7px",borderRadius:10,textTransform:"uppercase"}}>{tool.tier}</span></div>
          <div style={{fontSize:9,color:TZ.goldL,opacity:0.5,marginTop:9,letterSpacing:"0.15em"}}>↺ tap to flip</div>
        </div>
      </div>
    </div>
  );
}

function LandingScreen({onGetStarted,onSignIn}){
  const [faqOpen,setFaqOpen]=useState(null);
  const [cfName,setCfName]=useState("");
  const [cfEmail,setCfEmail]=useState("");
  const [cfType,setCfType]=useState("Question");
  const [cfMsg,setCfMsg]=useState("");


  const PLANS=[
    {name:"Free",price:"$0",per:"forever",color:C.green,feats:["AI Replies, Email & Grammar","Voice input & text-to-speech","History (last 50)"],cta:"Start Free"},
    {name:"Pro",price:"$7",per:"/mo",note:"intro, then $12/mo",color:C.blue,popular:true,feats:["Everything in Free","Essay Writer & CV Builder","Author Mode (12 genres)","Story Analyzer (books & films)","Priority generation"],cta:"Start Free Trial"},
{name:"Student",price:"$15",per:"/mo",note:"intro, then $20/mo",color:C.violet,feats:["Everything in Pro","Academic Reviewer & Research","Humanize My Writing","Student-only tools"],cta:"Start Student Trial"},  ];

  const FAQS=[
    {q:"What is GhostwriterMe?",a:"GhostwriterMe is an AI writing suite that helps you turn rough ideas into clear, polished writing — from everyday replies and emails to essays, resumes, and creative work."},
    {q:"How does GhostwriterMe work?",a:"Pick a writing tool, type or speak what you need, and the AI generates a draft you can edit, copy, or refine. Every tool is built around a specific writing task so you get focused, relevant results."},
    {q:"Is my content private?",a:"Your writing is processed only to generate your results and is not sold or shared. History is stored on your own device. We recommend avoiding sensitive personal data in any AI tool."},
    {q:"Can I use GhostwriterMe for academic assistance?",a:"Yes — Academic mode is built as a writing coach. It reviews your own work, gives feedback, and helps you plan and research. You remain responsible for following your institution's academic integrity policies."},
    {q:"What subscription plans are available?",a:"A free plan with core tools, a Pro plan for advanced writing features, and a Student plan that adds the Academic Reviewer and Humanize tools. All paid plans start with a free trial."},
    {q:"How do I contact support?",a:"Use the Contact & Feedback form below, or email us directly at "+CONTACT_EMAIL+". We typically reply within 24 hours."},
  ];

  const UPDATES=[
    {date:"Jun 2026",tag:"New",tagColor:C.green,title:"Academic Mode reimagined",text:"Academic mode is now a writing coach — get essay feedback, research guidance, and draft examples with CEFR levels."},
    {date:"Jun 2026",tag:"Improved",tagColor:C.blue,title:"Redesigned CV / Resume Builder",text:"New templates, profile photos, accent colors, and one-tap PDF download."},
    {date:"May 2026",tag:"New",tagColor:C.violet,title:"Humanize My Writing",text:"Refine AI or formal text into natural, human-sounding writing with a two-pass review."},
  ];

  const sendContact=()=>{
    const subject=encodeURIComponent("["+cfType+"] GhostwriterMe — "+(cfName||"Visitor"));
    const body=encodeURIComponent((cfName?"Name: "+cfName+"\n":"")+(cfEmail?"Email: "+cfEmail+"\n":"")+"Type: "+cfType+"\n\n"+cfMsg);
    window.location.href="mailto:"+CONTACT_EMAIL+"?subject="+subject+"&body="+body;
  };

  const SectionTitle=({kicker,title,sub})=>(
    <div style={{textAlign:"center",marginBottom:20}}>
      {kicker&&<div style={{fontSize:12,letterSpacing:"0.18em",color:C.blue,fontWeight:800,textTransform:"uppercase",marginBottom:7}}>{kicker}</div>}
      <div style={{fontSize:24,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",lineHeight:1.15}}>{title}</div>
      {sub&&<div style={{fontSize:14,color:C.muted,marginTop:8,lineHeight:1.6,maxWidth:380,margin:"8px auto 0"}}>{sub}</div>}
    </div>
  );

  const ctaButtons=(margin)=>(
    <div style={{display:"flex",flexDirection:"column",gap:9,...margin}}>
      <button onClick={onGetStarted} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:C.blue,color:"#000",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.01em",transition:"transform 0.15s,background 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background=C.accent;e.currentTarget.style.transform="scale(1.02)";}} onMouseLeave={e=>{e.currentTarget.style.background=C.blue;e.currentTarget.style.transform="scale(1)";}}>
        Get Started — It's Free →
      </button>
      <button onClick={onSignIn} style={{width:"100%",padding:"14px",borderRadius:12,background:"transparent",border:"1px solid #1e2e3d",color:C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"border-color 0.15s,color 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2e3d";e.currentTarget.style.color=C.muted;}}>
        Already have an account? Sign In
      </button>
    </div>
  );

  const divider=<div style={{height:1,background:"linear-gradient(90deg,transparent,#162030,transparent)",margin:"40px 0"}}/>;

  return(
    <>
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif",color:C.text,overflowX:"hidden"}}>
      <div style={{maxWidth:440,margin:"0 auto",padding:"32px 20px 48px",position:"relative"}}>

        {/* Background glows */}
        <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:420,height:420,borderRadius:"50%",border:"1px solid #0d1f30",pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",width:260,height:260,borderRadius:"50%",border:"1px solid #0d1f30",pointerEvents:"none",zIndex:0}}/>

        <div style={{position:"relative",zIndex:1}}>

          {/* HERO */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:14,animation:"fadeUp 0.5s ease both"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:"#0d1a26",border:"1px solid #1a3148",fontSize:12,color:C.blue,fontWeight:700}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"glow 2s ease infinite"}}/>
              9 AI writing tools &middot; Free to start
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:4,animation:"fadeUp 0.5s 0.1s ease both"}}>
            <GhostLogo size={132}/>
          </div>
          <div style={{textAlign:"center",marginBottom:10,animation:"fadeUp 0.5s 0.1s ease both"}}>
            <div style={{fontSize:36,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",lineHeight:1.05}}>GhostwriterMe</div>
            <div style={{fontSize:13,color:"#3d5a75",letterSpacing:"0.2em",marginTop:5,fontWeight:700,textTransform:"uppercase"}}>Your Words. Perfected.</div>
          </div>
          <div style={{textAlign:"center",marginBottom:24,animation:"fadeUp 0.5s 0.18s ease both"}}>
            <div style={{fontSize:17,color:C.accent,fontWeight:700,lineHeight:1.5}}>
              Write like you mean it.<br/>
              <span style={{color:C.muted,fontWeight:400,fontSize:15}}>For non-native speakers, students,<br/>and anyone who wants to sound better.</span>
            </div>
          </div>
          {ctaButtons({})}
          <div style={{marginTop:16,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#1e3448"}}>No credit card &middot; Works on any device &middot; Cancel anytime</div>
          </div>

          {divider}

          {/* ABOUT US */}
          <SectionTitle kicker="About Us" title="What is GhostwriterMe?"/>
          <Card style={{lineHeight:1.75,marginBottom:0}}>
            <div style={{fontSize:14,color:C.text}}>
              GhostwriterMe is an AI writing suite that turns your ideas into clear, polished writing. Whether you're replying to a message, drafting an email, writing an essay, or building a resume, our tools help you write faster and sound your best. We focus on real writing assistance — boosting your productivity and creativity without taking your voice away. Trusted by students, professionals, and non-native English speakers who want to communicate with confidence.
            </div>
          </Card>

          {divider}

          {/* MODES — tarot section */}
          <div style={{margin:"0 -20px",padding:"34px 20px 30px",background:"radial-gradient(ellipse at 50% 0%,rgba(169,139,240,0.08),transparent 60%),linear-gradient(180deg,#070b16,#090d1a)",borderTop:"1px solid #1a2236",borderBottom:"1px solid #1a2236",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",opacity:0.5}}>
              <svg width="100%" height="100%"><defs><radialGradient id="tgl" cx="50%" cy="0%" r="70%"><stop offset="0%" stopColor="#a98bf0" stopOpacity="0.06"/><stop offset="100%" stopColor="transparent"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#tgl)"/></svg>
            </div>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:7}}>
                <span style={{width:34,height:1,background:"linear-gradient(90deg,transparent,#c9a227)"}}/>
                <span style={{fontSize:11,letterSpacing:"0.28em",color:"#c9a227",fontWeight:700}}>✧ FEATURES ✧</span>
                <span style={{width:34,height:1,background:"linear-gradient(90deg,#c9a227,transparent)"}}/>
              </div>
              <div style={{textAlign:"center",fontSize:25,fontWeight:700,color:"#f2e8d0",letterSpacing:"0.01em",fontFamily:"'Instrument Serif',Georgia,serif",lineHeight:1.15}}>Explore Our Writing Tools</div>
              <div style={{textAlign:"center",fontSize:13.5,color:"#9a8f78",marginTop:8,marginBottom:22,lineHeight:1.6}}>Nine focused tools, each built for a specific kind of writing.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
                {TAROT_TOOLS.map(t=>(<TarotCard key={t.id} tool={t}/>))}
              </div>
              <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"#7d7257"}}>✦ Tap any card to reveal what it does ✦</div>
            </div>
          </div>

          {divider}

          {/* PRICING */}
          <SectionTitle kicker="Pricing" title="Simple, fair pricing" sub="Start free. Upgrade only when you need more."/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {PLANS.map(p=>(
              <div key={p.name} style={{background:p.popular?`linear-gradient(150deg,${p.color}14,${C.card})`:C.card,border:`1px solid ${p.popular?p.color:C.border}`,borderRadius:12,padding:"16px",position:"relative",boxShadow:p.popular?`0 0 24px ${p.color}22`:"none"}}>
                {p.popular&&<div style={{position:"absolute",top:-1,right:14,background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:10,fontWeight:900,letterSpacing:"0.08em",padding:"3px 10px",borderRadius:"0 0 6px 6px"}}>MOST POPULAR</div>}
                <div style={{fontSize:12,letterSpacing:"0.12em",color:p.color,textTransform:"uppercase",fontWeight:800,marginBottom:6}}>{p.name}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:"-0.02em"}}>{p.price}</span>
                  <span style={{fontSize:13,color:C.muted}}>{p.per}</span>
                </div>
                {p.note&&<div style={{fontSize:12,color:C.green,marginTop:2}}>{p.note}</div>}
                <ul style={{listStyle:"none",margin:"12px 0 14px",display:"flex",flexDirection:"column",gap:6}}>
                  {p.feats.map(f=>(<li key={f} style={{fontSize:13,color:C.text,display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:p.color,flexShrink:0}}>✓</span>{f}</li>))}
                </ul>
                <button onClick={onGetStarted} style={{width:"100%",padding:"11px",borderRadius:9,border:p.popular?"none":`1px solid ${C.border}`,background:p.popular?`linear-gradient(135deg,${C.blue},${C.accent})`:"transparent",color:p.popular?"#000":C.text,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{p.cta} →</button>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:12}}>All paid plans include a 3-day free trial. Cancel anytime.</div>

          {divider}

          {/* FAQ */}
          <SectionTitle kicker="FAQ" title="Frequently asked questions"/>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {FAQS.map((f,i)=>{
              const open=faqOpen===i;
              return(
                <div key={i} style={{background:C.card,border:`1px solid ${open?C.blue:C.border}`,borderRadius:10,overflow:"hidden",transition:"border-color 0.2s"}}>
                  <button onClick={()=>setFaqOpen(open?null:i)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"13px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                    <span style={{fontSize:14,fontWeight:700,color:open?"#fff":C.text}}>{f.q}</span>
                    <span style={{fontSize:18,color:open?C.blue:C.muted,flexShrink:0,transform:open?"rotate(45deg)":"none",transition:"transform 0.2s"}}>+</span>
                  </button>
                  {open&&<div style={{padding:"0 14px 14px",fontSize:13,color:C.muted,lineHeight:1.65,animation:"fadeUp 0.2s ease"}}>{f.a}</div>}
                </div>
              );
            })}
          </div>

          {divider}

          {/* LATEST UPDATES */}
          <SectionTitle kicker="News" title="Latest Updates"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {UPDATES.map((u,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.06em",color:u.tagColor,background:u.tagColor+"1a",padding:"2px 7px",borderRadius:4,textTransform:"uppercase"}}>{u.tag}</span>
                  <span style={{fontSize:12,color:C.muted}}>{u.date}</span>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:3}}>{u.title}</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.55}}>{u.text}</div>
              </div>
            ))}
          </div>

          {divider}

          {/* CONTACT & FEEDBACK */}
          <SectionTitle kicker="Contact" title="Help us shape GhostwriterMe" sub="We're constantly improving. Share questions, ideas, suggestions, or partnership opportunities — we'd love to hear from you."/>
          <Card>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:C.accentSoft,border:"1px solid rgba(121,186,236,0.22)",borderRadius:8,padding:"9px 12px",marginBottom:14}}>
              <div><div style={{fontSize:11,color:C.muted,letterSpacing:"0.05em"}}>EMAIL US</div><div style={{fontSize:13,fontWeight:700,color:C.blue}}>{CONTACT_EMAIL}</div></div>
              <button onClick={()=>navigator.clipboard.writeText(CONTACT_EMAIL)} style={{padding:"5px 10px",borderRadius:6,background:"transparent",border:"1px solid rgba(121,186,236,0.3)",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Copy</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{marginBottom:11}}>
                <label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Name</label>
                <input value={cfName} onChange={e=>setCfName(e.target.value)} placeholder="Your name" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
              <div style={{marginBottom:11}}>
                <label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Email</label>
                <input value={cfEmail} onChange={e=>setCfEmail(e.target.value)} placeholder="you@email.com" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
            </div>
            <div style={{marginBottom:11}}>
              <label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Type</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Question","Feedback","Suggestion","Partnership"].map(t=>(
                  <button key={t} onClick={()=>setCfType(t)} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${cfType===t?C.blue:C.border}`,background:cfType===t?C.accentSoft:"transparent",color:cfType===t?C.blue:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Message</label>
              <textarea value={cfMsg} onChange={e=>setCfMsg(e.target.value)} rows={4} placeholder="Share your question, idea, or feedback..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 13px",color:C.text,fontSize:14,lineHeight:1.6,resize:"vertical",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            <button onClick={sendContact} disabled={!cfMsg.trim()} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:cfMsg.trim()?`linear-gradient(135deg,${C.blue},${C.accent})`:"#0c1220",color:cfMsg.trim()?"#000":C.muted,fontSize:14,fontWeight:800,cursor:cfMsg.trim()?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s"}}>Send Message →</button>
            <div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:8}}>Opens your email app with the message pre-filled.</div>
          </Card>

          {divider}

          {/* FINAL CTA */}
          <SectionTitle title="Ready to write better?" sub="Join now and start using nine AI writing tools — free."/>
          {ctaButtons({})}

          <div style={{marginTop:32,textAlign:"center",fontSize:12,color:"#1e3448",lineHeight:1.8}}>
            <div style={{fontSize:18,marginBottom:6}}>👻</div>
            GhostwriterMe &middot; Your Words. Perfected.<br/>
            © 2026 GhostwriterMe. All rights reserved.
          </div>
        </div>
      </div>
    </div>
    </>
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
function SettingsScreen({user,onBack,onSignOut,onSave,onContact,onShowTerms,onShowPrivacy,onChangePlan,onCancelPlan}){
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
          <Avatar avatar={user.avatar} size={50}/>
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

        <Section title={<>Language <span style={{marginLeft:6,fontSize:9,fontWeight:800,letterSpacing:"0.06em",color:C.yellow,background:"rgba(245,200,66,0.12)",padding:"2px 6px",borderRadius:4,textTransform:"uppercase"}}>Coming Soon</span></>}>
          <div style={{padding:"13px 14px"}}>
            <div style={{position:"relative",opacity:0.5,cursor:"not-allowed"}} title="Multilingual support is coming soon">
              {/* onChange stays wired even though disabled prevents it firing —
                  setLanguage is still referenced in handleSave below; removing
                  it would trigger the same no-unused-vars build failure we hit
                  with setTab earlier in this project. */}
              <select disabled value={language} onChange={e=>setLanguage(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 32px 10px 12px",color:C.text,fontSize:14,fontFamily:"inherit",cursor:"not-allowed",pointerEvents:"none"}}>
                <option value="en">🇬🇧 English</option>
                <option value="th">🇹🇭 ภาษาไทย</option>
              </select>
              <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted,fontSize:12}}>▾</span>
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.5}}>🌐 Multilingual support is on the way — English is the only language for now.</div>
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
          <Row icon="🔒" label="Privacy Policy" onClick={onShowPrivacy}>
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
  const [tab]=useState(defaultTab);const [showEmail,setShowEmail]=useState(false);
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [pw,setPw]=useState("");
  const [age,setAge]=useState("");const [showPw,setShowPw]=useState(false);
  const [agreed,setAgreed]=useState(false);const [loading,setLoading]=useState(null);
  const [errs,setErrs]=useState({});const [showTC,setShowTC]=useState(false);
  const handleSocial=id=>{
  if(id==="email"){setShowEmail(true);return;}
  if(id==="google"){
    // Real Google OAuth via Google Identity Services
    if(!window.google){
      alert("Google sign-in not loaded yet. Please refresh and try again.");
      return;
    }
    setLoading("google");
    const client=window.google.accounts.oauth2.initTokenClient({
      client_id:process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope:"openid email profile",
      callback:async(tokenResponse)=>{
        if(tokenResponse.error){
          setLoading(null);
          alert("Google sign-in failed. Please try again.");
          return;
        }
        try{
          // Fetch the user's Google profile
          const profileRes=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{
            headers:{Authorization:"Bearer "+tokenResponse.access_token},
          });
          const profile=await profileRes.json();
          setLoading(null);
          onAuth({
            name:profile.name||profile.given_name||"User",
            email:profile.email,
            avatar:profile.picture||"🧠",
            plan:"free",
            googleId:profile.sub,
          });
        }catch(err){
          setLoading(null);
          alert("Could not get Google profile. Please try again.");
        }
      },
    });
    client.requestAccessToken();
    return;
  }
};
  const handleSubmit=()=>{const e={};if(!email.includes("@"))e.email="Enter a valid email";if(pw.length<6)e.pw="6+ characters";if(tab==="signup"){if(!name.trim())e.name="Required";const n=parseInt(age,10);if(!age||isNaN(n)||n<1||n>120)e.age="Enter valid age";else if(n<13)e.age="Must be 13 or older";if(!agreed)e.terms="Required";}if(Object.keys(e).length){setErrs(e);return;}setLoading("email");setTimeout(()=>{setLoading(null);onAuth({name:tab==="signup"?name:"Demo User",email,avatar:"✨",plan:"free"});},1300);};
  return(
    <>{showTC&&<TermsModal onClose={()=>setShowTC(false)}/>}
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{textAlign:"center",marginBottom:26,animation:"fadeUp 0.4s ease"}}><div style={{fontSize:32,fontWeight:900,letterSpacing:"-0.02em",color:"#fff",lineHeight:1}}>👻 GhostwriterMe</div><div style={{fontSize:11,color:C.muted,letterSpacing:"0.18em",marginTop:5}}>AI WRITING SUITE</div></div>
      <div style={{width:"100%",maxWidth:370,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 18px",animation:"fadeUp 0.4s 0.08s ease both",boxShadow:"0 20px 50px rgba(0,0,0,0.7)"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>{tab==="signin"?"Sign In":"Create Account"}</div>
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
  const [tab,setTab]=useState("pro");const [proBill,setProBill]=useState("monthly");const [stuBill,setStuBill]=useState("monthly");
  // True once this browser has consumed its cardless trial (trialPlan covers
  // sessions stored before the trialUsed flag existed). Drives honest CTA
  // labels: "Start Free Trial" would be false advertising for these users,
  // whose click now leads to an immediately-charged subscription.
  const trialUsed=!!(user&&(user.trialUsed||user.trialPlan));

  const FREE_F=["15 AI replies / day","Email Mode — unlimited","Grammar check","History (last 50)","🎤 Voice input on all fields","🔊 Text-to-speech on all outputs"];
  const PRO_F=["Unlimited AI replies","✍️ Essay Writer (CEFR A1–C2)","💼 CV / Resume Builder","📖 Author Mode (12 genres)","🎬 Story Analyzer — books & films","Full history across all modes","Priority generation speed"];
  const STU_F=["Everything in Pro","🎓 Academic Essay + auto-citations (Student exclusive)","🧠 Humanize My Writing (Student exclusive)","CEFR-matched voice output","Draft-to-final coaching","Argument weakness scanner","Student voice calibration","Priority support"];

  const allProF=[...FREE_F,...PRO_F];const allStuF=[...FREE_F,...PRO_F,...STU_F];
  const tabs=[{id:"free",label:"Free",color:C.green},{id:"pro",label:"Pro",color:C.blue},{id:"student",label:"🎓 Student",color:C.violet}];

  const getPrice=()=>{
    if(tab==="free")return{main:"$0",per:"forever",sub:null,intro:null};
    if(tab==="pro"){
      if(proBill==="monthly")return{main:"$7",per:"/ month",sub:"First 3 months — new users",intro:"Then $12 / month"};
      return{main:"$60",per:"/ year",sub:"Best annual rate",intro:null};
    }
    if(stuBill==="monthly")return{main:"$15",per:"/ month",sub:"First 2 months — new users",intro:"Then $20 / month"};
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
          <Avatar avatar={user.avatar} size={38}/>
          <div><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Hey {user.name.split(" ")[0]} 👋</div><div style={{fontSize:13,color:C.muted}}>{user.email}</div></div>
        </div>
        <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",marginBottom:4,animation:"fadeUp 0.4s 0.05s ease both"}}>Choose your plan</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:18,animation:"fadeUp 0.4s 0.08s ease both"}}>All plans include voice input and text-to-speech.</div>
        <div style={{display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:3,marginBottom:14,animation:"fadeUp 0.4s 0.1s ease both"}}>
          {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 4px",borderRadius:7,border:"none",background:tab===t.id?t.color:"transparent",color:tab===t.id?"#000":C.muted,fontSize:13,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{t.label}</button>))}
        </div>
        {tab==="pro"&&(<div style={{display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:3,marginBottom:12,animation:"fadeUp 0.2s ease"}}>{[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly"}].map(b=>(<button key={b.id} onClick={()=>setProBill(b.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:proBill===b.id?C.blue:"transparent",color:proBill===b.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>))}</div>)}
        {tab==="student"&&(<div style={{display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:3,marginBottom:12,animation:"fadeUp 0.2s ease"}}>{[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly"}].map(b=>(<button key={b.id} onClick={()=>setStuBill(b.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:stuBill===b.id?C.violet:"transparent",color:stuBill===b.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>))}</div>)}
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
          {tab!=="free"&&!trialUsed&&(<div style={{background:tab==="student"?C.violetSoft:C.accentSoft,border:`1px solid ${tab==="student"?"rgba(155,127,232,0.2)":"rgba(121,186,236,0.2)"}`,borderRadius:8,padding:"9px 11px",marginBottom:13,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🎁</span><div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>3-day free trial</div><div style={{fontSize:12,color:C.muted}}>No card required · Cancel anytime</div></div></div>)}
          {tab==="free"&&<SecBtn onClick={handleCTA}>Continue Free</SecBtn>}
          {tab==="pro"&&<PriBtn onClick={handleCTA}>{trialUsed?"Continue with Pro →":"Start Free Trial →"}</PriBtn>}
          {tab==="student"&&<PriBtn onClick={handleCTA} variant="violet">{trialUsed?"Continue with Student 🎓":"Start Student Free Trial 🎓"}</PriBtn>}
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:5,flexWrap:"wrap",animation:"fadeUp 0.4s 0.18s ease both"}}>
          {tabs.filter(t=>t.id!==tab).map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.color=t.color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>View {t.id==="student"?"Student":t.id==="pro"?"Pro":"Free"} plan</button>))}
        </div>
        <div style={{marginTop:24,textAlign:"center"}}><button onClick={onContact} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Questions? Contact us ✉️</button></div>
      </div>
    </div>
  );
}

/**
 * PaymentScreen.jsx — Real Stripe Elements payment flow
 * ────────────────────────────────────────────────────────
 * DROP-IN REPLACEMENT for the existing fake `PaymentScreen` function
 * in App.jsx (the one with raw <input> card fields and a setTimeout).
 *
 * WHERE THIS GOES
 * Find the entire block starting at:
 *     function PaymentScreen({user,billing,targetPlan,onComplete}){
 * and ending at its closing `}` (right before `function HistoryMode`).
 * Delete that whole block and paste everything below in its place.
 *
 * ALSO REQUIRED — two additions elsewhere in App.jsx:
 *
 * 1) At the very top of App.jsx, add these lines right after the
 *    existing `import React...` line:
 *
 *      import { loadStripe } from "@stripe/stripe-js";
 *      import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
 *
 *      // Initialized once, outside the component tree — Stripe's recommended pattern.
 *      // CRA reads env vars via process.env (NOT import.meta.env — that's Vite-only).
 *      const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
 *
 * 2) Install the packages if you haven't already:
 *      npm install @stripe/react-stripe-js @stripe/stripe-js
 *
 * 3) Confirm REACT_APP_STRIPE_PUBLISHABLE_KEY is set in Vercel
 *    (frontend-safe key, starts with pk_...). Same CRA-prefix rule as
 *    your Google Client ID fix — must be REACT_APP_, not VITE_.
 *
 * EDGE CASES HANDLED
 * - Stripe.js not finished loading yet (button disabled until ready)
 * - Invalid / declined / expired card (Stripe's own error message shown inline)
 * - 3D Secure step-up required by the bank (rare on a $0 trial, but handled)
 * - Network failure mid-request
 * - Backend returning a Stripe error (e.g. subscription creation failed)
 *
 * WHAT WAS REMOVED
 * The old fake "PayPal" button is gone — it never called any real PayPal
 * API, it was decorative. Real PayPal support would be a separate,
 * later integration.
 */

// ── Inner form: must render inside <Elements> so useStripe/useElements work ──
function StripeCardForm({user,billing,targetPlan,skipTrial,onComplete}){
  const stripe=useStripe();
  const elements=useElements();
  const isStudent=targetPlan==="student";
  const planColor=isStudent?C.violet:C.blue;

  const [loading,setLoading]=useState(false);
  const [cardErr,setCardErr]=useState("");
  const [step,setStep]=useState("form"); // "form" | "success"

  const priceDisplay=isStudent?(billing==="yearly"?"$96 / year":"$15 / month"):(billing==="yearly"?"$60 / year":"$7 / month");
  const introNote=isStudent&&billing!=="yearly"?"Intro offer · then $20 / month":!isStudent&&billing==="monthly"?"Intro offer · then $12 / month":null;

  // Styles the CardElement's internal iframe to match the app's dark theme
  const CARD_STYLE={
    style:{
      base:{color:"#ffffff",fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"14px","::placeholder":{color:C.muted}},
      invalid:{color:C.red,iconColor:C.red},
    },
  };

  const handlePay=async()=>{
    // Edge case: Stripe.js hasn't finished loading yet — button should already be
    // disabled for this (see `disabled={!stripe}` below), but guard anyway.
    if(!stripe||!elements)return;
    setLoading(true);
    setCardErr("");

    // Step 1: turn the raw card into a PaymentMethod. Card data never touches
    // our own React state or our server — Stripe's hosted iframe handles it.
    const cardElement=elements.getElement(CardElement);
    const{error:pmError,paymentMethod}=await stripe.createPaymentMethod({
      type:"card",
      card:cardElement,
      billing_details:{name:user?.name||"",email:user?.email||""},
    });

    if(pmError){
      // Edge case: invalid card number, expired card, etc. Stripe gives us a
      // human-readable message we can show directly.
      setCardErr(pmError.message);
      setLoading(false);
      return;
    }

    // Step 2: ask our backend to create the subscription with 3-day trial + intro pricing.
    try{
      const res=await fetch("/api/create-subscription",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          paymentMethodId:paymentMethod.id,
          email:user?.email||"",
          name:user?.name||"",
          plan:targetPlan,     // "pro" | "student"
          billing:billing,     // "monthly" | "yearly"
          skipTrial:!!skipTrial, // true if they already used a cardless trial for this plan
        }),
      });
      const data=await res.json();

      if(!res.ok){
        // Edge case: backend returned a Stripe error (declined card, etc.)
        setCardErr(data.error||"Payment failed. Please try again.");
        setLoading(false);
        return;
      }

      // Step 3: handle 3D Secure if the bank requires it (rare on a $0 trial
      // start, but some European banks require it even for authorization holds).
      if(data.clientSecret){
        const{error:confirmError}=await stripe.confirmCardPayment(data.clientSecret);
        if(confirmError){
          setCardErr(confirmError.message);
          setLoading(false);
          return;
        }
      }

      setStep("success");
    }catch(networkErr){
      // Edge case: network drop mid-request.
      setCardErr("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  if(step==="success")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:320,animation:"fadeUp 0.5s ease"}}>
        <div style={{fontSize:64,marginBottom:12,animation:"pulse 2s ease infinite"}}>🎉</div>
        <div style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",marginBottom:6}}>You're in!</div>
        <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:22}}>{isStudent?"Student plan activated!":"3-day free trial started."}<br/>All features unlocked. 🚀</div>
        <PriBtn onClick={onComplete} variant={isStudent?"violet":"blue"}>Enter the App →</PriBtn>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 14px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>Payment</div>
          <div style={{fontSize:13,color:C.muted}}>Secure checkout · SSL encrypted · Cancel anytime</div>
        </div>
        <Card style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>GhostwriterMe {isStudent?"Student":"Pro"}</div>
              <div style={{fontSize:13,color:C.muted,marginTop:1}}>{billing} · after 3-day trial</div>
              {introNote&&<div style={{fontSize:12,color:C.green,marginTop:4}}>{introNote}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:18,fontWeight:900,color:planColor}}>{priceDisplay.split(" ")[0]}</div>
              <div style={{fontSize:12,color:C.green,marginTop:1}}>{skipTrial?`Today: ${priceDisplay.split(" ")[0]} ✓`:"Today: $0.00 ✓"}</div>
            </div>
          </div>
        </Card>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:12}}>Card Details</div>
          <div style={{background:C.surface,border:`1px solid ${cardErr?C.red:C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:6}}>
            <CardElement options={CARD_STYLE} onChange={e=>setCardErr(e.error?e.error.message:"")}/>
          </div>
          {cardErr&&<div style={{fontSize:12,color:C.red,marginTop:4}}>⚠️ {cardErr}</div>}
          <div style={{fontSize:12,color:C.muted,marginTop:10}}>🔒 Processed by Stripe. We never store card data.</div>
        </Card>
        <PriBtn loading={loading} onClick={handlePay} variant={isStudent?"violet":"blue"} disabled={!stripe}>
          {skipTrial?"Confirm & Subscribe →":"Confirm & Start Free Trial →"}
        </PriBtn>
        <div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:7}}>🔒 Secure{skipTrial?" · Cancel anytime":" · No charge today · Cancel anytime"}</div>
      </div>
    </div>
  );
}

// ── Outer wrapper: provides the Stripe Elements context ──
function PaymentScreen({user,billing,targetPlan,skipTrial,onComplete}){
  return(
    <Elements stripe={stripePromise}>
      <StripeCardForm user={user} billing={billing} targetPlan={targetPlan} skipTrial={skipTrial} onComplete={onComplete}/>
    </Elements>
  );
}

// Shared follow-up chat (Item 3) used by Academic Reviewer AND Grammar (DRY).
// Stateless API strategy: callClaude has no server-side memory, so every send
// embeds the full context + conversation so far in one user message.
function FollowUpChat({context,intro,accent}){
  const [msgs,setMsgs]=useState([]);
  const [q,setQ]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const ac=accent||C.blue;

  const send=async()=>{
    const question=q.trim();
    if(!question||busy)return;
    setBusy(true);setErr("");setQ("");
    const history=[...msgs,{role:"user",content:question}];
    setMsgs(history); // optimistic append so the question shows instantly
    const sys="You are a friendly, specific writing coach answering follow-up questions about the student's work and the feedback below. Reference their actual text where possible. Keep answers under ~200 words unless more detail is explicitly requested. Do not rewrite the whole piece unless asked.\n\n=== CONTEXT ===\n"+context.slice(0,9000); // cap: very long essays must not blow the prompt budget
    const convo=history.map(m=>(m.role==="user"?"STUDENT":"COACH")+": "+m.content).join("\n\n");
    try{
      const reply=await callClaude(sys,convo,1200);
      setMsgs(h=>[...h,{role:"ai",content:reply}]);
    }catch(e){
      // Edge case: on failure, roll back the optimistic question and restore
      // it to the input so the user can retry without retyping.
      setErr(e.message||"Something went wrong.");
      setMsgs(h=>h.slice(0,-1));
      setQ(question);
    }finally{setBusy(false);}
  };

  return(
    <Card style={{marginTop:10}}>
      <div style={{fontSize:11,color:ac,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>💬 Ask a Follow-Up</div>
      {msgs.length===0&&<div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:10}}>{intro}</div>}
      {msgs.map((m,i)=>(
        <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
          <div style={{maxWidth:"85%",padding:"9px 12px",borderRadius:10,background:m.role==="user"?ac:C.surface,color:m.role==="user"?"#000":C.text,fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.content}</div>
        </div>
      ))}
      {busy&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Spin size={14} color={ac}/><span style={{fontSize:12,color:C.muted}}>Thinking...</span></div>}
      {err&&<ErrBox msg={err}/>}
      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4}}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder="e.g. How can I strengthen my thesis?" style={{flex:1,minWidth:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=ac} onBlur={e=>e.target.style.borderColor=C.border}/>
        <MicBtn onResult={t=>setQ(v=>v+(v?" ":"")+t)} sm/>
        <button onClick={send} disabled={busy||!q.trim()} style={{padding:"9px 14px",borderRadius:8,border:"none",background:busy||!q.trim()?"#0c1220":ac,color:busy||!q.trim()?C.muted:"#000",fontSize:13,fontWeight:800,cursor:busy||!q.trim()?"not-allowed":"pointer",fontFamily:"inherit",flexShrink:0}}>Send</button>
      </div>
    </Card>
  );
}

// Module-scope so both HistoryMode and HistoryDetailModal share one source (DRY).
const HIST_ML={reply:"AI Reply",email:"Email",essay:"Essay",academic:"Academic",cv:"CV",author:"Author",grammar:"Grammar",humanize:"Humanize",story:"Story Guide"};
const HIST_MI={reply:"💬",email:"📧",essay:"✍️",academic:"🎓",cv:"💼",author:"📖",grammar:"✅",humanize:"🧠",story:"🎬"};

// "More Details" bottom sheet (Item 2): full prompt, full output, precise
// timestamp, and mode — the inline View row truncates output to 200px, this
// shows everything with copy/listen/save actions.
function HistoryDetailModal({item,onClose}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:520,background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 0 0",padding:"20px 16px 30px",animation:"slideUpModal 0.3s ease",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:32,height:3,borderRadius:2,background:C.border,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{fontSize:22}}>{HIST_MI[item.mode]||"📝"}</span>
          <div style={{minWidth:0}}>
            <div style={{fontSize:15,fontWeight:900,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title||"Untitled"}</div>
            <div style={{fontSize:12,color:C.muted}}>{HIST_ML[item.mode]||item.mode}</div>
          </div>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>🕐 {new Date(item.ts).toLocaleString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
        {item.input&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Prompt / Input</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",maxHeight:160,overflowY:"auto"}}>{item.input}</div>
          </div>
        )}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Generated Content</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",maxHeight:"42vh",overflowY:"auto"}}>{item.output}</div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
          <CopyBtn text={item.output||""}/>
          <ListenBtn text={item.output||""}/>
          <SaveAsImageBtn text={item.output||""} title={HIST_ML[item.mode]||"History"}/>
        </div>
        <SecBtn onClick={onClose}>Close</SecBtn>
      </div>
    </div>
  );
}

function HistoryMode({user}){
  const [filter,setFilter]=useState("all");const [items,setItems]=useState([]);const [exp,setExp]=useState(null);const [detail,setDetail]=useState(null);
  const ML=HIST_ML;
  const MI=HIST_MI;
  useEffect(()=>{setItems(HS.loadAll(user.email));},[user.email]);
  const filtered=filter==="all"?items:items.filter(i=>i.mode===filter);
  if(!items.length)return(<div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:40,marginBottom:10}}>🕐</div><div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:5}}>No history yet</div><div style={{fontSize:13,color:C.muted}}>Generated content will appear here.</div></div>);
  return(<div><div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:3}}>{["all",...Object.keys(ML)].map(m=>(<button key={m} onClick={()=>setFilter(m)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,border:`1px solid ${filter===m?C.blue:C.border}`,background:filter===m?C.accentSoft:"transparent",color:filter===m?C.blue:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{m==="all"?"All":(MI[m]||"")+" "+(ML[m]||m)}</button>))}</div><div style={{fontSize:12,color:C.muted,marginBottom:9}}>{filtered.length} item{filtered.length!==1?"s":""}</div>{filtered.map(item=>(<Card key={item.id} style={{marginBottom:8}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:exp===item.id?9:0}}><div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}><span style={{fontSize:16,flexShrink:0}}>{MI[item.mode]||"📝"}</span><div style={{minWidth:0}}><div style={{fontSize:12,color:C.muted}}>{ML[item.mode]||item.mode} · {new Date(item.ts).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div><div style={{fontSize:13,color:C.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title||item.output?.slice(0,55)||"Untitled"}</div></div></div><button onClick={()=>setDetail(item)} style={{flexShrink:0,padding:"4px 8px",borderRadius:5,border:`1px solid ${C.blue}55`,background:"transparent",color:C.blue,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginLeft:6}}>Details</button><button onClick={()=>setExp(exp===item.id?null:item.id)} style={{flexShrink:0,padding:"4px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginLeft:6}}>{exp===item.id?"Hide":"View"}</button></div>{exp===item.id&&(<div style={{animation:"fadeUp 0.2s ease"}}>{item.input&&<div style={{fontSize:12,color:C.muted,background:C.surface,borderRadius:6,padding:"7px 10px",marginBottom:7,lineHeight:1.5}}><strong>Input:</strong> {item.input}</div>}<div style={{fontSize:13,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto",background:C.surface,borderRadius:6,padding:"9px 11px"}}>{item.output}</div><OutputActions text={item.output}/></div>)}</Card>))}{detail&&<HistoryDetailModal item={detail} onClose={()=>setDetail(null)}/>}</div>);
}

function ReplyMode({user,isPro}){
  const [msg,setMsg]=useState("");const [tone,setTone]=useState("confident");const [noDesp,setNoDesp]=useState(false);
  const [replies,setReplies]=useState([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const FREE_LIMIT=15;const ref=useRef(null);
  // Real per-day counter (Item 3). The old useState(0) reset on every remount,
  // so "3/day" was actually "3 per visit". Edge cases: key embeds the calendar
  // date so the count self-resets at midnight with no cleanup job; try/catch
  // covers private-browsing modes where localStorage access throws.
  const usageKey="gwm_replies_"+(user?.email||"anon")+"_"+new Date().toISOString().slice(0,10);
  const [used,setUsed]=useState(()=>{try{return parseInt(localStorage.getItem(usageKey)||"0",10)||0;}catch{return 0;}});
  // Midnight rollover fix: with keep-mounted modes this component can stay
  // alive across days. usageKey recomputes per render, but useState only ran
  // once — so when the date changes we must re-read the (new, empty) day's
  // count, or yesterday's total would wrongly block/carry into today.
  useEffect(()=>{
    try{setUsed(parseInt(localStorage.getItem(usageKey)||"0",10)||0);}catch{setUsed(0);}
  },[usageKey]);
  const gen=async()=>{
    if(!msg.trim())return;if(!isPro&&used>=FREE_LIMIT){setError("Free limit reached.");return;}
    setLoading(true);setError("");setReplies([]);
    const t=TONES.find(x=>x.id===tone);
    const sys="You are GhostwriterMe — witty, socially calibrated. No em-dashes. "+(noDesp?"Strip ALL clingy energy. Unbothered only. ":"")+"Tone: "+t.label+" — "+t.desc+". Return ONLY valid JSON: {\"replies\":[{\"option\":1,\"text\":\"...\",\"vibe\":\"one-word\"},{\"option\":2,\"text\":\"...\",\"vibe\":\"one-word\"},{\"option\":3,\"text\":\"...\",\"vibe\":\"one-word\"}]}";
    try{const raw=await callClaude(sys,'Message:\n"'+msg+'"',1000,imgData,imgType);const p=JSON.parse(raw.replace(/```json|```/g,"").trim());setReplies(p.replies||[]);setUsed(u=>{const n=u+1;try{localStorage.setItem(usageKey,String(n));}catch{}return n;});if(user&&p.replies?.[0])HS.save(user.email,"reply",{title:"Reply to: "+msg.slice(0,40),input:msg,output:p.replies[0].text});setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),80);}
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
  const [text,setText]=useState("");const [style,setStyle]=useState("formal");const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);const [genId,setGenId]=useState(0);
  const check=async()=>{if(!text.trim())return;setLoading(true);setError("");setRes(null);const s=GRAMMAR_STYLES.find(x=>x.id===style);try{const raw=await callClaude("Expert grammar checker. Return ONLY valid JSON: {\"errors\":[{\"type\":\"grammar|spelling|punctuation|style\",\"original\":\"...\",\"fixed\":\"...\",\"explanation\":\"brief\"}],\"rewritten\":\"full rewritten\",\"score\":0-100,\"summary\":\"one sentence\"}","Check & rewrite in "+s.label+" ("+s.desc+") style:\\n\\n\""+text+"\"",2000,imgData,imgType);const r=JSON.parse(raw.replace(/```json|```/g,"").trim());setRes(r);setGenId(g=>g+1);if(user)HS.save(user.email,"grammar",{title:"Grammar: "+text.slice(0,40),input:text,output:r.rewritten});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  const sc=res?(res.score>=80?C.green:res.score>=60?C.yellow:C.red):C.blue;
  return(<div><FArea label="Paste Your Text" placeholder="Any text — email, essay, message..." value={text} onChange={e=>setText(e.target.value)} rows={6} voice/><div style={{marginBottom:12}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Rewrite Style</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{GRAMMAR_STYLES.map(s=><button key={s.id} onClick={()=>setStyle(s.id)} style={{background:style===s.id?C.accentSoft:C.surface,border:`1px solid ${style===s.id?C.blue:C.border}`,borderRadius:8,padding:"11px 7px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:18,marginBottom:4}}>{s.icon}</div><div style={{fontSize:13,fontWeight:700}}>{s.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2,lineHeight:1.3}}>{s.desc}</div></button>)}</div></div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={check} loading={loading} disabled={!text.trim()}>✅ Check & Rewrite</PriBtn>{error&&<ErrBox msg={error}/>}{res&&<div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><Card style={{marginBottom:9,display:"flex",alignItems:"center",gap:14}}><div style={{width:54,height:54,borderRadius:"50%",border:`3px solid ${sc}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:16,fontWeight:900,color:sc,lineHeight:1}}>{res.score}</span><span style={{fontSize:11,color:C.muted}}>SCORE</span></div><div><div style={{fontSize:14,color:C.text,marginBottom:2}}>{res.summary}</div><div style={{fontSize:13,color:C.muted}}>{res.errors?.length||0} issue{res.errors?.length!==1?"s":""} found</div></div></Card>{res.errors?.length>0&&<Card style={{marginBottom:9}}><div style={{fontSize:11,color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Issues Found</div>{res.errors.map((e,i)=>{const tc={grammar:C.red,spelling:"#93c5fd",punctuation:C.green,style:"#c4b5fd"}[e.type]||C.muted;return<div key={i} style={{padding:"8px 0",borderBottom:i<res.errors.length-1?`1px solid ${C.border}`:"none"}}><span style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:tc,background:tc+"22",padding:"2px 5px",borderRadius:3}}>{e.type}</span><div style={{display:"flex",gap:6,fontSize:13,marginTop:5,marginBottom:2,flexWrap:"wrap",alignItems:"center"}}><span style={{color:C.red,textDecoration:"line-through"}}>{e.original}</span><span style={{color:C.muted}}>→</span><span style={{color:C.green}}>{e.fixed}</span></div><div style={{fontSize:12,color:C.muted}}>{e.explanation}</div></div>;})}</Card>}<Card><div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Rewritten — {GRAMMAR_STYLES.find(s=>s.id===style)?.label}</div><div style={{fontSize:14,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap"}}>{res.rewritten}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res.rewritten}/><ListenBtn text={res.rewritten}/><SaveAsImageBtn text={res.rewritten} title="Grammar Rewrite"/></div></Card><FollowUpChat key={genId} context={"ORIGINAL TEXT:\n"+text.slice(0,4000)+"\n\nISSUES FOUND:\n"+JSON.stringify(res.errors||[])+"\n\nREWRITTEN VERSION:\n"+(res.rewritten||"").slice(0,4000)} intro="Ask about any correction — e.g. why something was changed, or the grammar rule behind it." accent={C.blue}/></div>}</div>);
}

function EssayMode({user}){
  const [topic,setTopic]=useState("");const [details,setDetails]=useState("");const [level,setLevel]=useState("B2");const [type,setType]=useState("Argumentative");const [wc,setWc]=useState("500");const [essay,setEssay]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const LD={A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-intermediate",C1:"Advanced",C2:"Mastery"};
  const gen=async()=>{if(!topic.trim())return;setLoading(true);setError("");setEssay("");try{const res=await callClaude("Expert essay writer. Calibrate EXACTLY to CEFR level. Write ONLY the essay.","Write a "+type+" essay on: \""+topic+"\"\\nKey points: "+(details||"none")+"\\nCEFR: "+level+"\\nWords: ~"+wc,2000,imgData,imgType);setEssay(res);if(user)HS.save(user.email,"essay",{title:topic,input:type+", "+level+", "+wc+"w",output:res});}catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}};
  return(<div><FArea label="Essay Topic" placeholder="e.g. The impact of social media on mental health" value={topic} onChange={e=>setTopic(e.target.value)} rows={2} voice/><FArea label="Key Points (optional)" placeholder="e.g. Stats, comparisons, case studies..." value={details} onChange={e=>setDetails(e.target.value)} rows={3} voice/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><FSelect label="Essay Type" value={type} onChange={setType} options={ESSAY_TYPES}/><FSelect label="Word Count" value={wc} onChange={setWc} options={["100","150","200","300","500","750","1000","1500","2000"].map(n=>({value:n,label:n+" words"}))}/></div><div style={{marginBottom:13}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:7}}>English Level (CEFR)</div><div style={{display:"flex",gap:5}}>{LEVELS.map(l=><button key={l} onClick={()=>setLevel(l)} style={{flex:1,padding:"7px 2px",borderRadius:6,background:level===l?C.accentSoft:C.surface,border:`1px solid ${level===l?C.blue:C.border}`,color:level===l?"#fff":C.muted,fontSize:13,fontWeight:level===l?800:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>{LD[level]}</div></div><ImageInput onImage={(d,t)=>{setImgData(d);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/><PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>✍️ Generate Essay</PriBtn>{error&&<ErrBox msg={error}/>}{essay&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{type} · {level}</span><span style={{fontSize:12,color:C.muted}}>~{essay.split(/\s+/).length}w</span></div><div style={{fontSize:14,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{essay}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={essay}/><ListenBtn text={essay}/><SaveAsImageBtn text={essay} title={type+" Essay"}/></div></Card>}</div>);
}


function IntegrityModal({type,accepted,onAccept,onCancel}){
  const [checked,setChecked]=useState(false);
  const isAcademic=type==="academic";
  const title=isAcademic?"Academic Integrity Notice":"Responsible Use Notice";
  const checkLabel=isAcademic?"I have read and understood this Academic Integrity Notice.":"I have read and understood this Responsible Use Notice.";
  const body=isAcademic
    ?`This Academic mode is intended to assist with research, brainstorming, outlining, and understanding academic writing structures. The generated content should be used as a reference, example, or starting point only.

We strongly recommend that users review, revise, and develop the content using their own ideas, analysis, and understanding before submitting any academic work.

Users are solely responsible for ensuring that their use of this tool complies with the academic integrity policies of their school, university, or institution. GhostwriterMe does not encourage or endorse plagiarism, academic dishonesty, or the submission of AI-generated content as original work.`
    :`The Humanize feature is designed to improve readability, clarity, tone, and natural language flow. It should be used to enhance and refine content, not to misrepresent authorship or circumvent academic, workplace, or institutional policies.

Users are responsible for ensuring that their use of this feature complies with applicable rules, guidelines, and integrity standards. GhostwriterMe does not encourage or endorse plagiarism, academic dishonesty, or attempts to evade AI detection systems.`;

  return(
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}
      onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div style={{width:"100%",maxWidth:500,background:"#0c1220",border:"1px solid #162030",borderRadius:"14px 14px 0 0",padding:"20px 18px 32px",animation:"slideUpModal 0.3s ease",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:32,height:3,borderRadius:2,background:"#162030",margin:"0 auto 18px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:10,background:"rgba(245,200,66,0.12)",border:"1px solid rgba(245,200,66,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>⚠️</div>
          <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{title}</div>
        </div>
        {accepted&&(
          <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(61,219,164,0.08)",border:"1px solid rgba(61,219,164,0.25)",borderRadius:8,padding:"8px 12px",marginBottom:14}}>
            <span style={{color:"#3ddba4",fontSize:14,fontWeight:900}}>✓</span>
            <span style={{fontSize:13,color:"#3ddba4",fontWeight:600}}>You have already accepted this notice.</span>
          </div>
        )}
        <div style={{background:"rgba(245,200,66,0.05)",border:"1px solid rgba(245,200,66,0.15)",borderRadius:9,padding:"14px",marginBottom:16}}>
          <div style={{fontSize:13,color:"#c8a020",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{body}</div>
        </div>
        {accepted?(
          <button onClick={onCancel} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#79BAEC,#a8d4f5)",color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
            Close
          </button>
        ):(
          <>
            <div onClick={()=>setChecked(!checked)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px",background:checked?"rgba(121,186,236,0.08)":"#080d14",border:`1px solid ${checked?"#79BAEC":"#162030"}`,borderRadius:9,cursor:"pointer",marginBottom:16,transition:"all 0.15s"}}>
              <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?"#79BAEC":"#162030"}`,background:checked?"#79BAEC":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                {checked&&<span style={{color:"#000",fontSize:12,fontWeight:900}}>✓</span>}
              </div>
              <div style={{fontSize:13,color:checked?"#fff":"#8eacc4",lineHeight:1.5}}>{checkLabel}</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={onCancel} style={{flex:1,padding:"11px",borderRadius:8,background:"transparent",border:"1px solid #162030",color:"#8eacc4",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#79BAEC";e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#162030";e.currentTarget.style.color="#8eacc4";}}>
                Cancel
              </button>
              <button onClick={()=>{if(checked)onAccept();}} disabled={!checked} style={{flex:2,padding:"11px",borderRadius:8,border:"none",background:checked?"linear-gradient(135deg,#79BAEC,#a8d4f5)":"#0c1220",color:checked?"#000":"#8eacc4",fontSize:14,fontWeight:800,cursor:checked?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s",boxShadow:checked?"0 4px 20px rgba(121,186,236,0.3)":"none"}}>
                I Agree →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ ACADEMIC REVIEWER (primary) ============
function AcademicReviewer({user}){
  const [text,setText]=useState("");
  const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [genId,setGenId]=useState(0);

  const analyze=async()=>{
    if(!text.trim()&&!imgData){setError("Paste your essay or attach an image of it first.");return;}
    setLoading(true);setError("");setRes(null);
    const sys=`You are an academic writing coach and reviewer, like a university writing center tutor. Review the student's OWN essay and give constructive, educational feedback to help them improve it themselves. DO NOT rewrite the essay for them. Be specific and reference their actual content.

Return ONLY valid JSON, no markdown fences:
{
  "grade":"A|B|C|D",
  "range":"90-100|80-89|70-79|60-69",
  "numeric":<0-100 integer>,
  "summary":"one honest sentence overview",
  "categories":[
    {"name":"Writing Quality","score":<1-10>,"note":"grammar, spelling, punctuation, sentence structure, clarity, readability"},
    {"name":"Academic Quality","score":<1-10>,"note":"thesis strength, argument development, evidence, logical flow, organization, critical thinking"},
    {"name":"Academic Tone","score":<1-10>,"note":"formality, professionalism, consistency, objectivity"},
    {"name":"Citations","score":<1-10>,"note":"citation consistency, missing citations, reference formatting, style compliance"}
  ],
  "strengths":["specific strength","..."],
  "improvements":["specific weakness to address","..."],
  "revisions":["actionable step e.g. Rewrite paragraph 3 for clarity","..."]
}`;
    try{
      const raw=await callClaude(sys,"Review this essay:\n\n"+(text||"(see attached image)"),2500,imgData,imgType);
      const r=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setRes(r);
      setGenId(g=>g+1);
      if(user)HS.save(user.email,"academic",{title:"Review: "+(text.slice(0,40)||"essay"),input:"reviewer",output:"Grade "+(r.grade||"?")+" — "+(r.summary||"")});
    }catch(e){setError(e.message||"Something went wrong.");}
    finally{setLoading(false);}
  };

  const gradeColor=g=>g==="A"?C.green:g==="B"?C.blue:g==="C"?C.yellow:C.red;
  const barColor=s=>s>=8?C.green:s>=6?C.blue:s>=4?C.yellow:C.red;

  return(
    <div>
      <div style={{background:C.accentSoft,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 13px",marginBottom:14,display:"flex",gap:9}}>
        <span style={{fontSize:16,flexShrink:0}}>🔍</span>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.55}}>Paste your essay to get detailed, coach-style feedback on writing quality, argument strength, tone, and citations. This reviews <strong style={{color:C.text}}>your own work</strong> — it does not rewrite it for you.</div>
      </div>
      <FArea label="Paste Your Essay" placeholder="Paste your full essay or a section you want feedback on..." value={text} onChange={e=>setText(e.target.value)} rows={8} voice/>
      <ImageInput onImage={(dt,t)=>{setImgData(dt);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/>
      <PriBtn onClick={analyze} loading={loading} disabled={!text.trim()&&!imgData}>🔍 Analyze My Essay</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {res&&(
        <div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
          <Card style={{marginBottom:10,display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:68,height:68,borderRadius:"50%",border:`3px solid ${gradeColor(res.grade)}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:26,fontWeight:900,color:gradeColor(res.grade),lineHeight:1}}>{res.grade}</span>
              <span style={{fontSize:10,color:C.muted,marginTop:2}}>{res.numeric}/100</span>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Estimated Score · {res.range}</div>
              <div style={{fontSize:14,color:C.text,lineHeight:1.5}}>{res.summary}</div>
            </div>
          </Card>
          <div style={{background:"rgba(245,200,66,0.05)",border:"1px solid rgba(245,200,66,0.15)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#c8a020",lineHeight:1.5}}>⚠️ This is an AI estimate to guide your revision — not an official grade. Your instructor's assessment may differ.</div>

          <Card style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:11}}>Category Breakdown</div>
            {(res.categories||[]).map((cat,i)=>(
              <div key={i} style={{marginBottom:i<(res.categories.length-1)?12:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.text}}>{cat.name}</span>
                  <span style={{fontSize:12,color:barColor(cat.score),fontWeight:800}}>{cat.score}/10</span>
                </div>
                <div style={{height:5,background:C.surface,borderRadius:3,overflow:"hidden",marginBottom:4}}>
                  <div style={{width:(cat.score*10)+"%",height:"100%",background:barColor(cat.score),borderRadius:3,transition:"width 0.5s"}}/>
                </div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{cat.note}</div>
              </div>
            ))}
          </Card>

          {(res.strengths||[]).length>0&&(
            <Card style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.green,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:9}}>✓ Strengths</div>
              {res.strengths.map((s,i)=>(<div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.text,lineHeight:1.6,marginBottom:5}}><span style={{color:C.green,flexShrink:0}}>✓</span>{s}</div>))}
            </Card>
          )}
          {(res.improvements||[]).length>0&&(
            <Card style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.yellow,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:9}}>Areas for Improvement</div>
              {res.improvements.map((s,i)=>(<div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.text,lineHeight:1.6,marginBottom:5}}><span style={{color:C.yellow,flexShrink:0}}>→</span>{s}</div>))}
            </Card>
          )}
          {(res.revisions||[]).length>0&&(
            <Card>
              <div style={{fontSize:11,color:C.blue,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:9}}>Revision Suggestions</div>
              {res.revisions.map((s,i)=>(<div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.text,lineHeight:1.6,marginBottom:7,alignItems:"flex-start"}}><span style={{width:18,height:18,borderRadius:"50%",background:C.accentSoft,color:C.blue,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</span>{s}</div>))}
              <div style={{marginTop:10}}><CopyBtn text={(res.revisions||[]).map((s,i)=>(i+1)+". "+s).join("\n")}/></div>
            </Card>
          )}
          <FollowUpChat key={genId}
            context={"STUDENT ESSAY:\n"+(text||"(submitted as an image)")+"\n\nFEEDBACK GIVEN:\n"+JSON.stringify({grade:res.grade,numeric:res.numeric,summary:res.summary,categories:res.categories,strengths:res.strengths,improvements:res.improvements,revisions:res.revisions})}
            intro="Ask anything about your feedback — e.g. why a category scored low, or how to fix a specific weakness."
            accent={C.blue}/>
        </div>
      )}
    </div>
  );
}

// ============ RESEARCH ASSISTANT (secondary) ============
const RESEARCH_TASKS=[
  {id:"thesis",   icon:"🎯",label:"Thesis Ideas",      desc:"Generate thesis statement options"},
  {id:"outline",  icon:"📑",label:"Essay Outline",      desc:"Structure your paper"},
  {id:"arguments",icon:"💡",label:"Brainstorm Arguments",desc:"Develop your points"},
  {id:"questions",icon:"❓",label:"Research Questions", desc:"Frame your inquiry"},
  {id:"sources",  icon:"📚",label:"Source Types",       desc:"What evidence to look for"},
  {id:"structure",icon:"🏗️",label:"Paper Structure",    desc:"Section-by-section plan"},
  {id:"litreview",icon:"🔬",label:"Lit Review Framework",desc:"Organize your sources"},
];
function ResearchAssistant({user}){
  const [task,setTask]=useState("thesis");
  const [topic,setTopic]=useState("");const [ctx,setCtx]=useState("");
  const [out,setOut]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");

  const gen=async()=>{
    if(!topic.trim()){setError("Enter a topic first.");return;}
    setLoading(true);setError("");setOut("");
    const t=RESEARCH_TASKS.find(x=>x.id===task);
    const map={
      thesis:"Generate 3-4 possible thesis statement options for this topic, each taking a slightly different angle. Briefly explain the angle of each so the student can pick and develop their own.",
      outline:"Create a clear, logical essay outline with main sections and bullet points for what each should cover. Leave room for the student's own ideas.",
      arguments:"Brainstorm a range of possible arguments and counterarguments on this topic. Present them as options to consider, not a finished position.",
      questions:"Generate focused research questions the student could investigate on this topic, ranging from broad to specific.",
      sources:"Suggest the TYPES of sources and evidence to look for (e.g. peer-reviewed studies, primary documents, datasets) and where to find them. Do not fabricate specific citations.",
      structure:"Provide a section-by-section paper structure with guidance on the purpose of each section.",
      litreview:"Provide a framework for organizing a literature review on this topic (e.g. by theme, chronology, or methodology) with guidance on how to synthesize sources."
    };
    const sys="You are an academic research assistant and writing coach. Provide GUIDANCE-ORIENTED, educational support that helps students plan and develop their OWN work. Never write the finished assignment. Be encouraging and practical. Use clear headings and bullet points.";
    try{
      const res=await callClaude(sys,map[task]+"\n\nTopic: "+topic+(ctx?"\nContext: "+ctx:""),2000);
      setOut(res);
      if(user)HS.save(user.email,"academic",{title:t.label+": "+topic.slice(0,35),input:"research:"+task,output:res});
    }catch(e){setError(e.message||"Something went wrong.");}
    finally{setLoading(false);}
  };

  return(
    <div>
      <div style={{background:C.accentSoft,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 13px",marginBottom:14,display:"flex",gap:9}}>
        <span style={{fontSize:16,flexShrink:0}}>🧭</span>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.55}}>Plan and develop your own academic work. Get help with thesis ideas, outlines, arguments, and research direction.</div>
      </div>
      <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>What do you need help with?</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:13}}>
        {RESEARCH_TASKS.map(t=>(
          <button key={t.id} onClick={()=>setTask(t.id)} style={{background:task===t.id?C.accentSoft:C.surface,border:`1px solid ${task===t.id?C.blue:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
            <div style={{fontSize:16}}>{t.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{t.label}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1,lineHeight:1.3}}>{t.desc}</div>
          </button>
        ))}
      </div>
      <FInput label="Topic" placeholder="e.g. The impact of social media on teen mental health" value={topic} onChange={e=>setTopic(e.target.value)} icoL="🎩" voice/>
      <FArea label="Context (optional)" placeholder="Any specific angle, course requirements, or constraints..." value={ctx} onChange={e=>setCtx(e.target.value)} rows={2} voice/>
      <PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>🧭 Get Guidance</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {out&&(
        <Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
          <div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:9}}>{RESEARCH_TASKS.find(t=>t.id===task)?.label} · Guidance</div>
          <div style={{fontSize:14,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap"}}>{out}</div>
          <div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={out}/><ListenBtn text={out}/></div>
        </Card>
      )}
    </div>
  );
}

// ============ ACADEMIC DRAFT BUILDER ============
const CEFR_DESC={A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-Intermediate",C1:"Advanced",C2:"Proficient"};
function DraftBuilder({user}){
  const [topic,setTopic]=useState("");const [details,setDetails]=useState("");const [cites,setCites]=useState([{type:"url",value:""}]);const [wc,setWc]=useState("1000");const [style,setStyle]=useState("APA");const [level,setLevel]=useState("C1");const [essay,setEssay]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [imgData,setImgData]=useState(null);const [imgType,setImgType]=useState(null);
  const addC=()=>setCites([...cites,{type:"url",value:""}]);const remC=i=>setCites(cites.filter((_,j)=>j!==i));const updC=(i,fld,v)=>{const c=[...cites];c[i]={...c[i],[fld]:v};setCites(c);};
  const gen=async()=>{
    if(!topic.trim())return;setLoading(true);setError("");setEssay("");
    const cl=cites.filter(c=>c.value.trim()).map((c,i)=>"["+(i+1)+"] "+(c.type==="url"?"URL":"PDF")+": "+c.value).join("\n");
    const prompt="Topic: \""+topic+"\"\nArguments: "+(details||"none")+"\nTarget length: ~"+wc+" words\nCitation style: "+style+(cl?"\nSources:\n"+cl:"");
    const sys="You are an academic writing assistant. Produce a STRUCTURED EXAMPLE DRAFT to help a student understand how to approach this topic — a starting point they will revise and expand with their own analysis. Use "+style+" citations and include a References section. Write at CEFR "+level+" ("+CEFR_DESC[level]+") English level — calibrate vocabulary, sentence complexity, and academic register to exactly this level. Begin the output with the line: [EXAMPLE DRAFT — revise and expand with your own work]";
    try{const res=await callClaude(sys,prompt,2500,imgData,imgType);setEssay(res);if(user)HS.save(user.email,"academic",{title:"Draft: "+topic,input:"draft:"+style+","+wc+"w,"+level,output:res});}
    catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}
  };
  return(
    <div>
      <div style={{background:"rgba(245,200,66,0.06)",border:"1px solid rgba(245,200,66,0.2)",borderRadius:8,padding:"10px 13px",marginBottom:14,display:"flex",gap:9}}>
        <span style={{fontSize:16,flexShrink:0}}>✍️</span>
        <div style={{fontSize:13,color:"#c8a020",lineHeight:1.55}}>Generates an <strong>example draft</strong> as a learning starting point. You are expected to revise, expand, and develop it with your own ideas before any use.</div>
      </div>
      <FArea label="Thesis / Topic" placeholder="e.g. The role of AI in modern healthcare" value={topic} onChange={e=>setTopic(e.target.value)} rows={2} voice/>
      <FArea label="Arguments & Key Points" placeholder="e.g. ML accuracy, ethical concerns..." value={details} onChange={e=>setDetails(e.target.value)} rows={3} voice/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:13}}>
        <FSelect label="Citation Style" value={style} onChange={setStyle} options={["APA","MLA","Chicago","Harvard","Vancouver","IEEE"]}/>
        <FSelect label="Length" value={wc} onChange={setWc} options={["100","150","200","500","750","1000","1500","2000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:7}}>English Level (CEFR)</div>
        <div style={{display:"flex",gap:5}}>
          {LEVELS.map(l=>(
            <button key={l} onClick={()=>setLevel(l)} style={{flex:1,padding:"7px 2px",borderRadius:6,background:level===l?C.accentSoft:C.surface,border:`1px solid ${level===l?C.blue:C.border}`,color:level===l?"#fff":C.muted,fontSize:13,fontWeight:level===l?800:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>
          ))}
        </div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>{level} — {CEFR_DESC[level]}</div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase"}}>Sources to Reference</div><button onClick={addC} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:5,padding:"3px 9px",color:C.blue,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button></div>
        {cites.map((c,i)=>(<div key={i} style={{display:"flex",gap:6,marginBottom:7,alignItems:"center"}}><select value={c.type} onChange={e=>updC(i,"type",e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 6px",color:C.text,fontSize:13,fontFamily:"inherit",width:76,flexShrink:0}}><option value="url">🔗 URL</option><option value="pdf">📄 PDF</option></select><input value={c.value} onChange={e=>updC(i,"value",e.target.value)} placeholder={c.type==="url"?"https://...":"Author, Title, Year..."} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:13,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>{cites.length>1&&<button onClick={()=>remC(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,flexShrink:0}}>✕</button>}</div>))}
      </div>
      <ImageInput onImage={(dt,t)=>{setImgData(dt);setImgType(t);}} imageData={imgData} onClear={()=>{setImgData(null);setImgType(null);}}/>
      <PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>✍️ Generate Example Draft</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {essay&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
        <div style={{display:"flex",gap:8,background:"rgba(245,200,66,0.05)",border:"1px solid rgba(245,200,66,0.15)",borderRadius:8,padding:"9px 11px",marginBottom:12}}><span style={{fontSize:14,flexShrink:0}}>ℹ️</span><div style={{fontSize:12,color:"#c8a020",lineHeight:1.55}}>This is an example starting point for research and learning. Review, revise, and ensure compliance with your institution's academic integrity policies before any use.</div></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>Example Draft · {style}</span><span style={{fontSize:12,color:C.muted}}>~{essay.split(/\s+/).length}w</span></div>
        <div style={{fontSize:14,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"'Instrument Serif',Georgia,serif"}}>{essay}</div>
        <div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={essay}/><ListenBtn text={essay}/><SaveAsImageBtn text={essay} title={"Academic Draft · "+style}/></div>
      </Card>}
    </div>
  );
}

// ============ ACADEMIC MODE (dashboard + gate) ============
const ACADEMIC_TABS=[
  {id:"reviewer",icon:"🔍",label:"Academic Reviewer",sub:"Upload or paste your essay and receive detailed feedback."},
  {id:"research", icon:"🧭",label:"Research Assistant",sub:"Get help planning, structuring, and developing your work."},
  {id:"draft",    icon:"✍️",label:"Academic Draft Builder",sub:"Generate outlines, frameworks, and draft examples."},
];
function AcademicMode({user}){
  const [accepted,setAccepted]=useState(()=>isNoticeAccepted("academic"));
  const [showNotice,setShowNotice]=useState(()=>!isNoticeAccepted("academic"));
  const [tab,setTab]=useState("reviewer");

  if(!accepted)return(
    <>
      <IntegrityModal type="academic" accepted={false}
        onAccept={()=>{acceptNotice("academic");setAccepted(true);setShowNotice(false);}}
        onCancel={()=>{setShowNotice(false);}}
      />
      <div style={{textAlign:"center",padding:"60px 20px",color:C.muted,fontSize:14}}>Accept the Academic Integrity Notice to continue.</div>
    </>
  );

  const active=ACADEMIC_TABS.find(t=>t.id===tab);
  return(
    <div>
      {showNotice&&<IntegrityModal type="academic" accepted={true} onAccept={()=>setShowNotice(false)} onCancel={()=>setShowNotice(false)}/>}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <button onClick={()=>setShowNotice(true)} style={{background:"none",border:"none",color:C.blue,fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>View Academic Integrity Notice</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginBottom:16}}>
        {ACADEMIC_TABS.map((t,idx)=>{
          const on=tab===t.id;const primary=idx===0;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:primary?"15px 14px":"12px 14px",background:on?C.accentSoft:C.card,border:`1px solid ${on?C.blue:C.border}`,borderRadius:11,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.15s",boxShadow:on?`0 0 18px ${C.blueGlow}`:"none"}}>
              <div style={{width:primary?44:38,height:primary?44:38,borderRadius:10,background:on?"linear-gradient(135deg,#79BAEC,#a8d4f5)":C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:primary?22:18,flexShrink:0}}>{t.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:primary?16:14,fontWeight:900,color:on?"#fff":C.text}}>{t.label}</span>
                  {primary&&<span style={{fontSize:10,fontWeight:800,letterSpacing:"0.08em",color:C.blue,background:C.accentSoft,padding:"1px 6px",borderRadius:4}}>PRIMARY</span>}
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:2,lineHeight:1.4}}>{t.sub}</div>
              </div>
              <span style={{color:on?C.blue:C.muted,fontSize:18,flexShrink:0}}>{on?"✓":"›"}</span>
            </button>
          );
        })}
      </div>

      <div style={{marginBottom:14}}>
        <div style={{fontSize:18,fontWeight:900,color:"#fff",letterSpacing:"-0.01em",display:"flex",alignItems:"center",gap:8}}>{active.icon} {active.label}</div>
      </div>

      {tab==="reviewer"&&<AcademicReviewer user={user}/>}
      {tab==="research"&&<ResearchAssistant user={user}/>}
      {tab==="draft"&&<DraftBuilder user={user}/>}
    </div>
  );
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

// ============ STORY ANALYZER (Pro) ============
function StoryAnalyzer({user}){
  const [type,setType]=useState("movie");
  const [title,setTitle]=useState("");
  const [notes,setNotes]=useState("");
  const [res,setRes]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [open,setOpen]=useState({});
  const toggle=k=>setOpen(o=>({...o,[k]:!o[k]}));

  const gen=async()=>{
    if(!title.trim())return;
    setLoading(true);setError("");setRes(null);setOpen({});
    const isBook=type==="book";
    // Copyright note: the prompt demands ORIGINAL analysis in the model's own
    // words — no reproduced passages or dialogue. Unknown titles must return a
    // JSON error rather than a hallucinated plot (edge case: obscure/invented
    // titles), which we surface directly to the user.
    const sys='You are a literature and film study-guide expert. Produce an ORIGINAL analytical study guide entirely in your own words. Never reproduce passages, dialogue, lyrics, or any other copyrighted text from the work. If you do not confidently recognize the title, return {"error":"Title not recognized. Check the spelling or try a better-known work."} instead of inventing a plot. Return ONLY valid JSON, no markdown fences:\n{"title":"","type":"'+type+'","overview":"3-4 sentence plot summary","structure":[{"stage":"Exposition","summary":"","keyEvents":["",""]},{"stage":"Rising Action","summary":"","keyEvents":["",""]},{"stage":"Climax","summary":"","keyEvents":["",""]},{"stage":"Falling Action","summary":"","keyEvents":["",""]},{"stage":"Resolution","summary":"","keyEvents":["",""]}],"characters":[{"name":"","development":""}],"themes":[{"theme":"","explanation":""}],"conflicts":[{"type":"","description":""}]'+(isBook?',"chapters":[{"chapter":"","summary":""}]':'')+'}'+(isBook?'\nFor chapters: cover the whole book in at most 15 entries — combine into ranges like "Chapters 4-6" for long books.':'');
    try{
      const raw=await callClaude(sys,'Create a study guide for the '+type+': "'+title+'"'+(notes?'\nFocus on: '+notes:''),3000);
      const r=JSON.parse(raw.replace(/```json|```/g,"").trim());
      if(r.error){setError(r.error);return;}
      setRes(r);
      if(user)HS.save(user.email,"story",{title:(isBook?"📚 ":"🎬 ")+title,input:type+(notes?" · "+notes.slice(0,30):""),output:r.overview||""});
    }catch(e){setError(e.message||"Something went wrong.");}
    finally{setLoading(false);}
  };

  // Small accordion row reused by every expandable section below (DRY). Holds
  // no state of its own — expansion lives in the parent's `open` map, so
  // re-renders can't wipe which sections the user has opened.
  const Acc=({k,icon,label,count,children})=>(
    <Card style={{marginBottom:8,padding:0,overflow:"hidden"}}>
      <button onClick={()=>toggle(k)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
        <span style={{fontSize:14,fontWeight:800,color:open[k]?"#fff":C.text}}>{icon} {label}{count!=null&&<span style={{fontSize:12,color:C.muted,fontWeight:400}}> · {count}</span>}</span>
        <span style={{fontSize:16,color:open[k]?C.blue:C.muted,transform:open[k]?"rotate(45deg)":"none",transition:"transform 0.2s",flexShrink:0}}>+</span>
      </button>
      {open[k]&&<div style={{padding:"0 14px 13px",animation:"fadeUp 0.2s ease"}}>{children}</div>}
    </Card>
  );

  const STAGE_ICONS={"Exposition":"🌅","Rising Action":"📈","Climax":"⚡","Falling Action":"📉","Resolution":"🌇"};

  return(
    <div>
      <div style={{background:C.accentSoft,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 13px",marginBottom:14,display:"flex",gap:9}}>
        <span style={{fontSize:16,flexShrink:0}}>🎬</span>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.55}}>Enter any book or movie title to get an interactive study guide — plot structure, characters, themes, and conflicts{type==="book"?", plus chapter-by-chapter summaries":""}.</div>
      </div>

      <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:14}}>
        {[{id:"movie",label:"🎬 Movie"},{id:"book",label:"📚 Book"}].map(t=>(
          <button key={t.id} onClick={()=>setType(t.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:type===t.id?C.blue:"transparent",color:type===t.id?"#000":C.muted,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{t.label}</button>
        ))}
      </div>

      <FInput label={type==="book"?"Book Title":"Movie Title"} placeholder={type==="book"?"e.g. To Kill a Mockingbird":"e.g. Inception"} value={title} onChange={e=>setTitle(e.target.value)} icoL={type==="book"?"📚":"🎬"} voice/>
      <FArea label="Focus (optional)" placeholder="e.g. Focus on the protagonist's moral development..." value={notes} onChange={e=>setNotes(e.target.value)} rows={2} voice/>
      <PriBtn onClick={gen} loading={loading} disabled={!title.trim()}>🎬 Build Study Guide</PriBtn>
      {error&&<ErrBox msg={error}/>}

      {res&&(
        <div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
          <Card style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{res.type==="book"?"📚":"🎬"} Overview · {res.title||title}</div>
            <div style={{fontSize:14,lineHeight:1.8,color:C.text}}>{res.overview}</div>
            <OutputActions text={res.overview||""}/>
          </Card>

          <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Story Structure</div>
          {(res.structure||[]).map((st,i)=>(
            <Acc key={i} k={"st"+i} icon={STAGE_ICONS[st.stage]||"📖"} label={st.stage}>
              <div style={{fontSize:13,lineHeight:1.7,color:C.text,marginBottom:(st.keyEvents||[]).length?8:0}}>{st.summary}</div>
              {(st.keyEvents||[]).map((ev,j)=>(
                <div key={j} style={{display:"flex",gap:7,fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:3}}><span style={{color:C.blue,flexShrink:0}}>•</span>{ev}</div>
              ))}
            </Acc>
          ))}

          <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",margin:"14px 0 8px"}}>Analysis</div>
          {(res.characters||[]).length>0&&(
            <Acc k="chars" icon="👥" label="Character Development" count={res.characters.length}>
              {res.characters.map((c,i)=>(
                <div key={i} style={{paddingBottom:i<res.characters.length-1?9:0,marginBottom:i<res.characters.length-1?9:0,borderBottom:i<res.characters.length-1?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.blue,marginBottom:2}}>{c.name}</div>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.65}}>{c.development}</div>
                </div>
              ))}
            </Acc>
          )}
          {(res.themes||[]).length>0&&(
            <Acc k="themes" icon="💡" label="Themes" count={res.themes.length}>
              {res.themes.map((t,i)=>(
                <div key={i} style={{marginBottom:i<res.themes.length-1?8:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.yellow,marginBottom:2}}>{t.theme}</div>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.65}}>{t.explanation}</div>
                </div>
              ))}
            </Acc>
          )}
          {(res.conflicts||[]).length>0&&(
            <Acc k="conf" icon="⚔️" label="Conflicts" count={res.conflicts.length}>
              {res.conflicts.map((cf,i)=>(
                <div key={i} style={{marginBottom:i<res.conflicts.length-1?8:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.red,marginBottom:2}}>{cf.type}</div>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.65}}>{cf.description}</div>
                </div>
              ))}
            </Acc>
          )}
          {res.type==="book"&&(res.chapters||[]).length>0&&(
            <>
              <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",margin:"14px 0 8px"}}>Chapter Summaries</div>
              {res.chapters.map((ch,i)=>(
                <Acc key={i} k={"ch"+i} icon="📖" label={ch.chapter}>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{ch.summary}</div>
                </Acc>
              ))}
            </>
          )}
        </div>
      )}
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
  const [hAccepted,setHAccepted]=useState(()=>isNoticeAccepted("humanize"));
  const [showHNotice,setShowHNotice]=useState(()=>!isNoticeAccepted("humanize"));
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
  if(!hAccepted)return(
    <>
      <IntegrityModal type="humanize" accepted={false}
        onAccept={()=>{acceptNotice("humanize");setHAccepted(true);setShowHNotice(false);}}
        onCancel={()=>setShowHNotice(false)}
      />
      <div style={{textAlign:"center",padding:"60px 20px",color:"#8eacc4",fontSize:14}}>Accept the Responsible Use Notice to continue.</div>
    </>
  );
  return(
    <div>
      {showHNotice&&<IntegrityModal type="humanize" accepted={true} onAccept={()=>setShowHNotice(false)} onCancel={()=>setShowHNotice(false)}/>}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
        <button onClick={()=>setShowHNotice(true)} style={{background:"none",border:"none",color:"#9b7fe8",fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>View Responsible Use Notice</button>
      </div>
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
        {view==="output"&&(<Card glow glowColor={C.violet}><div style={{display:"flex",gap:8,background:"rgba(155,127,232,0.06)",border:"1px solid rgba(155,127,232,0.2)",borderRadius:8,padding:"9px 11px",marginBottom:12}}><span style={{fontSize:14,flexShrink:0}}>ℹ️</span><div style={{fontSize:12,color:C.violet,lineHeight:1.55}}>Humanized content is provided to improve readability and writing quality. Users remain responsible for complying with academic, workplace, and institutional policies.</div></div><div style={{fontSize:11,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Humanized Output · 2-Pass Reviewed</div><div style={{fontSize:14,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{res.humanized}</div><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}><CopyBtn text={res.humanized}/><ListenBtn text={res.humanized}/><SaveAsImageBtn text={res.humanized} title="Humanized Writing"/></div></Card>)}
        {view==="compare"&&(<div><div style={{display:"flex",gap:10,marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(240,107,107,0.25)",border:"1px solid rgba(240,107,107,0.5)"}}/>Original</div><div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(155,127,232,0.25)",border:"1px solid rgba(155,127,232,0.5)"}}/>Changed words</div></div><div style={{marginBottom:10}}><div style={{fontSize:11,color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Before</div><div style={{background:"rgba(240,107,107,0.05)",border:"1px solid rgba(240,107,107,0.2)",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{text}</div></div><div style={{marginBottom:10}}><div style={{fontSize:11,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>After</div><div style={{background:"rgba(155,127,232,0.05)",border:"1px solid rgba(155,127,232,0.25)",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{diffWords(text,res.humanized).map((w,i)=>(<span key={i}><span style={{background:w.changed?"rgba(155,127,232,0.22)":"transparent",borderRadius:w.changed?3:0,padding:w.changed?"1px 2px":0,color:w.changed?C.violet:C.text,fontWeight:w.changed?700:400}}>{w.word}</span>{i<res.humanized.split(/\s+/).length-1?" ":""}</span>))}</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>{[{label:"Original words",val:text.split(/\s+/).filter(Boolean).length},{label:"Final words",val:res.humanized.split(/\s+/).filter(Boolean).length},{label:"Words changed",val:diffWords(text,res.humanized).filter(w=>w.changed).length},{label:"Change rate",val:Math.round(diffWords(text,res.humanized).filter(w=>w.changed).length/Math.max(res.humanized.split(/\s+/).filter(Boolean).length,1)*100)+"%"}].map(s=>(<div key={s.label} style={{flex:1,minWidth:70,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:C.violet}}>{s.val}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.label}</div></div>))}</div><OutputActions text={res.humanized}/></div>)}
      </div>)}
    </div>
  );
}

function TrialModal({mode,targetPlan,onStart,onClose}){
  const [bill,setBill]=useState("monthly");
  const isStudent=targetPlan==="student";const planColor=isStudent?C.violet:C.blue;
  const M={essay:{icon:"✍️",title:"Essay Writer",perks:["CEFR A1-C2 levels","6 essay types","Word count control","Instant generation"]},academic:{icon:"🎓",title:"Academic Essay",perks:["APA, MLA, Chicago & more","URL/PDF citations","Auto-references","C1/C2 English"]},cv:{icon:"💼",title:"CV / Resume Builder",perks:["4 CV styles","ATS-optimised","Full CV or by section","Tailored to role"]},author:{icon:"📖",title:"Author Mode",perks:["8 fiction + 4 non-fiction","Scene, chapter, outline","POV selector","Literary quality"]},story:{icon:"🎬",title:"Story Analyzer",perks:["Books & movies","5-stage plot structure","Characters, themes & conflicts","Chapter-by-chapter (books)"]},humanize:{icon:"🧠",title:"Humanize My Writing",perks:["CEFR-matched output","3 intensity levels","4 writing contexts","Change breakdown"]}};
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
                <span style={{fontSize:13,color:C.muted,fontWeight:400}}>{isStudent?" / month":bill==="monthly"?" / month":" / year"}</span>
              </div>
              <div style={{fontSize:13,color:C.green,marginTop:1}}>{isStudent?"Intro offer · then $20 / month":bill==="monthly"?"Intro offer · then $12 / month":"Best annual rate"}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:1}}>billed in USD</div>
            </div>
            <div style={{background:isStudent?C.violetSoft:C.accentSoft,border:`1px solid ${planColor}44`,borderRadius:6,padding:"6px 9px",textAlign:"center"}}>
              <div style={{fontSize:12,color:planColor,fontWeight:800}}>🎁 3 DAYS FREE</div>
              <div style={{fontSize:11,color:C.muted,marginTop:1}}>No card required</div>
            </div>
          </div>
          <PriBtn onClick={()=>onStart(targetPlan)} variant={isStudent?"violet":"blue"}>{isStudent?"Start Student Free Trial 🎓":"Start Free Trial →"}</PriBtn>
          <div style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:7}}>Cancel anytime · No card required</div>
        </div>
        <button onClick={onClose} style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Maybe later</button>
      </div>
    </div>
  );
}

/**
 * Shown when a cardless trial's 3 days are up. Deliberately NOT dismissable by
 * clicking the backdrop — the spec requires an explicit choice, so there's no
 * onClick-outside-to-close handler here (unlike TrialModal, which allows that).
 */
function TrialEndedModal({targetPlan,onContinue,onDowngrade}){
  const isStudent=targetPlan==="student";
  return(
    <div style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",animation:"fadeUp 0.2s ease"}}>
      <div style={{width:"100%",maxWidth:460,background:C.card,border:`1px solid ${isStudent?"rgba(155,127,232,0.4)":C.border}`,borderRadius:"14px 14px 0 0",padding:"22px 18px 28px",animation:"slideUpModal 0.3s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
        <div style={{width:32,height:3,borderRadius:2,background:C.border,margin:"0 auto 18px"}}/>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:40,marginBottom:10}}>⏰</div>
          <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:6}}>Your free trial has ended</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Keep your unlocked features by continuing with the Pro or Student plan — or switch back to the Free plan.</div>
        </div>
        <PriBtn onClick={onContinue} variant={isStudent?"violet":"blue"}>Choose a Plan →</PriBtn>
        <div style={{marginTop:9}}>
          <SecBtn onClick={onDowngrade}>Switch to Free Plan</SecBtn>
        </div>
      </div>
    </div>
  );
}

function AppShell({user,onSignOut,onUpdateUser,activeMode,setActiveMode,onUpgrade,onChangePlan,onCancelPlan}){
  const [showContact,setShowContact]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showTerms,setShowTerms]=useState(false);
  const [showPrivacy,setShowPrivacy]=useState(false);

  const isPro=user.plan==="pro"||user.plan==="student";
  const isStudent=user.plan==="student";

  const locked=m=>{
    if(m.access==="free")return false;
    if(m.access==="pro+student")return !isPro;
    if(m.access==="student")return !isStudent;
    return false;
  };

  // Item 1 (preserve generated content): visited, unlocked content modes stay
  // MOUNTED and are merely hidden with display:none when inactive — React state
  // (inputs, results, follow-up chats) survives mode switches automatically,
  // with zero changes needed inside any mode component. History is deliberately
  // excluded: remounting it on each visit is what refreshes its list with items
  // generated in other modes since the last look. Lazy: a mode mounts only on
  // first visit, so startup cost is unchanged.
  const [visited,setVisited]=useState(()=>new Set([activeMode]));
  useEffect(()=>{
    setVisited(v=>v.has(activeMode)?v:new Set([...v,activeMode]));
  },[activeMode]);

  const renderModeFor=(id)=>{
    switch(id){
      case"reply":return <ReplyMode user={user} isPro={isPro}/>;
      case"email":return <EmailMode user={user}/>;
      case"grammar":return <GrammarMode user={user}/>;
      case"essay":return <EssayMode user={user}/>;
      case"academic":return <AcademicMode user={user}/>;
      case"cv":return <CVMode user={user}/>;
      case"author":return <AuthorMode user={user}/>;
      case"story":return <StoryAnalyzer user={user}/>;
      case"humanize":return <HumanizeMode user={user}/>;
      default:return null;
    }
  };

  const currentMode=MODES.find(m=>m.id===activeMode);

  if(showSettings){
    return(
      <>
        {showTerms&&<TermsModal onClose={()=>setShowTerms(false)}/>}
        {showPrivacy&&<PrivacyModal onClose={()=>setShowPrivacy(false)}/>}
        <SettingsScreen
          user={user}
          onBack={()=>setShowSettings(false)}
          onSignOut={onSignOut}
          onSave={u=>{onUpdateUser(u);}}
          onContact={()=>setShowContact(true)}
          onShowTerms={()=>setShowTerms(true)}
          onShowPrivacy={()=>setShowPrivacy(true)}
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
      {showPrivacy&&<PrivacyModal onClose={()=>setShowPrivacy(false)}/>}

      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.95)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:600,margin:"0 auto",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>👻</span>
            <span style={{fontSize:15,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>GhostwriterMe</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <PlanBadge plan={user.plan}/>
            <button onClick={()=>setShowSettings(true)} style={{border:"none",background:"transparent",cursor:"pointer",padding:0,flexShrink:0,borderRadius:"50%"}}>
  <Avatar avatar={user.avatar} size={34}/>
</button>
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

        {locked(currentMode||{})&&(
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
        )}
        {/* Keep-mounted content modes (see comment above renderModeFor). A
            display:none→block toggle also replays the fadeUp CSS animation,
            so switching still feels animated. Locked modes are filtered out —
            state intentionally drops if access is lost mid-session. */}
        {MODES.filter(m=>m.id!=="history"&&visited.has(m.id)&&!locked(m)).map(m=>(
          <div key={m.id} style={{display:activeMode===m.id?"block":"none",animation:"fadeUp 0.3s ease",paddingBottom:16}}>
            {renderModeFor(m.id)}
          </div>
        ))}
        {activeMode==="history"&&(
          <div style={{animation:"fadeUp 0.3s ease",paddingBottom:16}}>
            <HistoryMode user={user}/>
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
  // Verify subscription status with Stripe by email
  const checkSubscription=async(email)=>{
    try{
      const res=await fetch(`/api/get-subscription?email=${encodeURIComponent(email)}`);
      if(!res.ok)return null;
      return await res.json();
    }catch(e){
      console.error("Could not verify subscription:",e);
      return null;
    }
  };
  const [authTab,setAuthTab]=useState("signup");
  const [activeMode,setActiveMode]=useState("reply");
  const [trialInfo,setTrialInfo]=useState(null);
  const [paymentInfo,setPaymentInfo]=useState(null);

  // Restore session on startup
  const [user,setUser]=useState(()=>{
    try{const s=localStorage.getItem(SESSION_KEY);return s?JSON.parse(s):null;}catch{return null;}
  });
  const [screen,setScreen]=useState(()=>{
    try{const s=localStorage.getItem(SESSION_KEY);return s?"app":"landing";}catch{return "landing";}
  });

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=GLOBAL_CSS;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);

  // Persist the session on every change (login, sign-out, plan upgrade, trial
  // start, profile edit, etc). Needs [user] as its dependency to actually catch
  // every update — it doesn't call setUser, so there's no re-render loop risk.
  useEffect(()=>{
    if(user){
      localStorage.setItem(SESSION_KEY,JSON.stringify(user));
    }else{
      localStorage.removeItem(SESSION_KEY);
    }
  },[user]);

  // Verify the plan against Stripe once when the app first loads. Mount-only by
  // design — re-fetching on every local `user` change would fire an extra
  // network request on every unrelated state update.
  //
  // Edge case: a cardless trial never creates a Stripe subscription, so Stripe
  // will correctly report "free" for a user who is actively mid-trial. We must
  // NOT let that overwrite the local trial grant — Stripe only wins here once a
  // real subscription exists (i.e. sub.plan is not "free").
  useEffect(()=>{
    if(user){
      checkSubscription(user.email).then(sub=>{
        if(!sub)return;
        setUser(u=>{
          const hasActiveLocalTrial=u.trialPlan&&u.trialEndsAt&&new Date(u.trialEndsAt)>new Date();
          if(sub.plan==="free"&&hasActiveLocalTrial)return u; // protect the trial
          return{...u,
            plan:sub.plan,
            billing:sub.billing||u.billing,
            renewsAt:sub.renewsAt||u.renewsAt,
            cancelAtPeriodEnd:sub.cancelAtPeriodEnd??u.cancelAtPeriodEnd,
          };
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Existing cancellation-expiry check (for real Stripe subscriptions the user
  // explicitly cancelled) — unchanged.
  useEffect(()=>{
    if(user&&user.plan!=="free"&&user.cancelAtPeriodEnd&&user.renewsAt&&new Date(user.renewsAt)<=new Date()){
      setUser(u=>({...u,plan:"free",billing:null,renewsAt:null,cancelAtPeriodEnd:false}));
    }
  },[user]);

  // Cardless-trial expiry check. Runs on mount AND on a 60s interval, since a
  // user could leave the tab open straight through their trial's end time
  // without triggering any other state change that would re-run a mount-only
  // effect. A plain date comparison every 60s is cheap — no network calls.
  const [showTrialEndedPrompt,setShowTrialEndedPrompt]=useState(false);
  useEffect(()=>{
    const checkTrialExpiry=()=>{
      setUser(u=>{
        if(u&&u.trialEndsAt&&new Date(u.trialEndsAt)<=new Date()){
          setShowTrialEndedPrompt(true);
        }
        return u; // read-only check, never mutates user here
      });
    };
    checkTrialExpiry();
    const interval=setInterval(checkTrialExpiry,60000);
    return()=>clearInterval(interval);
  },[]);
  
 const handleGetStarted=()=>{setAuthTab("signup");setScreen("auth");};
  const handleSignIn=()=>{setAuthTab("signin");setScreen("auth");};
  const handleAuth=async u=>{
    const sub=await checkSubscription(u.email);
    if(sub&&sub.plan!=="free"){
      u={...u,plan:sub.plan,billing:sub.billing,renewsAt:sub.renewsAt,cancelAtPeriodEnd:sub.cancelAtPeriodEnd};
    }
    setUser(u);
    // Skip the waiver if this browser has already accepted it — this is the fix
    // for "waiver shows every login." Note: this is per-browser, not per-account
    // (no user database exists to store acceptance server-side yet). Signing in
    // on a new device will show it once more there. Flagging as known scope,
    // not a bug — a real fix would need a backend user table.
    setScreen(isNoticeAccepted("safety")?"app":"safety");
  };
  const handleSafetyAccept=()=>{acceptNotice("safety");setScreen("app");};
  const handleSignOut=()=>{localStorage.removeItem(SESSION_KEY);setUser(null);setScreen("landing");};
  const handleUpdateUser=u=>{setUser(u);};

  const handleUpgrade=(mode,targetPlan)=>{
    // Don't push to pricing if user already has an active paid plan
    if(user&&(user.plan==="pro"||user.plan==="student")){return;}
    setTrialInfo({mode,targetPlan});
    setScreen("pricing");
  };
  const handlePricingSelect=(plan,billing)=>{
    if(plan==="free"){setUser(u=>u?{...u,plan:"free"}:u);setScreen("app");return;}
    // Edge case: `user.trialPlan` covers users mid-trial from before the
    // trialUsed flag existed (backward compat with already-stored sessions).
    const trialAlreadyUsed=!!(user&&(user.trialUsed||user.trialPlan));
    if(!trialAlreadyUsed){
      // First-time user clicking "Start Free Trial" gets exactly that — the
      // cardless 3-day trial, same as the locked-feature path. No card screen.
      startCardlessTrial(plan);
      setScreen("app");
      return;
    }
    // Trial already consumed — this visit is a real conversion. skipTrial tells
    // the backend to charge immediately instead of granting a second free period.
    setPaymentInfo({targetPlan:plan,billing:billing||"monthly",skipTrial:true});
    setScreen("payment");
  };
  // Grants instant, cardless access — no Stripe call at all. This is the
  // entire fix for "credit card required upfront": the plan unlocks immediately
  // and a 3-day clock starts locally.
  // Shared cardless-trial grant — used by both the locked-feature TrialModal
  // and the PricingScreen CTA, so the two entry points can't drift apart (DRY).
  // `trialUsed:true` is permanent bookkeeping that survives downgrade: without
  // it, handleTrialDowngrade clearing trialPlan/trialEndsAt would let the same
  // browser start unlimited back-to-back free trials.
  const startCardlessTrial=(targetPlan)=>{
    const trialEndsAt=new Date(Date.now()+TRIAL_DURATION_MS).toISOString();
    setUser(u=>({...u,plan:targetPlan,trialPlan:targetPlan,trialEndsAt,trialUsed:true}));
  };

  // Grants instant, cardless access — no Stripe call at all. This is the
  // entire fix for "credit card required upfront": the plan unlocks immediately
  // and a 3-day clock starts locally.
  const handleTrialStart=(targetPlan)=>{
    startCardlessTrial(targetPlan);
    setTrialInfo(null);
    // Deliberately no setScreen() call — user stays exactly where they were,
    // now with the feature unlocked.
  };

  // User chose "Continue" on the trial-ended prompt. They're committing to a
  // real subscription now, so send them to Pricing to pick Monthly/Yearly,
  // defaulting toward the tier they were trialing.
  // User chose "Continue" on the trial-ended prompt. They're committing to a
  // real subscription now, so send them to Pricing to pick Monthly/Yearly.
  // Note: deliberately NOT setting trialInfo here — doing so caused a stray
  // TrialModal (with fallback essay copy) to render over TrialEndedModal if
  // the user navigated back to the app without completing payment.
  const handleTrialContinue=()=>{
    setShowTrialEndedPrompt(false);
    setScreen("pricing");
  };

  // User chose "Switch to Free". Nothing was ever billed, so this is a pure
  // local state change — no server call needed.
  const handleTrialDowngrade=()=>{
    setShowTrialEndedPrompt(false);
    setUser(u=>({...u,plan:"free",trialPlan:null,trialEndsAt:null}));
  };

  const handlePaymentComplete=async()=>{
    // Stripe is now the source of truth — re-fetch the real subscription instead of
    // guessing renewsAt locally. Also clear trial fields: a real subscription
    // now exists, so the cardless-trial bookkeeping is no longer needed.
    if(user){
      const sub=await checkSubscription(user.email);
      if(sub&&sub.plan!=="free"){
        setUser(u=>({...u,plan:sub.plan,billing:sub.billing,renewsAt:sub.renewsAt,cancelAtPeriodEnd:sub.cancelAtPeriodEnd,trialPlan:null,trialEndsAt:null}));
      }else if(paymentInfo){
        setUser(u=>({...u,plan:paymentInfo.targetPlan,billing:paymentInfo.billing,cancelAtPeriodEnd:false,trialPlan:null,trialEndsAt:null}));
      }
    }
    setPaymentInfo(null);
    setScreen("app");
  };

  if(screen==="landing")return <LandingScreen onGetStarted={handleGetStarted} onSignIn={handleSignIn}/>;
  if(screen==="auth")return <AuthScreen onAuth={handleAuth} defaultTab={authTab}/>;
  if(screen==="safety")return <SafetyScreen onAccept={handleSafetyAccept}/>;
  if(screen==="pricing")return <PricingScreen user={user} onSelect={handlePricingSelect} onContact={()=>{}} onBack={()=>setScreen("app")}/>;
  if(screen==="payment")return <PaymentScreen user={user} billing={paymentInfo?.billing||"monthly"} targetPlan={paymentInfo?.targetPlan||"pro"} skipTrial={!!paymentInfo?.skipTrial} onComplete={handlePaymentComplete}/>;

  return(
    <>
      <AppShell user={user} onSignOut={handleSignOut} onUpdateUser={handleUpdateUser} activeMode={activeMode} setActiveMode={setActiveMode} onUpgrade={handleUpgrade} onChangePlan={()=>setScreen("pricing")} onCancelPlan={flag=>setUser(u=>({...u,cancelAtPeriodEnd:flag!==false}))}/>
      {trialInfo&&<TrialModal mode={trialInfo.mode} targetPlan={trialInfo.targetPlan} onStart={handleTrialStart} onClose={()=>setTrialInfo(null)}/>}
      {showTrialEndedPrompt&&user?.trialPlan&&<TrialEndedModal targetPlan={user.trialPlan} onContinue={handleTrialContinue} onDowngrade={handleTrialDowngrade}/>}
    </>
  );
}
