import React, { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME — Black + Denim Blue #79BAEC
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#000000", surface: "#080d14", card: "#0c1220", border: "#162030",
  blue: "#79BAEC", blueGlow: "rgba(121,186,236,0.2)", accent: "#a8d4f5",
  accentSoft: "rgba(121,186,236,0.1)",
  violet: "#9b7fe8", violetSoft: "rgba(155,127,232,0.1)", violetGlow: "rgba(155,127,232,0.2)",
  text: "#ddeeff", muted: "#3d5a75",
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
`;

const CONTACT_EMAIL = "myghosthehezjspt@gmail.com";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MODES = [
  { id:"reply",      icon:"💬", label:"AI Replies",  access:"free"        },
  { id:"email",      icon:"📧", label:"Email",        access:"free"        },
  { id:"grammar",    icon:"✅", label:"Grammar",      access:"free"        },
  { id:"essay",      icon:"✍️",  label:"Essay",        access:"pro+student" },
  { id:"academic",   icon:"🎓", label:"Academic",     access:"pro+student" },
  { id:"cv",         icon:"💼", label:"CV/Resume",    access:"pro+student" },
  { id:"author",     icon:"📖", label:"Author",       access:"pro+student" },

  { id:"humanize",   icon:"🧠", label:"Humanize",     access:"student"     },
  { id:"history",    icon:"🕐", label:"History",      access:"free"        },
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
  {id:"fantasy",    icon:"🧙",label:"Fantasy",     desc:"Magic, worlds"},
  {id:"sci-fi",     icon:"🚀",label:"Sci-Fi",      desc:"Tech, space"},
  {id:"romance",    icon:"💕",label:"Romance",     desc:"Love, tension"},
  {id:"thriller",   icon:"🔪",label:"Thriller",    desc:"Suspense, twists"},
  {id:"mystery",    icon:"🔍",label:"Mystery",     desc:"Clues, reveals"},
  {id:"historical", icon:"⚔️", label:"Historical",  desc:"Past eras"},
  {id:"literary",   icon:"🌿",label:"Literary",    desc:"Character-driven"},
  {id:"ya",         icon:"✨",label:"Young Adult", desc:"Teen voices"},
];
const NONFICTION_GENRES = [
  {id:"memoir",  icon:"📔",label:"Memoir",       desc:"Personal stories"},
  {id:"selfhelp",icon:"💡",label:"Self-Help",    desc:"Growth, mindset"},
  {id:"essay-nf",icon:"🖊️", label:"Personal Essay",desc:"Opinion, voice"},
  {id:"travel",  icon:"🗺️", label:"Travel Writing",desc:"Places, journeys"},
];
const CV_SECTIONS = ["Work Experience","Education","Skills","Summary/Objective","Achievements","Projects","Certifications","Languages","References"];

const SOCIAL_PROVIDERS = [
  {id:"google",   label:"Continue with Google",   iconType:"google",   bg:"#fff",    color:"#111"},
  {id:"facebook", label:"Continue with Facebook", iconType:"facebook", bg:"#1877F2", color:"#fff"},
  {id:"apple",    label:"Continue with Apple",    iconType:"apple",    bg:"#0a0a0a", color:"#fff", border:"1px solid #2a2a2a"},
  {id:"email",    label:"Continue with Email",    iconType:"email",    bg:C.surface, color:C.text, border:`1px solid ${C.border}`},
];

const TERMS_CONTENT = [
  {h:"1. Acceptance of Terms",b:"By creating an account and using GhostwriterMe, you agree to these Terms. If you disagree, do not use the Service."},
  {h:"2. Age Requirement",b:"You must be at least 13 years old. Users under 18 require parental or guardian consent."},
  {h:"3. User Responsibility",b:"All content generated is produced at your direction and under your sole responsibility. GhostwriterMe bears no liability for content users create or how it is used."},
  {h:"4. Academic Integrity",b:"'Humanize My Writing' is a writing improvement and learning tool. Users are solely responsible for complying with their institution's academic integrity policies. GhostwriterMe does not condone academic dishonesty."},
  {h:"5. Prohibited Uses",b:"Do not generate harmful, illegal, defamatory, or fraudulent content. Violation results in immediate account termination."},
  {h:"6. No Warranty",b:"AI-generated content is provided 'as is' without warranty. Verify all content before use."},
  {h:"7. Limitation of Liability",b:"GhostwriterMe shall not be liable for any damages arising from your use of the Service."},
  {h:"8. Subscriptions & Billing",b:"Subscriptions are billed as selected. 3-day free trials begin upon payment authorization — no charge until day 4. Cancel anytime."},
  {h:"9. Contact & Governing Law",b:"Questions? Email us at "+CONTACT_EMAIL+". These Terms are governed by the laws of Thailand."},
];

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────────────────
const HS = {
  key: (email, mode) => "gwm2_" + email + "_" + mode,
  save: (email, mode, entry) => {
    try {
      const k = HS.key(email, mode);
      const prev = HS.load(email, mode);
      localStorage.setItem(k, JSON.stringify([{...entry, id:Date.now(), ts:new Date().toISOString()}, ...prev].slice(0, 50)));
    } catch(e) {}
  },
  load: (email, mode) => {
    try { const r = localStorage.getItem(HS.key(email, mode)); return r ? JSON.parse(r) : []; }
    catch { return []; }
  },
  loadAll: (email) => {
    const ms = ["reply","email","essay","academic","cv","author","grammar","humanize"];
    return ms.flatMap(m => HS.load(email, m).map(e => ({...e, mode:m}))).sort((a,b) => new Date(b.ts)-new Date(a.ts));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE
// ─────────────────────────────────────────────────────────────────────────────
const hasSR  = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

function useMic(onResult) {
  const [active, setActive] = useState(false);
  const ref = useRef(null);
  const toggle = useCallback(() => {
    if (!hasSR) { alert("Voice input not supported. Use Chrome."); return; }
    if (active) { ref.current?.stop(); setActive(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = "en-US";
    r.onresult = e => onResult(e.results[0][0].transcript);
    r.onend = () => setActive(false); r.onerror = () => setActive(false);
    r.start(); ref.current = r; setActive(true);
  }, [active, onResult]);
  return { active, toggle };
}

const speak = (text) => { if (!hasTTS) return; window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); };
const stopSpeak = () => { if (hasTTS) window.speechSynthesis.cancel(); };

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
async function callClaude(system, user, maxTokens = 1500) {
  const r = await fetch("/api/claude", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system, messages:[{role:"user",content:user}]}),
  });
  const d = await r.json();
  return d.content?.map(b => b.text||"").join("") || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT US MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ContactModal({onClose}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);

  const handleSend = () => {
    const sub  = encodeURIComponent(subject || "GhostwriterMe — Support Request");
    const body = encodeURIComponent(message || "");
    window.location.href = "mailto:"+CONTACT_EMAIL+"?subject="+sub+"&body="+body;
    setSent(true);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:480,background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 0 0",padding:"22px 18px 32px",animation:"slideUpModal 0.3s ease"}}>
        <div style={{width:32,height:3,borderRadius:2,background:C.border,margin:"0 auto 18px"}}/>

        {!sent ? (
          <>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:18}}>
              <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✉️</div>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>Contact Us</div>
                <div style={{fontSize:11,color:C.muted,marginTop:1}}>We typically reply within 24 hours</div>
              </div>
            </div>

            {/* Email pill */}
            <div style={{background:C.accentSoft,border:`1px solid rgba(121,186,236,0.22)`,borderRadius:8,padding:"9px 12px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:2,letterSpacing:"0.05em"}}>OUR EMAIL</div>
                <div style={{fontSize:13,fontWeight:700,color:C.blue}}>{CONTACT_EMAIL}</div>
              </div>
              <button
                onClick={()=>navigator.clipboard.writeText(CONTACT_EMAIL)}
                style={{padding:"5px 10px",borderRadius:6,background:"transparent",border:`1px solid rgba(121,186,236,0.3)`,color:C.blue,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                Copy
              </button>
            </div>

            {/* Subject */}
            <div style={{marginBottom:11}}>
              <label style={{fontSize:10,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Billing question, Feature request..."
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>

            {/* Message */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:10,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Message</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} placeholder="Tell us what's on your mind..."
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,lineHeight:1.6,resize:"none",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>

            {/* Topics */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
              {["Billing","Bug report","Feature request","General question"].map(t=>(
                <button key={t} onClick={()=>setSubject(t)}
                  style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${C.border}`,background:subject===t?C.accentSoft:"transparent",color:subject===t?C.blue:C.muted,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
                  {t}
                </button>
              ))}
            </div>

            <button onClick={handleSend}
              style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 20px ${C.blueGlow}`,marginBottom:10}}>
              Open Email App →
            </button>
            <div style={{textAlign:"center",fontSize:10,color:C.muted}}>This will open your default email app with the message pre-filled.</div>
          </>
        ) : (
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>📬</div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:6}}>Email App Opened!</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:20}}>Send the email from your mail app.<br/>We'll get back to you within 24 hours.</div>
            <div style={{background:C.accentSoft,border:`1px solid rgba(121,186,236,0.22)`,borderRadius:8,padding:"10px 14px",marginBottom:18}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:2}}>Or email us directly at</div>
              <div style={{fontSize:13,fontWeight:700,color:C.blue}}>{CONTACT_EMAIL}</div>
            </div>
            <button onClick={onClose}
              style={{width:"100%",padding:"11px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const Spin = ({size=16,color="#fff"}) => (
  <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",border:`2px solid rgba(255,255,255,0.1)`,borderTopColor:color,animation:"spin 0.7s linear infinite",flexShrink:0}}/>
);

function SocialIcon({type}) {
  if (type==="google") return <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;
  if (type==="facebook") return <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
  if (type==="apple") return <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/></svg>;
  return <span style={{fontSize:15}}>✉️</span>;
}

const Card = ({children, style:s, glow, glowColor}) => {
  const gc = glowColor || C.blue;
  return <div style={{background:C.card,border:`1px solid ${glow?gc+"55":C.border}`,borderRadius:12,padding:"16px",...(glow?{boxShadow:`0 0 20px ${gc}22`}:{}),...s}}>{children}</div>;
};

const ErrBox = ({msg}) => <div style={{marginTop:10,padding:"10px 14px",background:"#1a0000",border:"1px solid #3a0808",borderRadius:8,fontSize:12,color:C.red}}>{msg}</div>;

function CopyBtn({text}) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setDone(true);setTimeout(()=>setDone(false),2000);}}
      style={{padding:"6px 13px",borderRadius:6,background:done?"#0a2a18":"transparent",border:`1px solid ${done?C.green:C.border}`,color:done?C.green:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
      {done?"✓ Copied":"Copy"}
    </button>
  );
}

function ListenBtn({text}) {
  const [on, setOn] = useState(false);
  return (
    <button onClick={()=>{if(on){stopSpeak();setOn(false);}else{speak(text);setOn(true);}}}
      style={{padding:"6px 12px",borderRadius:6,background:on?C.accentSoft:"transparent",border:`1px solid ${on?C.blue:C.border}`,color:on?C.blue:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}}>
      {on?"⏹ Stop":"🔊 Listen"}
    </button>
  );
}

const OutputActions = ({text}) => (
  <div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}>
    <CopyBtn text={text}/>
    <ListenBtn text={text}/>
  </div>
);

const Toggle = ({on, set}) => (
  <div onClick={set} style={{width:36,height:20,borderRadius:10,background:on?C.blue:"#162030",position:"relative",transition:"background 0.2s",flexShrink:0,cursor:"pointer"}}>
    <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left 0.2s"}}/>
  </div>
);

function MicBtn({onResult, sm}) {
  const {active, toggle} = useMic(onResult);
  const sz = sm ? 30 : 34;
  return (
    <button onClick={toggle}
      style={{width:sz,height:sz,borderRadius:"50%",border:`1.5px solid ${active?C.blue:C.border}`,background:active?C.accentSoft:"transparent",color:active?C.blue:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,transition:"all 0.2s",animation:active?"micPulse 1.5s infinite":"none"}}>
      {active?"⏹":"🎤"}
    </button>
  );
}

function FInput({label,type="text",placeholder,value,onChange,error,icoL,icoR,onIcoR,voice}) {
  const [f, setF] = useState(false);
  return (
    <div style={{marginBottom:12}}>
      {label && <label style={{fontSize:10,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>{label}</label>}
      <div style={{position:"relative",display:"flex",alignItems:"center",gap:6}}>
        <div style={{position:"relative",flex:1}}>
          {icoL && <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,pointerEvents:"none"}}>{icoL}</span>}
          <input type={type} placeholder={placeholder} value={value} onChange={onChange}
            onFocus={()=>setF(true)} onBlur={()=>setF(false)}
            style={{width:"100%",background:C.surface,border:`1px solid ${error?C.red:f?C.blue:C.border}`,borderRadius:8,padding:`10px ${icoR?40:12}px 10px ${icoL?38:12}px`,color:C.text,fontSize:13,transition:"border-color 0.2s"}}/>
          {icoR && <span onClick={onIcoR} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:13}}>{icoR}</span>}
        </div>
        {voice && <MicBtn onResult={t=>onChange({target:{value:value+(value?" ":"")+t}})} sm/>}
      </div>
      {error && <div style={{fontSize:10,color:C.red,marginTop:3}}>{error}</div>}
    </div>
  );
}

function FArea({label,placeholder,value,onChange,rows=4,hint,voice}) {
  const [f, setF] = useState(false);
  return (
    <div style={{marginBottom:12}}>
      {label && <label style={{fontSize:10,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>{label}</label>}
      <div style={{position:"relative"}}>
        <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
          onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{width:"100%",background:C.surface,border:`1px solid ${f?C.blue:C.border}`,borderRadius:8,padding:"11px 13px",color:C.text,fontSize:13,lineHeight:1.7,resize:"vertical",fontFamily:"inherit",transition:"border-color 0.2s"}}/>
        {voice && <div style={{position:"absolute",bottom:7,right:7}}><MicBtn onResult={t=>onChange({target:{value:value+(value?"\n":"")+t}})} sm/></div>}
      </div>
      {hint && <div style={{fontSize:10,color:C.muted,marginTop:3}}>{hint}</div>}
    </div>
  );
}

function FSelect({label,value,onChange,options}) {
  return (
    <div style={{marginBottom:0}}>
      {label && <label style={{fontSize:10,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>{label}</label>}
      <div style={{position:"relative"}}>
        <select value={value} onChange={e=>onChange(e.target.value)}
          style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 32px 10px 12px",color:C.text,fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>
          {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
        </select>
        <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted,fontSize:9}}>▾</span>
      </div>
    </div>
  );
}

const PriBtn = ({children,onClick,loading,disabled,fullWidth=true,variant="blue"}) => {
  const bg = variant==="violet" ? "linear-gradient(135deg,#9b7fe8,#c4b5fd)"
    : loading||disabled ? "#0c1220"
    : `linear-gradient(135deg,${C.blue},${C.accent})`;
  return (
    <button onClick={onClick} disabled={loading||disabled}
      style={{width:fullWidth?"100%":"auto",padding:"12px 20px",borderRadius:8,border:"none",background:bg,color:loading||disabled?C.muted:"#000",fontSize:13,fontWeight:800,cursor:loading||disabled?"not-allowed":"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:loading||disabled?"none":variant==="violet"?"0 4px 20px rgba(155,127,232,0.3)":`0 4px 20px ${C.blueGlow}`,fontFamily:"inherit",letterSpacing:"0.01em"}}>
      {loading?<><Spin/> Processing...</>:children}
    </button>
  );
};

const SecBtn = ({children,onClick}) => (
  <button onClick={onClick}
    style={{width:"100%",padding:"11px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.text;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
    {children}
  </button>
);

function PlanBadge({plan}) {
  const map = {free:{label:"FREE",bg:"rgba(61,219,164,0.12)",color:C.green},pro:{label:"PRO",bg:C.accentSoft,color:C.blue},student:{label:"STUDENT",bg:C.violetSoft,color:C.violet}};
  const d = map[plan]; if(!d) return null;
  return <span style={{background:d.bg,color:d.color,fontSize:9,fontWeight:800,letterSpacing:"0.1em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",flexShrink:0}}>{d.label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TermsModal({onClose}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:C.bg,display:"flex",flexDirection:"column",animation:"fadeUp 0.2s ease",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{background:"rgba(0,0,0,0.98)",borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Terms & Conditions</div>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px 48px",maxWidth:620,width:"100%",margin:"0 auto"}}>
        {TERMS_CONTENT.map((s,i)=>(
          <div key={i} style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:5}}>{s.h}</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.75}}>{s.b}</div>
            {i<TERMS_CONTENT.length-1&&<div style={{height:1,background:C.border,marginTop:16}}/>}
          </div>
        ))}
      </div>
      <div style={{padding:"13px 16px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.98)"}}>
        <button onClick={onClose} style={{width:"100%",maxWidth:460,margin:"0 auto",display:"block",padding:"12px",borderRadius:8,background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",border:"none",fontFamily:"inherit"}}>Got it — Close ✓</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SafetyScreen({onAccept}) {
  const [c1,setC1]=useState(false); const [c2,setC2]=useState(false); const [c3,setC3]=useState(false);
  const all = c1&&c2&&c3;
  const CheckRow = ({checked,set,children}) => (
    <div onClick={set} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px",background:checked?C.accentSoft:C.surface,border:`1px solid ${checked?C.blue:C.border}`,borderRadius:9,cursor:"pointer",transition:"all 0.15s",marginBottom:8}}>
      <div style={{width:17,height:17,borderRadius:4,border:`2px solid ${checked?C.blue:C.border}`,background:checked?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
        {checked&&<span style={{color:"#000",fontSize:10,fontWeight:900}}>✓</span>}
      </div>
      <div style={{fontSize:12,color:checked?C.text:C.muted,lineHeight:1.6,transition:"color 0.15s"}}>{children}</div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp 0.4s ease"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:10,animation:"glow 3s ease infinite"}}>🛡️</div>
          <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.01em",marginBottom:6}}>Before You Begin</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Read and accept all three conditions to continue.</div>
        </div>
        <div style={{background:"rgba(245,200,66,0.06)",border:"1px solid rgba(245,200,66,0.2)",borderRadius:9,padding:"11px 13px",marginBottom:18,display:"flex",gap:8}}>
          <span style={{fontSize:15,flexShrink:0}}>⚠️</span>
          <div style={{fontSize:11,color:C.yellow,lineHeight:1.6}}>AI content is generated under <strong>your direction</strong>. You are solely responsible for how it is used.</div>
        </div>
        <CheckRow checked={c1} set={()=>setC1(!c1)}><strong style={{color:c1?"#fff":C.muted}}>I take full responsibility</strong> for all content I generate. GhostwriterMe is not liable for any consequences.</CheckRow>
        <CheckRow checked={c2} set={()=>setC2(!c2)}><strong style={{color:c2?"#fff":C.muted}}>I will not use this tool</strong> to create harmful, illegal, or deceptive content.</CheckRow>
        <CheckRow checked={c3} set={()=>setC3(!c3)}><strong style={{color:c3?"#fff":C.muted}}>I understand AI output may contain errors</strong> and I will verify content before use.</CheckRow>
        <div style={{display:"flex",gap:4,marginBottom:16,marginTop:4}}>
          {[c1,c2,c3].map((c,i)=><div key={i} style={{height:2,flex:1,borderRadius:1,background:c?C.blue:C.border,transition:"background 0.3s"}}/>)}
        </div>
        <button onClick={onAccept} disabled={!all}
          style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:all?`linear-gradient(135deg,${C.blue},${C.accent})`:"#0c1220",color:all?"#000":C.muted,fontSize:13,fontWeight:800,cursor:all?"pointer":"not-allowed",transition:"all 0.3s",fontFamily:"inherit",boxShadow:all?`0 4px 20px ${C.blueGlow}`:"none"}}>
          {all?"I Agree — Enter GhostwriterMe →":"Accept "+[c1,c2,c3].filter(x=>!x).length+" more to continue"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}) {
  const [tab,setTab]=useState("signin"); const [showEmail,setShowEmail]=useState(false);
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [age,setAge]=useState(""); const [showPw,setShowPw]=useState(false);
  const [agreed,setAgreed]=useState(false); const [loading,setLoading]=useState(null);
  const [errs,setErrs]=useState({}); const [showTC,setShowTC]=useState(false);

  const handleSocial = id => {
    if(id==="email"){setShowEmail(true);return;}
    setLoading(id);
    setTimeout(()=>{setLoading(null);onAuth({name:"Demo User",email:"demo@ghostwriterme.com",avatar:"🧠",plan:"free"});},1300);
  };

  const handleSubmit = () => {
    const e={};
    if(!email.includes("@")) e.email="Enter a valid email";
    if(pw.length<6) e.pw="6+ characters";
    if(tab==="signup"){
      if(!name.trim()) e.name="Required";
      const n=parseInt(age,10);
      if(!age||isNaN(n)||n<1||n>120) e.age="Enter valid age";
      else if(n<13) e.age="Must be 13 or older";
      if(!agreed) e.terms="Required";
    }
    if(Object.keys(e).length){setErrs(e);return;}
    setLoading("email");
    setTimeout(()=>{setLoading(null);onAuth({name:tab==="signup"?name:"Demo User",email,avatar:"✨",plan:"free"});},1300);
  };

  return (
    <>
      {showTC&&<TermsModal onClose={()=>setShowTC(false)}/>}
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
        <div style={{textAlign:"center",marginBottom:26,animation:"fadeUp 0.4s ease"}}>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:"-0.02em",color:"#fff",lineHeight:1}}>👻 GhostwriterMe</div>
          <div style={{fontSize:10,color:C.muted,letterSpacing:"0.18em",marginTop:5}}>AI WRITING SUITE</div>
        </div>
        <div style={{width:"100%",maxWidth:370,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 18px",animation:"fadeUp 0.4s 0.08s ease both",boxShadow:"0 20px 50px rgba(0,0,0,0.7)"}}>
          <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:20}}>
            {["signin","signup"].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setShowEmail(false);setErrs({});setAgreed(false);setAge("");}}
                style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:tab===t?C.blue:"transparent",color:tab===t?"#000":C.muted,fontSize:12,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
                {t==="signin"?"Sign In":"Create Account"}
              </button>
            ))}
          </div>
          {!showEmail?(
            <>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:3}}>{tab==="signin"?"Welcome back 👋":"Join GhostwriterMe"}</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:18,lineHeight:1.5}}>{tab==="signin"?"Access your AI writing suite.":"Free forever. No card needed."}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {SOCIAL_PROVIDERS.map(s=>(
                  <button key={s.id} onClick={()=>handleSocial(s.id)} disabled={!!loading}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"11px",borderRadius:8,border:s.border||"none",background:s.bg,color:s.color,fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",transition:"opacity 0.2s,transform 0.15s",opacity:loading&&loading!==s.id?0.4:1,fontFamily:"inherit"}}
                    onMouseEnter={e=>{if(!loading)e.currentTarget.style.transform="scale(1.015)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
                    {loading===s.id?<Spin color={s.color==="#fff"?"#fff":"#333"}/>:<SocialIcon type={s.iconType}/>}
                    {loading===s.id?"Connecting...":s.label}
                  </button>
                ))}
              </div>
            </>
          ):(
            <div style={{animation:"slideIn 0.25s ease"}}>
              <button onClick={()=>setShowEmail(false)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>← Back</button>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:16}}>{tab==="signin"?"Sign in with email":"Sign up with email"}</div>
              {tab==="signup"&&(
                <>
                  <FInput label="Full Name" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} error={errs.name} icoL="👤"/>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:10,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase"}}>Your Age</label>
                    <input type="number" min="1" max="120" placeholder="e.g. 20" value={age} onChange={e=>setAge(e.target.value)}
                      style={{width:"100%",background:C.surface,border:`1px solid ${errs.age?C.red:C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13}}/>
                    {errs.age&&<div style={{fontSize:10,color:C.red,marginTop:3}}>{errs.age}</div>}
                    <div style={{fontSize:10,color:C.muted,marginTop:3}}>Minimum age: 13</div>
                  </div>
                </>
              )}
              <FInput label="Email" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} error={errs.email} icoL="✉️"/>
              <FInput label="Password" type={showPw?"text":"password"} placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} error={errs.pw} icoL="🔒" icoR={showPw?"🙈":"👁️"} onIcoR={()=>setShowPw(!showPw)}/>
              {tab==="signin"&&<div style={{textAlign:"right",marginTop:-5,marginBottom:12}}><span style={{fontSize:11,color:C.blue,cursor:"pointer"}}>Forgot password?</span></div>}
              {tab==="signup"&&(
                <div style={{marginBottom:12}}>
                  <div onClick={()=>{setAgreed(!agreed);if(errs.terms)setErrs({...errs,terms:""});}}
                    style={{display:"flex",alignItems:"flex-start",gap:9,padding:"10px 12px",background:agreed?C.accentSoft:C.surface,border:`1px solid ${errs.terms?C.red:agreed?C.blue:C.border}`,borderRadius:8,cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${agreed?C.blue:errs.terms?C.red:C.border}`,background:agreed?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      {agreed&&<span style={{color:"#000",fontSize:9,fontWeight:900}}>✓</span>}
                    </div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>
                      I agree to the{" "}<span onClick={e=>{e.stopPropagation();setShowTC(true);}} style={{color:C.blue,fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Terms & Conditions</span>{" "}and{" "}<span style={{color:C.blue,fontWeight:700,cursor:"pointer"}}>Privacy Policy</span>
                    </div>
                  </div>
                  {errs.terms&&<div style={{fontSize:10,color:C.red,marginTop:3}}>{errs.terms}</div>}
                </div>
              )}
              <PriBtn loading={loading==="email"} onClick={handleSubmit}>{tab==="signin"?"Sign In →":"Create Account →"}</PriBtn>
            </div>
          )}
          <div style={{textAlign:"center",fontSize:10,color:C.muted,marginTop:14,lineHeight:1.6}}>
            By continuing you agree to our{" "}<span onClick={()=>setShowTC(true)} style={{color:C.blue,cursor:"pointer"}}>Terms</span>{" "}&amp;{" "}<span style={{color:C.blue,cursor:"pointer"}}>Privacy</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING SCREEN — unified 3-tab panel, all USD
// ─────────────────────────────────────────────────────────────────────────────
function PricingScreen({user, onSelect, onContact}) {
  const [tab, setTab]         = useState("pro");
  const [proBill, setProBill] = useState("monthly");
  const [stuBill, setStuBill] = useState("bimonthly");

  const FREE_F = ["3 AI replies / day","Email Mode — unlimited","Grammar check","History (last 50)","🎤 Voice input on all fields","🔊 Text-to-speech on all outputs"];
  const PRO_F  = ["Unlimited AI replies","✍️ Essay Writer (CEFR A1–C2)","🎓 Academic + auto-citations","💼 CV / Resume Builder","📖 Author Mode (12 genres)","Full history across all modes","Priority generation speed"];
  const STU_F  = ["Everything in Pro","🧠 Humanize My Writing (Student exclusive)","CEFR-matched voice output","Draft-to-final coaching","Argument weakness scanner","Student voice calibration","Priority support"];

  const allProF = [...FREE_F,...PRO_F];
  const allStuF = [...FREE_F,...PRO_F,...STU_F];

  const tabs = [{id:"free",label:"Free",color:C.green},{id:"pro",label:"Pro",color:C.blue},{id:"student",label:"🎓 Student",color:C.violet}];

  const getPrice = () => {
    if(tab==="free") return {main:"$0",per:"forever",sub:null};
    if(tab==="pro") return proBill==="monthly"?{main:"$7",per:"/ month",sub:"≈ $84/year"}:{main:"$60",per:"/ year",sub:"Save $24 vs monthly"};
    return stuBill==="bimonthly"?{main:"$20",per:"/ 2 months",sub:"≈ $10/month"}:{main:"$96",per:"/ year",sub:"Save $24 vs bimonthly"};
  };

  const price = getPrice();
  const tabColor = tab==="student"?C.violet:tab==="pro"?C.blue:C.green;
  const features = tab==="student"?allStuF:tab==="pro"?allProF:FREE_F;
  const freeCount = FREE_F.length;
  const proCount  = FREE_F.length+PRO_F.length;

  const handleCTA = () => {
    if(tab==="free"){onSelect("free",null);return;}
    onSelect(tab, tab==="pro"?proBill:stuBill);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 14px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,animation:"fadeUp 0.4s ease"}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{user.avatar}</div>
          <div><div style={{fontSize:13,fontWeight:800,color:"#fff"}}>Hey {user.name.split(" ")[0]} 👋</div><div style={{fontSize:11,color:C.muted}}>{user.email}</div></div>
        </div>
        <div style={{fontSize:24,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",marginBottom:4,animation:"fadeUp 0.4s 0.05s ease both"}}>Choose your plan</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:18,animation:"fadeUp 0.4s 0.08s ease both"}}>All plans include voice input and text-to-speech.</div>

        <div style={{display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:3,marginBottom:14,animation:"fadeUp 0.4s 0.1s ease both"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,padding:"9px 4px",borderRadius:7,border:"none",background:tab===t.id?t.color:"transparent",color:tab===t.id?"#000":C.muted,fontSize:11,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="pro"&&(
          <div style={{display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:3,marginBottom:12,animation:"fadeUp 0.2s ease"}}>
            {[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly — Save $24"}].map(b=>(
              <button key={b.id} onClick={()=>setProBill(b.id)}
                style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:proBill===b.id?C.blue:"transparent",color:proBill===b.id?"#000":C.muted,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
                {b.label}
              </button>
            ))}
          </div>
        )}

        {tab==="student"&&(
          <div style={{display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:3,marginBottom:12,animation:"fadeUp 0.2s ease"}}>
            {[{id:"bimonthly",label:"Every 2 Months"},{id:"yearly",label:"Yearly — Save $24"}].map(b=>(
              <button key={b.id} onClick={()=>setStuBill(b.id)}
                style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:stuBill===b.id?C.violet:"transparent",color:stuBill===b.id?"#000":C.muted,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
                {b.label}
              </button>
            ))}
          </div>
        )}

        {tab==="student"&&(
          <div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.25)",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",gap:8,animation:"fadeUp 0.2s ease"}}>
            <span style={{fontSize:15,flexShrink:0}}>🎓</span>
            <div style={{fontSize:11,color:C.violet,lineHeight:1.6}}>Includes exclusive <strong>Humanize My Writing</strong> — a writing improvement tool to develop your authentic voice.</div>
          </div>
        )}

        <div style={{
          background:tab==="student"?`linear-gradient(150deg,rgba(155,127,232,0.07),${C.card})`:tab==="pro"?`linear-gradient(150deg,rgba(121,186,236,0.08),${C.card})`:C.card,
          border:`1px solid ${tab==="student"?"rgba(155,127,232,0.4)":tab==="pro"?C.blue:C.border}`,
          borderRadius:12,padding:"18px",position:"relative",overflow:"hidden",
          boxShadow:tab==="student"?`0 0 28px ${C.violetGlow}`:tab==="pro"?`0 0 28px ${C.blueGlow}`:"none",
          marginBottom:14,animation:"fadeUp 0.3s ease",
        }}>
          {tab!=="free"&&(
            <div style={{position:"absolute",top:-1,right:14,background:tab==="student"?"linear-gradient(135deg,#9b7fe8,#c4b5fd)":`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:9,fontWeight:900,letterSpacing:"0.08em",padding:"3px 10px",borderRadius:"0 0 6px 6px"}}>
              {tab==="student"?"🎓 STUDENT PLAN":"MOST POPULAR"}
            </div>
          )}
          <div style={{fontSize:10,letterSpacing:"0.12em",color:tabColor,textTransform:"uppercase",marginBottom:5}}>{tab.toUpperCase()}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:2}}>
            <span style={{fontSize:34,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:"-0.02em"}}>{price.main}</span>
            <span style={{fontSize:12,color:C.muted}}>{price.per}</span>
          </div>
          {price.sub&&<div style={{fontSize:10,color:(proBill==="yearly"||stuBill==="yearly")?C.green:C.muted,marginBottom:14}}>{price.sub}</div>}
          {!price.sub&&<div style={{marginBottom:14}}/>}

          <ul style={{listStyle:"none",marginBottom:16,display:"flex",flexDirection:"column",gap:5,maxHeight:270,overflowY:"auto"}}>
            {features.map((f,i)=>{
              const isProEx  = tab==="pro"    && i>=freeCount;
              const isStuEx  = tab==="student" && i>=proCount;
              const isProBas = tab==="student" && i>=freeCount && i<proCount;
              return (
                <li key={f} style={{fontSize:12,color:isStuEx?C.accent:isProEx||isProBas?C.text:C.muted,display:"flex",alignItems:"flex-start",gap:6}}>
                  <span style={{color:isStuEx?C.violet:isProEx?C.blue:isProBas?C.blue:C.green,flexShrink:0,marginTop:1}}>✓</span>{f}
                </li>
              );
            })}
          </ul>

          {tab!=="free"&&(
            <div style={{background:tab==="student"?C.violetSoft:C.accentSoft,border:`1px solid ${tab==="student"?"rgba(155,127,232,0.2)":"rgba(121,186,236,0.2)"}`,borderRadius:8,padding:"9px 11px",marginBottom:13,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:17}}>🎁</span>
              <div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>3-day free trial</div><div style={{fontSize:10,color:C.muted}}>No charge until day 4 · Cancel anytime</div></div>
            </div>
          )}

          {tab==="free"    && <SecBtn onClick={handleCTA}>Continue Free</SecBtn>}
          {tab==="pro"     && <PriBtn onClick={handleCTA}>Start Free Trial →</PriBtn>}
          {tab==="student" && <PriBtn onClick={handleCTA} variant="violet">Start Student Free Trial 🎓</PriBtn>}
        </div>

        <div style={{display:"flex",justifyContent:"center",gap:5,flexWrap:"wrap",animation:"fadeUp 0.4s 0.18s ease both"}}>
          {tabs.filter(t=>t.id!==tab).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.color=t.color;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
              View {t.id==="student"?"Student":"Pro"} plan
            </button>
          ))}
        </div>

        {/* Contact Us in pricing */}
        <div style={{marginTop:24,textAlign:"center"}}>
          <button onClick={onContact}
            style={{background:"transparent",border:"none",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>
            Questions? Contact us ✉️
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function PaymentScreen({user, billing, targetPlan, onComplete}) {
  const [method, setMethod]   = useState(null);
  const [step, setStep]       = useState("method");
  const [loading, setLoading] = useState(false);
  const [card, setCard]       = useState({number:"",name:"",expiry:"",cvv:""});
  const [cErr, setCErr]       = useState({});
  const isStudent = targetPlan==="student";
  const planColor = isStudent ? C.violet : C.blue;

  const priceStr = isStudent
    ? (billing==="yearly"?"$96 / year":"$20 / 2 months")
    : (billing==="yearly"?"$60 / year":"$7 / month");

  const METHODS = [
    {id:"card",    label:"Credit / Debit Card",icon:"💳",desc:"Visa, Mastercard",  color:"#1a2e50"},
    {id:"applepay",label:"Apple Pay",           icon:"🍎",desc:"Face ID / Touch ID",color:"#111"},
    {id:"paypal",  label:"PayPal",              icon:"🅿️",desc:"Pay with PayPal",  color:"#003087"},
  ];

  const fmt4   = v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp = v=>{const n=v.replace(/\D/g,"").slice(0,4);return n.length>2?n.slice(0,2)+"/"+n.slice(2):n;};
  const brand  = n=>{const d=n.replace(/\s/g,"");if(d.startsWith("4"))return"VISA";if(d.startsWith("5"))return"MC";return null;};

  const validateCard = () => {
    const e={};
    if(card.number.replace(/\s/g,"").length<16) e.number="Enter 16-digit number";
    if(!card.name.trim()) e.name="Name required";
    if(card.expiry.length<5) e.expiry="MM/YY";
    if(card.cvv.length<3) e.cvv="3 digits";
    setCErr(e); return !Object.keys(e).length;
  };

  const handlePay = () => {
    if(method==="card"&&!validateCard()) return;
    setLoading(true); setTimeout(()=>{setLoading(false);setStep("success");},2000);
  };

  if(step==="success") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:320,animation:"fadeUp 0.5s ease"}}>
        <div style={{fontSize:64,marginBottom:12,animation:"pulse 2s ease infinite"}}>🎉</div>
        <div style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",marginBottom:6}}>You're in!</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:22}}>{isStudent?"Student plan activated!":"3-day free trial started."}<br/>All features unlocked. 🚀</div>
        <PriBtn onClick={onComplete} variant={isStudent?"violet":"blue"}>Enter the App →</PriBtn>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 14px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>Payment</div>
          <div style={{fontSize:11,color:C.muted}}>Secure checkout · SSL encrypted · Cancel anytime</div>
        </div>
        <Card style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>GhostwriterMe {isStudent?"Student":"Pro"}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:1}}>{billing} · after 3-day trial</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:16,fontWeight:900,color:planColor}}>{priceStr.split(" ")[0]}</div>
              <div style={{fontSize:10,color:C.green,marginTop:1}}>Today: $0.00 ✓</div>
            </div>
          </div>
        </Card>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9}}>Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {METHODS.map(m=>(
              <button key={m.id} onClick={()=>setMethod(m.id)}
                style={{display:"flex",alignItems:"center",gap:11,padding:"12px",background:method===m.id?C.accentSoft:C.card,border:`1px solid ${method===m.id?planColor:C.border}`,borderRadius:9,cursor:"pointer",transition:"all 0.2s",textAlign:"left",fontFamily:"inherit"}}>
                <div style={{width:38,height:38,borderRadius:8,flexShrink:0,background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>{m.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{m.label}</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>{m.desc}</div></div>
                {method===m.id&&<div style={{width:18,height:18,borderRadius:"50%",background:planColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,color:"#000",fontWeight:900}}>✓</span></div>}
              </button>
            ))}
          </div>
        </div>
        {method==="card"&&(
          <Card style={{marginBottom:14,animation:"slideIn 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
              <div style={{fontSize:11,color:C.muted}}>Card details</div>
              <div style={{display:"flex",gap:4}}>{["VISA","MC"].map(b=><div key={b} style={{background:brand(card.number)===b?"#fff":"transparent",border:`1px solid ${brand(card.number)===b?"#fff":C.border}`,borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:900,color:brand(card.number)===b?"#000":C.muted}}>{b}</div>)}</div>
            </div>
            <FInput label="Card Number" placeholder="1234 5678 9012 3456" icoL="💳" value={card.number} onChange={e=>setCard({...card,number:fmt4(e.target.value)})} error={cErr.number}/>
            <FInput label="Cardholder Name" placeholder="As shown on card" icoL="👤" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} error={cErr.name}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FInput label="Expiry" placeholder="MM/YY" value={card.expiry} onChange={e=>setCard({...card,expiry:fmtExp(e.target.value)})} error={cErr.expiry}/>
              <FInput label="CVV" type="password" placeholder="•••" value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value.replace(/\D/g,"").slice(0,4)})} error={cErr.cvv}/>
            </div>
            <div style={{fontSize:10,color:C.muted}}>🔒 Processed by Stripe. We never store card data.</div>
          </Card>
        )}
        {method==="applepay"&&<Card style={{marginBottom:14,textAlign:"center",animation:"slideIn 0.3s ease"}}><div style={{fontSize:30,marginBottom:7}}>🍎</div><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:3}}>Apple Pay</div><div style={{fontSize:11,color:C.muted}}>Authenticate with Face ID or Touch ID.</div></Card>}
        {method==="paypal"&&<Card style={{marginBottom:14,textAlign:"center",animation:"slideIn 0.3s ease"}}><div style={{fontSize:30,marginBottom:7}}>🅿️</div><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:3}}>PayPal</div><div style={{fontSize:11,color:C.muted}}>You'll be redirected to PayPal to approve.</div></Card>}
        {method&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <PriBtn loading={loading} onClick={handlePay} variant={isStudent?"violet":"blue"}>
              {method==="applepay"?"Confirm with Apple Pay":method==="paypal"?"Continue to PayPal →":"Confirm & Start Free Trial →"}
            </PriBtn>
            <div style={{textAlign:"center",fontSize:10,color:C.muted,marginTop:7}}>🔒 Secure · No charge today · Cancel anytime</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY MODE
// ─────────────────────────────────────────────────────────────────────────────
function HistoryMode({user}) {
  const [filter,setFilter]=useState("all"); const [items,setItems]=useState([]); const [exp,setExp]=useState(null);
  const ML={reply:"AI Reply",email:"Email",essay:"Essay",academic:"Academic",cv:"CV",author:"Author",grammar:"Grammar",humanize:"Humanize"};
  const MI={reply:"💬",email:"📧",essay:"✍️",academic:"🎓",cv:"💼",author:"📖",grammar:"✅",humanize:"🧠"};
  useEffect(()=>{setItems(HS.loadAll(user.email));},[user.email]);
  const filtered = filter==="all"?items:items.filter(i=>i.mode===filter);
  if(!items.length) return <div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:40,marginBottom:10}}>🕐</div><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:5}}>No history yet</div><div style={{fontSize:12,color:C.muted}}>Generated content will appear here.</div></div>;
  return (
    <div>
      <div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:3}}>
        {["all",...Object.keys(ML)].map(m=>(
          <button key={m} onClick={()=>setFilter(m)}
            style={{flexShrink:0,padding:"5px 10px",borderRadius:20,border:`1px solid ${filter===m?C.blue:C.border}`,background:filter===m?C.accentSoft:"transparent",color:filter===m?C.blue:C.muted,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
            {m==="all"?"All":(MI[m]||"")+" "+(ML[m]||m)}
          </button>
        ))}
      </div>
      <div style={{fontSize:10,color:C.muted,marginBottom:9}}>{filtered.length} item{filtered.length!==1?"s":""}</div>
      {filtered.map(item=>(
        <Card key={item.id} style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:exp===item.id?9:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}>
              <span style={{fontSize:16,flexShrink:0}}>{MI[item.mode]||"📝"}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:10,color:C.muted}}>{ML[item.mode]||item.mode} · {new Date(item.ts).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                <div style={{fontSize:12,color:C.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title||item.output?.slice(0,55)||"Untitled"}</div>
              </div>
            </div>
            <button onClick={()=>setExp(exp===item.id?null:item.id)}
              style={{flexShrink:0,padding:"4px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:10,cursor:"pointer",fontFamily:"inherit",marginLeft:6}}>
              {exp===item.id?"Hide":"View"}
            </button>
          </div>
          {exp===item.id&&(
            <div style={{animation:"fadeUp 0.2s ease"}}>
              {item.input&&<div style={{fontSize:10,color:C.muted,background:C.surface,borderRadius:6,padding:"7px 10px",marginBottom:7,lineHeight:1.5}}><strong>Input:</strong> {item.input}</div>}
              <div style={{fontSize:12,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto",background:C.surface,borderRadius:6,padding:"9px 11px"}}>{item.output}</div>
              <OutputActions text={item.output}/>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: AI REPLIES
// ─────────────────────────────────────────────────────────────────────────────
function ReplyMode({user,isPro}) {
  const [msg,setMsg]=useState(""); const [tone,setTone]=useState("confident"); const [noDesp,setNoDesp]=useState(false);
  const [replies,setReplies]=useState([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [used,setUsed]=useState(0);
  const FREE_LIMIT=3; const ref=useRef(null);
  const gen = async () => {
    if(!msg.trim())return; if(!isPro&&used>=FREE_LIMIT){setError("Free limit reached.");return;}
    setLoading(true);setError("");setReplies([]);
    const t=TONES.find(x=>x.id===tone);
    const sys="You are GhostwriterMe — witty, socially calibrated. No em-dashes. "+(noDesp?"Strip ALL clingy/desperate energy. Unbothered only. ":"")+"Tone: "+t.label+" — "+t.desc+". Return ONLY valid JSON: {\"replies\":[{\"option\":1,\"text\":\"...\",\"vibe\":\"one-word\"},{\"option\":2,\"text\":\"...\",\"vibe\":\"one-word\"},{\"option\":3,\"text\":\"...\",\"vibe\":\"one-word\"}]}";
    try {
      const raw=await callClaude(sys,"Message:\n\""+msg+"\"",1000);
      const p=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setReplies(p.replies||[]);setUsed(u=>u+1);
      if(user&&p.replies?.[0])HS.save(user.email,"reply",{title:"Reply to: "+msg.slice(0,40),input:msg,output:p.replies[0].text});
      setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),80);
    } catch{setError("Something went wrong.");}
    finally{setLoading(false);}
  };
  return (
    <div>
      {!isPro&&<div style={{background:C.accentSoft,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 12px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:C.muted}}>{FREE_LIMIT-used} free replies left today</span><span style={{fontSize:10,color:C.blue,fontWeight:700}}>Upgrade →</span></div>}
      <FArea label="Paste the Message" placeholder={"\"hey, you free this weekend?\"\n\"we need to talk...\"\nPaste anything stressing you out 💀"} value={msg} onChange={e=>setMsg(e.target.value)} rows={4} voice/>
      <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8,marginTop:2}}>Pick Your Energy</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {TONES.map(t=>(
          <button key={t.id} onClick={()=>setTone(t.id)} style={{background:tone===t.id?C.accentSoft:C.surface,border:`1px solid ${tone===t.id?C.blue:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
            <div style={{fontSize:16}}>{t.emoji}</div><div style={{fontSize:12,fontWeight:700,marginTop:3}}>{t.label}</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>{t.desc}</div>
          </button>
        ))}
      </div>
      <div onClick={()=>setNoDesp(!noDesp)} style={{background:noDesp?C.accentSoft:C.surface,border:`1px solid ${noDesp?C.blue:C.border}`,borderRadius:8,padding:"11px 13px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.15s",marginBottom:13}}>
        <div><div style={{fontSize:12,fontWeight:700}}>💀 Don't Sound Desperate</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>Strips clingy energy. Unbothered only.</div></div>
        <Toggle on={noDesp} set={()=>setNoDesp(!noDesp)}/>
      </div>
      <PriBtn onClick={gen} loading={loading} disabled={!msg.trim()}>✍️ Generate Replies</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {replies.length>0&&(
        <div ref={ref} style={{marginTop:20,animation:"fadeUp 0.4s ease"}}>
          {replies.map((r,i)=>(
            <Card key={i} style={{marginTop:9}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{r.vibe}</span><span style={{fontSize:10,color:C.muted}}>Option {r.option}</span></div>
              <div style={{fontSize:13,lineHeight:1.7,color:C.text}}>{r.text}</div>
              <OutputActions text={r.text}/>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: EMAIL
// ─────────────────────────────────────────────────────────────────────────────
function EmailMode({user}) {
  const [etype,setEtype]=useState("professional"); const [ctx,setCtx]=useState(""); const [rec,setRec]=useState("");
  const [kp,setKp]=useState(""); const [tone,setTone]=useState("professional"); const [len,setLen]=useState("medium");
  const [res,setRes]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const gen = async () => {
    if(!ctx.trim())return; setLoading(true);setError("");setRes(null);
    const eObj=EMAIL_TYPES.find(e=>e.id===etype); const tObj=TONES.find(t=>t.id===tone);
    const wt={short:"~80 words",medium:"~150 words",long:"~250 words"}[len];
    try{const raw=await callClaude("Expert email writer. Return ONLY valid JSON: {\"subject\":\"...\",\"body\":\"...\",\"tip\":\"brief tip\"}","Write a "+eObj.label+" email. Context: "+ctx+(rec?" Recipient: "+rec:"")+(kp?" Key points: "+kp:"")+" Tone: "+tObj.label+" Length: "+wt,1000);const r=JSON.parse(raw.replace(/```json|```/g,"").trim());setRes(r);if(user)HS.save(user.email,"email",{title:r.subject,input:ctx,output:r.body});}
    catch{setError("Something went wrong.");}finally{setLoading(false);}
  };
  return (
    <div>
      <div style={{background:"rgba(61,219,164,0.06)",border:"1px solid rgba(61,219,164,0.15)",borderRadius:7,padding:"8px 12px",marginBottom:13,display:"flex",alignItems:"center",gap:7}}><PlanBadge plan="free"/><span style={{fontSize:11,color:C.muted}}>Unlimited — free for all users</span></div>
      <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Email Type</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
        {EMAIL_TYPES.map(e=><button key={e.id} onClick={()=>setEtype(e.id)} style={{background:etype===e.id?C.accentSoft:C.surface,border:`1px solid ${etype===e.id?C.blue:C.border}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:16}}>{e.icon}</div><div style={{fontSize:11,fontWeight:700,marginTop:2}}>{e.label}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{e.desc}</div></button>)}
      </div>
      <FArea label="Situation / Context" placeholder="What's this email about?" value={ctx} onChange={e=>setCtx(e.target.value)} rows={3} voice/>
      <FInput label="Recipient (optional)" placeholder="e.g. My manager, a recruiter..." icoL="👤" value={rec} onChange={e=>setRec(e.target.value)} voice/>
      <FArea label="Key Points (optional)" placeholder="e.g. Ask about timeline..." value={kp} onChange={e=>setKp(e.target.value)} rows={2} voice/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <FSelect label="Tone" value={tone} onChange={setTone} options={TONES.map(t=>({value:t.id,label:t.emoji+" "+t.label}))}/>
        <FSelect label="Length" value={len} onChange={setLen} options={[{value:"short",label:"Short"},{value:"medium",label:"Medium"},{value:"long",label:"Long"}]}/>
      </div>
      <PriBtn onClick={gen} loading={loading} disabled={!ctx.trim()}>📧 Generate Email</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {res&&<div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
        <Card style={{marginBottom:9}}><div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Subject</div><div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{res.subject}</div><OutputActions text={res.subject}/></Card>
        <Card style={{marginBottom:9}}><div style={{fontSize:9,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7}}>Body</div><div style={{fontSize:13,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap"}}>{res.body}</div><OutputActions text={res.body}/></Card>
        {res.tip&&<div style={{background:"rgba(245,200,66,0.06)",border:"1px solid rgba(245,200,66,0.15)",borderRadius:8,padding:"10px 12px",display:"flex",gap:8}}><span style={{fontSize:14}}>💡</span><div style={{fontSize:11,color:C.yellow,lineHeight:1.6}}>{res.tip}</div></div>}
      </div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: GRAMMAR
// ─────────────────────────────────────────────────────────────────────────────
function GrammarMode({user}) {
  const [text,setText]=useState(""); const [style,setStyle]=useState("formal");
  const [res,setRes]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const check = async () => {
    if(!text.trim())return; setLoading(true);setError("");setRes(null);
    const s=GRAMMAR_STYLES.find(x=>x.id===style);
    try{const raw=await callClaude("Expert grammar checker. Return ONLY valid JSON: {\"errors\":[{\"type\":\"grammar|spelling|punctuation|style\",\"original\":\"...\",\"fixed\":\"...\",\"explanation\":\"brief\"}],\"rewritten\":\"full rewritten\",\"score\":0-100,\"summary\":\"one sentence\"}","Check & rewrite in "+s.label+" ("+s.desc+") style:\n\n\""+text+"\"",2000);const r=JSON.parse(raw.replace(/```json|```/g,"").trim());setRes(r);if(user)HS.save(user.email,"grammar",{title:"Grammar: "+text.slice(0,40),input:text,output:r.rewritten});}
    catch{setError("Something went wrong.");}finally{setLoading(false);}
  };
  const sc=res?(res.score>=80?C.green:res.score>=60?C.yellow:C.red):C.blue;
  return (
    <div>
      <FArea label="Paste Your Text" placeholder="Any text — email, essay, message..." value={text} onChange={e=>setText(e.target.value)} rows={6} voice/>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Rewrite Style</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {GRAMMAR_STYLES.map(s=><button key={s.id} onClick={()=>setStyle(s.id)} style={{background:style===s.id?C.accentSoft:C.surface,border:`1px solid ${style===s.id?C.blue:C.border}`,borderRadius:8,padding:"11px 7px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:20,marginBottom:4}}>{s.icon}</div><div style={{fontSize:11,fontWeight:700}}>{s.label}</div><div style={{fontSize:9,color:C.muted,marginTop:2,lineHeight:1.3}}>{s.desc}</div></button>)}
        </div>
      </div>
      <PriBtn onClick={check} loading={loading} disabled={!text.trim()}>✅ Check & Rewrite</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {res&&<div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>
        <Card style={{marginBottom:9,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:54,height:54,borderRadius:"50%",border:`3px solid ${sc}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:18,fontWeight:900,color:sc,lineHeight:1}}>{res.score}</span><span style={{fontSize:8,color:C.muted}}>SCORE</span>
          </div>
          <div><div style={{fontSize:13,color:C.text,marginBottom:2}}>{res.summary}</div><div style={{fontSize:10,color:C.muted}}>{res.errors?.length||0} issue{res.errors?.length!==1?"s":""} found</div></div>
        </Card>
        {res.errors?.length>0&&<Card style={{marginBottom:9}}>
          <div style={{fontSize:9,color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Issues Found</div>
          {res.errors.map((e,i)=>{const tc={grammar:C.red,spelling:"#93c5fd",punctuation:C.green,style:"#c4b5fd"}[e.type]||C.muted;return<div key={i} style={{padding:"8px 0",borderBottom:i<res.errors.length-1?`1px solid ${C.border}`:"none"}}><span style={{fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:tc,background:tc+"22",padding:"2px 5px",borderRadius:3}}>{e.type}</span><div style={{display:"flex",gap:6,fontSize:11,marginTop:5,marginBottom:2,flexWrap:"wrap",alignItems:"center"}}><span style={{color:C.red,textDecoration:"line-through"}}>{e.original}</span><span style={{color:C.muted}}>→</span><span style={{color:C.green}}>{e.fixed}</span></div><div style={{fontSize:10,color:C.muted}}>{e.explanation}</div></div>;})}
        </Card>}
        <Card><div style={{fontSize:9,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Rewritten — {GRAMMAR_STYLES.find(s=>s.id===style)?.label}</div><div style={{fontSize:13,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap"}}>{res.rewritten}</div><OutputActions text={res.rewritten}/></Card>
      </div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: ESSAY
// ─────────────────────────────────────────────────────────────────────────────
function EssayMode({user}) {
  const [topic,setTopic]=useState(""); const [details,setDetails]=useState(""); const [level,setLevel]=useState("B2");
  const [type,setType]=useState("Argumentative"); const [wc,setWc]=useState("500");
  const [essay,setEssay]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const LD={A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-intermediate",C1:"Advanced",C2:"Mastery"};
  const gen = async () => {
    if(!topic.trim())return; setLoading(true);setError("");setEssay("");
    try{const res=await callClaude("Expert essay writer. Calibrate EXACTLY to CEFR level. Write ONLY the essay.","Write a "+type+" essay on: \""+topic+"\"\nKey points: "+(details||"none")+"\nCEFR: "+level+"\nWords: ~"+wc,2000);setEssay(res);if(user)HS.save(user.email,"essay",{title:topic,input:type+", "+level+", "+wc+"w",output:res});}
    catch{setError("Something went wrong.");}finally{setLoading(false);}
  };
  return (
    <div>
      <FArea label="Essay Topic" placeholder="e.g. The impact of social media on mental health" value={topic} onChange={e=>setTopic(e.target.value)} rows={2} voice/>
      <FArea label="Key Points (optional)" placeholder="e.g. Stats, comparisons, case studies..." value={details} onChange={e=>setDetails(e.target.value)} rows={3} voice/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <FSelect label="Essay Type" value={type} onChange={setType} options={ESSAY_TYPES}/>
        <FSelect label="Word Count" value={wc} onChange={setWc} options={["300","500","750","1000","1500","2000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{marginBottom:13}}>
        <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:7}}>English Level (CEFR)</div>
        <div style={{display:"flex",gap:5}}>
          {LEVELS.map(l=><button key={l} onClick={()=>setLevel(l)} style={{flex:1,padding:"7px 2px",borderRadius:6,background:level===l?C.accentSoft:C.surface,border:`1px solid ${level===l?C.blue:C.border}`,color:level===l?"#fff":C.muted,fontSize:11,fontWeight:level===l?800:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}
        </div>
        <div style={{fontSize:9,color:C.muted,marginTop:4}}>{LD[level]}</div>
      </div>
      <PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>✍️ Generate Essay</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {essay&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{type} · {level}</span><span style={{fontSize:10,color:C.muted}}>~{essay.split(/\s+/).length}w</span></div><div style={{fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{essay}</div><OutputActions text={essay}/></Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: ACADEMIC
// ─────────────────────────────────────────────────────────────────────────────
function AcademicMode({user}) {
  const [topic,setTopic]=useState(""); const [details,setDetails]=useState("");
  const [cites,setCites]=useState([{type:"url",value:""}]);
  const [wc,setWc]=useState("1000"); const [style,setStyle]=useState("APA");
  const [essay,setEssay]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const addC=()=>setCites([...cites,{type:"url",value:""}]);
  const remC=i=>setCites(cites.filter((_,j)=>j!==i));
  const updC=(i,f,v)=>{const c=[...cites];c[i]={...c[i],[f]:v};setCites(c);};
  const gen = async () => {
    if(!topic.trim())return; setLoading(true);setError("");setEssay("");
    const cl=cites.filter(c=>c.value.trim()).map((c,i)=>"["+(i+1)+"] "+(c.type==="url"?"URL":"PDF")+": "+c.value).join("\n");
    const prompt="Academic essay: \""+topic+"\"\nArguments: "+(details||"none")+"\nWords: ~"+wc+"\nStyle: "+style+(cl?"\nSources:\n"+cl:"");
    try{const res=await callClaude("Expert academic writer. C1/C2 English. Use "+style+" citations. Include References. Write ONLY the essay.",prompt,2500);setEssay(res);if(user)HS.save(user.email,"academic",{title:topic,input:style+", "+wc+"w",output:res});}
    catch{setError("Something went wrong.");}finally{setLoading(false);}
  };
  return (
    <div>
      <FArea label="Thesis / Topic" placeholder="e.g. The role of AI in modern healthcare" value={topic} onChange={e=>setTopic(e.target.value)} rows={2} voice/>
      <FArea label="Arguments & Key Points" placeholder="e.g. ML accuracy, ethical concerns..." value={details} onChange={e=>setDetails(e.target.value)} rows={3} voice/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <FSelect label="Citation Style" value={style} onChange={setStyle} options={["APA","MLA","Chicago","Harvard","Vancouver","IEEE"]}/>
        <FSelect label="Word Count" value={wc} onChange={setWc} options={["500","750","1000","1500","2000","3000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase"}}>Sources to Cite</div>
          <button onClick={addC} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:5,padding:"3px 9px",color:C.blue,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>
        </div>
        {cites.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginBottom:7,alignItems:"center"}}>
            <select value={c.type} onChange={e=>updC(i,"type",e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 6px",color:C.text,fontSize:10,fontFamily:"inherit",width:76,flexShrink:0}}>
              <option value="url">🔗 URL</option><option value="pdf">📄 PDF</option>
            </select>
            <input value={c.value} onChange={e=>updC(i,"value",e.target.value)} placeholder={c.type==="url"?"https://...":"Author, Title, Year..."}
              style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:11,fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
            {cites.length>1&&<button onClick={()=>remC(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,flexShrink:0}}>✕</button>}
          </div>
        ))}
      </div>
      <PriBtn onClick={gen} loading={loading} disabled={!topic.trim()}>🎓 Generate Academic Essay</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {essay&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>Academic · {style}</span><span style={{fontSize:10,color:C.muted}}>~{essay.split(/\s+/).length}w</span></div><div style={{fontSize:13,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"'Instrument Serif',Georgia,serif"}}>{essay}</div><OutputActions text={essay}/></Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: CV
// ─────────────────────────────────────────────────────────────────────────────
function CVMode({user}) {
  const [jt,setJt]=useState(""); const [ind,setInd]=useState(""); const [exp,setExp]=useState("");
  const [ski,setSki]=useState(""); const [edu,setEdu]=useState(""); const [ach,setAch]=useState("");
  const [tr,setTr]=useState(""); const [cvs,setCvs]=useState("modern"); const [sec,setSec]=useState("full");
  const [res,setRes]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const CVS=[{id:"modern",icon:"⚡",label:"Modern",desc:"ATS-optimized"},{id:"executive",icon:"👔",label:"Executive",desc:"Senior tone"},{id:"creative",icon:"🎨",label:"Creative",desc:"Stand out"},{id:"minimal",icon:"◽",label:"Minimal",desc:"Clean"}];
  const gen = async () => {
    if(!jt.trim()&&!exp.trim())return; setLoading(true);setError("");setRes("");
    const p=sec==="full"?"Complete "+cvs+" CV: Job: "+(jt||"N/A")+" Target: "+(tr||jt||"N/A")+" Industry: "+(ind||"N/A")+" Experience: "+(exp||"N/A")+" Skills: "+(ski||"N/A")+" Education: "+(edu||"N/A")+" Achievements: "+(ach||"N/A"):"Write only the "+sec+" section. Job: "+jt+". Experience: "+exp+". Skills: "+ski;
    try{const r=await callClaude("Expert CV writer. Strong action verbs. Format with ## headings. Write ONLY the CV.",p,2000);setRes(r);if(user)HS.save(user.email,"cv",{title:"CV: "+(jt||tr),input:cvs,output:r});}
    catch{setError("Something went wrong.");}finally{setLoading(false);}
  };
  return (
    <div>
      <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>CV Style</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
        {CVS.map(s=><button key={s.id} onClick={()=>setCvs(s.id)} style={{background:cvs===s.id?C.accentSoft:C.surface,border:`1px solid ${cvs===s.id?C.blue:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:16}}>{s.icon}</div><div style={{fontSize:11,fontWeight:700,marginTop:2}}>{s.label}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{s.desc}</div></button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:3}}>
        <FSelect label="Generate" value={sec} onChange={setSec} options={[{value:"full",label:"Full CV"},...CV_SECTIONS.map(s=>({value:s,label:s+" only"}))]}/>
        <FInput label="Target Role" placeholder="e.g. Senior PM" value={tr} onChange={e=>setTr(e.target.value)} icoL="🎯"/>
      </div>
      <FInput label="Current Job Title" placeholder="e.g. Product Manager" icoL="💼" value={jt} onChange={e=>setJt(e.target.value)}/>
      <FInput label="Industry" placeholder="e.g. FinTech, Healthcare" icoL="🏢" value={ind} onChange={e=>setInd(e.target.value)}/>
      <FArea label="Work Experience" placeholder="Company, title, years, responsibilities..." value={exp} onChange={e=>setExp(e.target.value)} rows={4} voice/>
      <FArea label="Key Skills" placeholder="e.g. Python, Figma, leadership..." value={ski} onChange={e=>setSki(e.target.value)} rows={2} voice/>
      <FArea label="Education" placeholder="e.g. BSc CS, Chulalongkorn, 2019–2023" value={edu} onChange={e=>setEdu(e.target.value)} rows={2}/>
      <FArea label="Achievements (optional)" placeholder="e.g. Grew revenue 40%..." value={ach} onChange={e=>setAch(e.target.value)} rows={2} voice/>
      <PriBtn onClick={gen} loading={loading} disabled={!jt.trim()&&!exp.trim()}>💼 Build My CV</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {res&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:11}}><span style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{cvs} CV</span><span style={{fontSize:10,color:C.muted}}>~{res.split(/\s+/).length}w</span></div><div style={{fontSize:12,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap",fontFamily:"'Instrument Serif',Georgia,serif"}}>{res}</div><OutputActions text={res}/></Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE: AUTHOR
// ─────────────────────────────────────────────────────────────────────────────
function AuthorMode({user}) {
  const [cat,setCat]=useState("fiction"); const [genre,setGenre]=useState("fantasy"); const [nfg,setNfg]=useState("memoir");
  const [prompt,setPrompt]=useState(""); const [chars,setChars]=useState(""); const [setting,setSetting]=useState("");
  const [ot,setOt]=useState("scene"); const [len,setLen]=useState("medium"); const [pov,setPov]=useState("third");
  const [res,setRes]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const OT=[{id:"scene",label:"Scene",desc:"Narrative"},{id:"opening",label:"Opening",desc:"Hook reader"},{id:"chapter",label:"Chapter",desc:"Full chapter"},{id:"outline",label:"Outline",desc:"Plot structure"},{id:"character",label:"Character",desc:"Profile"},{id:"dialogue",label:"Dialogue",desc:"Conversation"}];
  const ag=cat==="fiction"?FICTION_GENRES.find(g=>g.id===genre):NONFICTION_GENRES.find(g=>g.id===nfg);
  const wt={short:"~300 words",medium:"~600 words",long:"~1200 words"}[len];
  const gen = async () => {
    if(!prompt.trim())return; setLoading(true);setError("");setRes("");
    const isFic=cat==="fiction";
    const sys=isFic?"Master "+(ag?.label)+" fiction author. Show don't tell. Write ONLY the content.":"Award-winning "+(ag?.label)+" non-fiction author. Write ONLY the content.";
    const pm={first:"First person",third:"Third person limited",omniscient:"Third person omniscient"};
    const fullP="Write a "+(ot==="chapter"?"full chapter":ot)+" in the "+(ag?.label)+" "+(isFic?"genre":"style")+".\n"+prompt+"\n"+(chars?"Characters: "+chars+"\n":"")+(setting?"Setting: "+setting+"\n":"")+(isFic?"POV: "+pm[pov]+"\n":"")+"Length: "+wt+"\nMake it feel like a published "+(ag?.label)+(isFic?" novel":" book")+".";
    try{const r=await callClaude(sys,fullP,2500);setRes(r);if(user)HS.save(user.email,"author",{title:(ag?.label)+": "+prompt.slice(0,40),input:ot+", "+len,output:r});}
    catch{setError("Something went wrong.");}finally{setLoading(false);}
  };
  return (
    <div>
      <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:14}}>
        {[{id:"fiction",label:"📖 Fiction"},{id:"nonfiction",label:"📰 Non-Fiction"}].map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:cat===c.id?C.blue:"transparent",color:cat===c.id?"#000":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{c.label}</button>)}
      </div>
      <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Genre</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
        {(cat==="fiction"?FICTION_GENRES:NONFICTION_GENRES).map(g=>{const a=cat==="fiction"?genre===g.id:nfg===g.id;return<button key={g.id} onClick={()=>cat==="fiction"?setGenre(g.id):setNfg(g.id)} style={{background:a?C.accentSoft:C.surface,border:`1px solid ${a?C.blue:C.border}`,borderRadius:8,padding:"8px 9px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,flexShrink:0}}>{g.icon}</span><div><div style={{fontSize:11,fontWeight:700}}>{g.label}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{g.desc}</div></div></button>;})}
      </div>
      <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>What to Generate</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
        {OT.map(o=><button key={o.id} onClick={()=>setOt(o.id)} style={{background:ot===o.id?C.accentSoft:C.surface,border:`1px solid ${ot===o.id?C.blue:C.border}`,borderRadius:7,padding:"8px 6px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}><div style={{fontSize:11,fontWeight:700}}>{o.label}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{o.desc}</div></button>)}
      </div>
      <FArea label="Story / Piece Brief" placeholder={cat==="fiction"?"e.g. A young mage discovers a forbidden spell...":"e.g. The day I realized I had been living someone else's life..."} value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3} voice/>
      <FArea label="Characters (optional)" placeholder={cat==="fiction"?"e.g. Kira — 23, skeptical...":"e.g. My father, my old boss..."} value={chars} onChange={e=>setChars(e.target.value)} rows={2} voice/>
      <FArea label="Setting (optional)" placeholder={cat==="fiction"?"e.g. Floating island city":"e.g. Rural Thailand, 2018"} value={setting} onChange={e=>setSetting(e.target.value)} rows={2}/>
      <div style={{display:"grid",gridTemplateColumns:cat==="fiction"?"1fr 1fr 1fr":"1fr 1fr",gap:12,marginBottom:12}}>
        <FSelect label="Length" value={len} onChange={setLen} options={[{value:"short",label:"Short (~300w)"},{value:"medium",label:"Medium (~600w)"},{value:"long",label:"Long (~1200w)"}]}/>
        {cat==="fiction"&&<FSelect label="POV" value={pov} onChange={setPov} options={[{value:"first",label:"First Person"},{value:"third",label:"Third Limited"},{value:"omniscient",label:"Omniscient"}]}/>}
        <FSelect label="Output" value={ot} onChange={setOt} options={OT.map(o=>({value:o.id,label:o.label}))}/>
      </div>
      <PriBtn onClick={gen} loading={loading} disabled={!prompt.trim()}>📖 Generate {ot.charAt(0).toUpperCase()+ot.slice(1)}</PriBtn>
      {error&&<ErrBox msg={error}/>}
      {res&&<Card style={{marginTop:16,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:11}}><span style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em"}}>{ag?.label} · {ot}</span><span style={{fontSize:10,color:C.muted}}>~{res.split(/\s+/).length}w</span></div><div style={{fontSize:13,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"'Instrument Serif',Georgia,serif",fontStyle:"italic"}}>{res}</div><OutputActions text={res}/></Card>}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MODE: HUMANIZE MY WRITING (Student only)
// Two-pass processing + before/after comparison view
// ─────────────────────────────────────────────────────────────────────────────
function HumanizeMode({user}) {
  const [text,setText]           = useState("");
  const [level,setLevel]         = useState("B2");
  const [intensity,setIntensity] = useState("moderate");
  const [purpose,setPurpose]     = useState("essay");
  const [res,setRes]             = useState(null);
  const [phase,setPhase]         = useState(""); // "pass1" | "pass2" | ""
  const [error,setError]         = useState("");
  const [view,setView]           = useState("output"); // "output" | "compare"

  const LD={A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-intermediate",C1:"Advanced",C2:"Near-native"};
  const PURPOSES=[
    {id:"essay",   icon:"✍️", label:"Essay",   desc:"Academic"},
    {id:"email",   icon:"📧", label:"Email",   desc:"Professional"},
    {id:"report",  icon:"📊", label:"Report",  desc:"Formal"},
    {id:"personal",icon:"💬", label:"Personal",desc:"Casual/Blog"},
  ];
  const INTENSITIES=[
    {id:"light",    label:"Light",    desc:"Fix obvious AI patterns, keep structure"},
    {id:"moderate", label:"Moderate", desc:"Rewrite rhythm and sentence variety"},
    {id:"deep",     label:"Deep",     desc:"Full transformation at your level"},
  ];

  const RULES = `STRICT RULES — follow every single one, no exceptions:
1. NEVER use em dashes (—). Replace with a comma, a period, or rewrite the sentence entirely.
2. NEVER use a colon to introduce a list mid-sentence. Write it out as natural prose instead.
3. NEVER use "not only... but also" sentence structures. Break them into two separate sentences.
4. NEVER start a sentence with: Furthermore, Moreover, Additionally, In conclusion, To summarize, It is important to note, It is worth mentioning, Notably, Evidently, Certainly, Undoubtedly, Consequently, Nevertheless, Subsequently.
5. NEVER use these words: delve, navigate, landscape, realm, crucial, vital, foster, leverage, robust, multifaceted, comprehensive, streamline, cutting-edge, pivotal, testament, transformative, paradigm, holistic, synergy, underscores, showcases, elevate.
6. ALWAYS use contractions where natural: it's, I'm, they're, don't, can't, won't, you'll, that's, there's.
7. ALWAYS vary sentence length. Short sentences. Then a longer one that adds more detail and context. Then another short one. Real people do not write in uniform sentence lengths.
8. NEVER write perfectly balanced paragraphs of similar length. Make some longer, some shorter.
9. Use simple connectors: but, so, and, also, because, though, since. Not formal transitions.
10. Allow minor imperfections. Real writing is not always textbook perfect.
11. Match CEFR ${level} (${LD[level]}): vocabulary and complexity must genuinely match this level.
12. Match purpose: ${purpose}. An essay sounds different from a personal message.`;

  const process = async () => {
    if(!text.trim()) return;
    setPhase("pass1"); setError(""); setRes(null);

    const iMap = {
      light:    "Fix 3 to 5 obvious AI patterns. Keep the original structure and most of the wording.",
      moderate: "Rewrite most sentences. Break up long ones, merge choppy short ones. Same meaning but feels human.",
      deep:     "Fully rewrite. Sound like a real "+LD[level]+" English speaker typed this themselves. Unrecognizable as AI.",
    };

    // ── PASS 1: rewrite ──────────────────────────────────────────────────────
    const pass1Sys = "You are an expert at making AI-written text sound like a real human wrote it.\n\n"+RULES+"\n\nReturn ONLY valid JSON with no markdown fences:\n{\"humanized\":\"the rewritten text\",\"changes\":[{\"what\":\"short label\",\"why\":\"why this sounds more human\"}]}";
    const pass1Prompt = "Intensity: "+intensity+" — "+iMap[intensity]+"\n\nOriginal text:\n"+text;

    let pass1Result;
    try {
      const raw1 = await callClaude(pass1Sys, pass1Prompt, 2000);
      pass1Result = JSON.parse(raw1.replace(/```json|```/g,"").trim());
    } catch {
      setError("Something went wrong on pass 1."); setPhase(""); return;
    }

    // ── PASS 2: review & fix anything that slipped through ───────────────────
    setPhase("pass2");
    const pass2Sys = "You are a strict human-writing reviewer. Your only job is to check the text below and fix any remaining AI patterns that the writer missed.\n\n"+RULES+"\n\nCheck carefully for:\n- Any remaining em dashes (—)\n- Any banned transition words\n- Any banned vocabulary words\n- Paragraphs that are all the same length\n- Sentences that all follow the same structure\n- Missing contractions where they would sound natural\n\nIf everything is already clean, return it unchanged. Return ONLY valid JSON with no markdown fences:\n{\"humanized\":\"the reviewed and corrected text\",\"note\":\"one short sentence describing how the final text reads\"}";
    const pass2Prompt = "Review and fix this text:\n\n"+pass1Result.humanized;

    let finalText, note;
    try {
      const raw2 = await callClaude(pass2Sys, pass2Prompt, 2000);
      const r2   = JSON.parse(raw2.replace(/```json|```/g,"").trim());
      finalText  = r2.humanized || pass1Result.humanized;
      note       = r2.note || "";
    } catch {
      // pass 2 failed — use pass 1 result anyway
      finalText = pass1Result.humanized;
      note      = "";
    }

    const finalRes = { humanized: finalText, changes: pass1Result.changes || [], note };
    setRes(finalRes);
    setView("output");
    if(user) HS.save(user.email,"humanize",{title:"Humanized: "+text.slice(0,40),input:text,output:finalText});
    setPhase("");
  };

  // Simple word-level diff highlight for before/after view
  const diffWords = (orig, updated) => {
    const ow = orig.split(/\s+/);
    const uw = updated.split(/\s+/);
    const result = [];
    for(let i=0;i<uw.length;i++){
      const same = ow[i]===uw[i];
      result.push({word:uw[i], changed:!same});
    }
    return result;
  };

  const isLoading = phase !== "";
  const loadingLabel = phase==="pass1" ? "Pass 1 — Rewriting..." : phase==="pass2" ? "Pass 2 — Reviewing..." : "";

  return (
    <div>
      {/* Header */}
      <div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.28)",borderRadius:8,padding:"11px 13px",marginBottom:14,display:"flex",gap:9}}>
        <span style={{fontSize:17,flexShrink:0}}>🧠</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:C.violet,marginBottom:2}}>Humanize My Writing — Student Exclusive</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Two-pass AI removal. Strips em dashes, robotic transitions, buzzwords, and uniform sentence patterns. Shows you exactly what changed.</div>
        </div>
      </div>

      <FArea label="Paste Your Text" placeholder="Paste any AI-generated or overly formal text here..." value={text} onChange={e=>setText(e.target.value)} rows={6} voice/>

      {/* CEFR Level */}
      <div style={{marginBottom:13}}>
        <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:7}}>Your English Level (CEFR)</div>
        <div style={{display:"flex",gap:5}}>
          {LEVELS.map(l=>(
            <button key={l} onClick={()=>setLevel(l)}
              style={{flex:1,padding:"7px 2px",borderRadius:6,background:level===l?C.violetSoft:C.surface,border:`1px solid ${level===l?C.violet:C.border}`,color:level===l?C.violet:C.muted,fontSize:11,fontWeight:level===l?800:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{fontSize:9,color:C.muted,marginTop:4}}>{LD[level]}</div>
      </div>

      {/* Purpose */}
      <div style={{marginBottom:13}}>
        <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Writing Purpose</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {PURPOSES.map(p=>(
            <button key={p.id} onClick={()=>setPurpose(p.id)}
              style={{background:purpose===p.id?C.violetSoft:C.surface,border:`1px solid ${purpose===p.id?C.violet:C.border}`,borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
              <div style={{fontSize:15}}>{p.icon}</div>
              <div style={{fontSize:11,fontWeight:700,marginTop:2}}>{p.label}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:1}}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>Transformation Intensity</div>
        {INTENSITIES.map(iv=>(
          <div key={iv.id} onClick={()=>setIntensity(iv.id)}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:intensity===iv.id?C.violetSoft:C.surface,border:`1px solid ${intensity===iv.id?C.violet:C.border}`,borderRadius:8,cursor:"pointer",transition:"all 0.15s",marginBottom:6}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:intensity===iv.id?C.violet:C.text}}>{iv.label}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:1}}>{iv.desc}</div>
            </div>
            <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${intensity===iv.id?C.violet:C.border}`,background:intensity===iv.id?C.violet:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {intensity===iv.id&&<div style={{width:7,height:7,borderRadius:"50%",background:"#000"}}/>}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={process} disabled={isLoading||!text.trim()}
        style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:isLoading||!text.trim()?"#0c1220":"linear-gradient(135deg,#9b7fe8,#c4b5fd)",color:isLoading||!text.trim()?C.muted:"#000",fontSize:13,fontWeight:800,cursor:isLoading||!text.trim()?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:9,transition:"all 0.2s",boxShadow:isLoading||!text.trim()?"none":"0 4px 20px rgba(155,127,232,0.3)"}}>
        {isLoading ? (
          <>
            <Spin color="#9b7fe8"/>
            <span style={{color:C.violet}}>{loadingLabel}</span>
          </>
        ) : "🧠 Humanize My Writing"}
      </button>

      {/* Two-pass progress indicator */}
      {isLoading && (
        <div style={{marginTop:10,display:"flex",gap:6,alignItems:"center"}}>
          <div style={{flex:1,height:3,borderRadius:2,background:phase==="pass1"||phase==="pass2"?"rgba(155,127,232,0.6)":C.border,transition:"background 0.4s"}}/>
          <div style={{flex:1,height:3,borderRadius:2,background:phase==="pass2"?"rgba(155,127,232,0.6)":C.border,transition:"background 0.4s"}}/>
          <div style={{fontSize:9,color:C.violet,flexShrink:0,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
            {phase==="pass1"?"1 of 2":"2 of 2"}
          </div>
        </div>
      )}

      {error&&<ErrBox msg={error}/>}

      {/* Results */}
      {res && (
        <div style={{marginTop:16,animation:"fadeUp 0.4s ease"}}>

          {/* Note */}
          {res.note && (
            <div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.2)",borderRadius:8,padding:"9px 12px",marginBottom:10,display:"flex",gap:8}}>
              <span style={{fontSize:14}}>💡</span>
              <div style={{fontSize:11,color:C.violet,lineHeight:1.6}}>{res.note}</div>
            </div>
          )}

          {/* What changed */}
          {res.changes?.length>0 && (
            <Card style={{marginBottom:10,borderColor:"rgba(155,127,232,0.3)"}}>
              <div style={{fontSize:9,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:9}}>What Changed</div>
              {res.changes.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:8,paddingBottom:i<res.changes.length-1?8:0,marginBottom:i<res.changes.length-1?8:0,borderBottom:i<res.changes.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{color:C.violet,flexShrink:0,fontSize:11,marginTop:1}}>✓</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{c.what}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>{c.why}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* View toggle: Output | Before vs After */}
          <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:10}}>
            {[{id:"output",label:"✅ Final Output"},{id:"compare",label:"🔍 Before vs After"}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)}
                style={{flex:1,padding:"7px",borderRadius:5,border:"none",background:view===v.id?C.violet:"transparent",color:view===v.id?"#000":C.muted,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
                {v.label}
              </button>
            ))}
          </div>

          {/* OUTPUT VIEW */}
          {view==="output" && (
            <Card glow glowColor={C.violet}>
              <div style={{fontSize:9,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Humanized Output · 2-Pass Reviewed</div>
              <div style={{fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{res.humanized}</div>
              <OutputActions text={res.humanized}/>
            </Card>
          )}

          {/* BEFORE vs AFTER VIEW */}
          {view==="compare" && (
            <div>
              {/* Side-by-side legend */}
              <div style={{display:"flex",gap:10,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"rgba(240,107,107,0.25)",border:"1px solid rgba(240,107,107,0.5)"}}/>
                  Original
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"rgba(155,127,232,0.25)",border:"1px solid rgba(155,127,232,0.5)"}}/>
                  Changed words
                </div>
              </div>

              {/* BEFORE */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6,fontFamily:"'Cabinet Grotesk',sans-serif"}}>Before</div>
                <div style={{background:"rgba(240,107,107,0.05)",border:"1px solid rgba(240,107,107,0.2)",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>
                  {text}
                </div>
              </div>

              {/* AFTER with highlights */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,color:C.violet,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6,fontFamily:"'Cabinet Grotesk',sans-serif"}}>After</div>
                <div style={{background:"rgba(155,127,232,0.05)",border:"1px solid rgba(155,127,232,0.25)",borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>
                  {diffWords(text, res.humanized).map((w,i)=>(
                    <span key={i}>
                      <span style={{
                        background: w.changed ? "rgba(155,127,232,0.22)" : "transparent",
                        borderRadius: w.changed ? 3 : 0,
                        padding: w.changed ? "1px 2px" : 0,
                        color: w.changed ? C.violet : C.text,
                        fontWeight: w.changed ? 700 : 400,
                        transition:"all 0.2s",
                      }}>
                        {w.word}
                      </span>
                      {i < res.humanized.split(/\s+/).length-1 ? " " : ""}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {[
                  {label:"Original words",  val: text.split(/\s+/).filter(Boolean).length},
                  {label:"Final words",     val: res.humanized.split(/\s+/).filter(Boolean).length},
                  {label:"Words changed",   val: diffWords(text,res.humanized).filter(w=>w.changed).length},
                  {label:"Change rate",     val: Math.round(diffWords(text,res.humanized).filter(w=>w.changed).length / Math.max(res.humanized.split(/\s+/).filter(Boolean).length,1)*100)+"%"},
                ].map(s=>(
                  <div key={s.label} style={{flex:1,minWidth:70,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:C.violet,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{s.val}</div>
                    <div style={{fontSize:9,color:C.muted,marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>

              <OutputActions text={res.humanized}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TrialModal({mode, targetPlan, onStart, onClose}) {
  const [bill, setBill] = useState("monthly");
  const isStudent = targetPlan==="student";
  const planColor = isStudent ? C.violet : C.blue;
  const M={
    essay:{icon:"✍️",title:"Essay Writer",perks:["CEFR A1–C2 levels","6 essay types","Word count control","Instant generation"]},
    academic:{icon:"🎓",title:"Academic Essay",perks:["APA, MLA, Chicago & more","URL/PDF citations","Auto-references","C1/C2 English"]},
    cv:{icon:"💼",title:"CV / Resume Builder",perks:["4 CV styles","ATS-optimised","Full CV or by section","Tailored to role"]},
    author:{icon:"📖",title:"Author Mode",perks:["8 fiction + 4 non-fiction","Scene, chapter, outline","POV selector","Literary quality"]},
    humanize:{icon:"🧠",title:"Humanize My Writing",perks:["CEFR-matched output","3 intensity levels","4 writing contexts","Change breakdown"]},
  };
  const h=M[mode]||M.essay;
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",animation:"fadeUp 0.2s ease"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:500,background:C.card,border:`1px solid ${isStudent?"rgba(155,127,232,0.4)":C.border}`,borderRadius:"14px 14px 0 0",padding:"20px 16px 28px",animation:"slideUpModal 0.3s ease",maxHeight:"92vh",overflowY:"auto",fontFamily:"'Cabinet Grotesk',sans-serif"}}>
        <div style={{width:32,height:3,borderRadius:2,background:C.border,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:15}}>
          <div style={{width:44,height:44,borderRadius:10,background:isStudent?"linear-gradient(135deg,#9b7fe8,#c4b5fd)":`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0}}>{h.icon}</div>
          <div><div style={{fontSize:18,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>{h.title}</div><div style={{fontSize:11,color:C.muted,marginTop:1}}>{isStudent?"Student plan exclusive":"Unlock with a free trial"}</div></div>
        </div>
        {isStudent&&<div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.22)",borderRadius:7,padding:"9px 11px",marginBottom:12,fontSize:11,color:C.violet,lineHeight:1.5}}>🎓 Exclusive to Student plan — a writing improvement tool to develop your authentic voice.</div>}
        <div style={{background:C.surface,borderRadius:9,padding:"11px 13px",marginBottom:14}}>
          {h.perks.map(p=><div key={p} style={{display:"flex",gap:8,fontSize:12,color:C.text,padding:"3px 0"}}><span style={{color:isStudent?C.violet:C.green,flexShrink:0}}>✓</span>{p}</div>)}
        </div>
        {!isStudent&&(
          <div style={{display:"flex",background:C.surface,borderRadius:7,padding:3,marginBottom:12}}>
            {[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly — Save $24"}].map(b=><button key={b.id} onClick={()=>setBill(b.id)} style={{flex:1,padding:"6px",borderRadius:5,border:"none",background:bill===b.id?C.blue:"transparent",color:bill===b.id?"#000":C.muted,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>)}
          </div>
        )}
        <div style={{background:isStudent?"rgba(155,127,232,0.07)":C.accentSoft,border:`1px solid ${isStudent?"rgba(155,127,232,0.25)":"rgba(121,186,236,0.22)"}`,borderRadius:10,padding:"13px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
            <div>
              <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.02em"}}>
                {isStudent?"$20":(bill==="monthly"?"$7":"$60")}
                <span style={{fontSize:12,color:C.muted,fontWeight:400}}>{isStudent?" / 2 months":"/month"}</span>
              </div>
              {!isStudent&&bill==="yearly"&&<div style={{fontSize:10,color:C.green,marginTop:1}}>Save $24/year</div>}
              {isStudent&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>≈ $10/month · or $96/year</div>}
              {!isStudent&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>billed in USD</div>}
            </div>
            <div style={{background:isStudent?C.violetSoft:C.accentSoft,border:`1px solid ${planColor}44`,borderRadius:6,padding:"6px 9px",textAlign:"center"}}>
              <div style={{fontSize:10,color:planColor,fontWeight:800}}>🎁 3 DAYS FREE</div>
              <div style={{fontSize:9,color:C.muted,marginTop:1}}>No charge until day 4</div>
            </div>
          </div>
          <PriBtn onClick={()=>onStart(bill,targetPlan)} variant={isStudent?"violet":"blue"}>{isStudent?"Start Student Free Trial 🎓":"Start Free Trial →"}</PriBtn>
          <div style={{textAlign:"center",fontSize:10,color:C.muted,marginTop:7}}>Cancel anytime · No charge until day 4</div>
        </div>
        <button onClick={onClose} style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Maybe later</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
function AppShell({user, onStartTrial, onSignOut}) {
  const [mode,setMode]         = useState("reply");
  const [trialMode,setTMode]   = useState(null);
  const [trialPlan,setTPlan]   = useState("pro");
  const [showContact,setShowContact] = useState(false);

  const isPro     = user.plan==="pro"||user.plan==="student";
  const isStudent = user.plan==="student";
  const planColor = isStudent ? C.violet : C.blue;

  const canAccess = m => {
    if(m.access==="free") return true;
    if(m.access==="pro+student") return isPro;
    if(m.access==="student") return isStudent;
    return false;
  };

  const handleTab = m => {
    if(!canAccess(m)){setTPlan(m.access==="student"?"student":"pro");setTMode(m.id);}
    else setMode(m.id);
  };

  const handleStart = (bill, plan) => { setTMode(null); onStartTrial(bill, plan); };

  const badgeFor = m => {
    if(m.id==="history") return null;
    if(canAccess(m)) return null;
    if(m.access==="student") return <span style={{background:C.violetSoft,color:C.violet,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:3,textTransform:"uppercase",flexShrink:0}}>STU</span>;
    return <span style={{background:C.accentSoft,color:C.blue,fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:3,textTransform:"uppercase",flexShrink:0}}>PRO</span>;
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Cabinet Grotesk',sans-serif",color:C.text,paddingBottom:80}}>
      {trialMode&&<TrialModal mode={trialMode} targetPlan={trialPlan} onStart={handleStart} onClose={()=>setTMode(null)}/>}
      {showContact&&<ContactModal onClose={()=>setShowContact(false)}/>}

      {/* Navbar */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.95)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`,padding:"10px 13px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:"#fff",letterSpacing:"-0.01em",lineHeight:1}}>👻 GhostwriterMe</div>
          <div style={{fontSize:8,color:C.muted,letterSpacing:"0.15em"}}>AI WRITING SUITE</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          {/* Contact Us button */}
          <button onClick={()=>setShowContact(true)}
            style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:4}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            ✉️ Contact
          </button>
          {isStudent&&<div style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.3)",borderRadius:20,padding:"3px 9px",fontSize:9,color:C.violet,fontWeight:800}}>🎓 STUDENT</div>}
          {isPro&&!isStudent&&<div style={{background:C.accentSoft,border:`1px solid rgba(121,186,236,0.3)`,borderRadius:20,padding:"3px 9px",fontSize:9,color:C.blue,fontWeight:800}}>PRO</div>}
          {!isPro&&(
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>{setTPlan("pro");setTMode("essay");}} style={{background:C.accentSoft,border:`1px solid rgba(121,186,236,0.28)`,borderRadius:20,padding:"3px 8px",fontSize:9,color:C.blue,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Pro $7</button>
              <button onClick={()=>{setTPlan("student");setTMode("humanize");}} style={{background:C.violetSoft,border:"1px solid rgba(155,127,232,0.28)",borderRadius:20,padding:"3px 8px",fontSize:9,color:C.violet,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Student $20</button>
            </div>
          )}
          <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${planColor},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"pointer"}} title={user.email}>{user.avatar}</div>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto",scrollbarWidth:"none"}}>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>handleTab(m)}
            style={{flex:1,minWidth:54,background:"transparent",border:"none",borderBottom:`2px solid ${mode===m.id&&canAccess(m)?planColor:"transparent"}`,padding:"9px 2px 7px",color:mode===m.id&&canAccess(m)?planColor:C.muted,fontFamily:"inherit",fontSize:9,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:14}}>{m.icon}</span>
            <span style={{fontSize:7.5,letterSpacing:"0.02em",whiteSpace:"nowrap"}}>{m.label}</span>
            {badgeFor(m)}
          </button>
        ))}
      </div>

      <div style={{maxWidth:580,margin:"0 auto",padding:"15px 13px 0"}}>
        {isPro&&(
          <div style={{background:isStudent?C.violetSoft:C.accentSoft,border:`1px solid ${isStudent?"rgba(155,127,232,0.2)":"rgba(121,186,236,0.2)"}`,borderRadius:7,padding:"8px 12px",marginBottom:16,display:"flex",alignItems:"center",gap:8,fontSize:12,color:isStudent?C.violet:"#a8d4f5"}}>
            <span>{isStudent?"🎓":"✨"}</span><span>You're on the <strong style={{color:planColor}}>{isStudent?"Student plan":"Pro plan"}</strong> — all features unlocked!</span>
          </div>
        )}
        <div style={{animation:"fadeUp 0.3s ease"}}>
          {mode==="reply"      && <ReplyMode      user={user} isPro={isPro}/>}
          {mode==="email"      && <EmailMode      user={user}/>}
          {mode==="grammar"    && <GrammarMode    user={user}/>}
          {mode==="essay"      && <EssayMode      user={user}/>}
          {mode==="academic"   && <AcademicMode   user={user}/>}
          {mode==="cv"         && <CVMode         user={user}/>}
          {mode==="author"     && <AuthorMode     user={user}/>}
          {mode==="humanize"   && <HumanizeMode   user={user}/>}
          {mode==="history"    && <HistoryMode    user={user}/>}
        </div>

        {/* Footer */}
        <div style={{marginTop:44,paddingTop:16,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6,fontSize:9,color:"#162030",alignItems:"center"}}>
          <span>👻 GhostwriterMe · 9 AI Modes</span>
          <button onClick={()=>setShowContact(true)}
            style={{background:"transparent",border:"none",color:C.muted,fontSize:9,cursor:"pointer",fontFamily:"inherit",padding:0,textDecoration:"underline"}}>
            Contact Us ✉️
          </button>
          <span onClick={onSignOut} style={{color:C.muted,cursor:"pointer",textDecoration:"underline"}}>Sign out</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function GhostwriterMeApp() {
  const [screen, setScreen]   = useState("auth");
  const [user, setUser]       = useState(null);
  const [billing, setBilling] = useState("monthly");
  const [tPlan, setTPlan]     = useState("pro");
  const [showContact, setShowContact] = useState(false);

  const handleAuth       = u  => { setUser({...u,plan:"free"}); setScreen("safety"); };
  const handleSafety     = () => setScreen("app");
  const handleSelectPlan = (plan, bill) => { if(plan==="free"){setScreen("app");return;} setTPlan(plan); setBilling(bill||"monthly"); setScreen("payment"); };
  const handleStartTrial = (bill, plan) => { setTPlan(plan||"pro"); setBilling(bill||"monthly"); setScreen("payment"); };
  const handlePayDone    = () => { setUser(u=>({...u,plan:tPlan})); setScreen("app"); };
  const handleSignOut    = () => { setUser(null); setScreen("auth"); };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {showContact && <ContactModal onClose={()=>setShowContact(false)}/>}
      {screen==="auth"    && <AuthScreen onAuth={handleAuth}/>}
      {screen==="safety"  && <SafetyScreen onAccept={handleSafety}/>}
      {screen==="pricing" && <PricingScreen user={user} onSelect={handleSelectPlan} onContact={()=>setShowContact(true)}/>}
      {screen==="payment" && <PaymentScreen user={user} billing={billing} targetPlan={tPlan} onComplete={handlePayDone}/>}
      {screen==="app"     && <AppShell user={user} onStartTrial={handleStartTrial} onSignOut={handleSignOut}/>}
    </>
  );
}
