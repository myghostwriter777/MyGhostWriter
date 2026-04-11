import React, { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME  — Black + Denim Blue #79BAEC
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:"#000000", surface:"#0a0e14", card:"#0d1219", border:"#1a2535",
  blue:"#79BAEC", blueD:"#4a90c4", blueGlow:"rgba(121,186,236,0.25)",
  accent:"#a8d4f5", accentSoft:"rgba(121,186,236,0.12)",
  text:"#e8f4fd", muted:"#4a6a8a", mutedLight:"#6a8faf",
  green:"#4ade80", red:"#f87171", yellow:"#fbbf24",
};

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
input,button,select,textarea{font-family:inherit;outline:none;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:#1a2535;border-radius:2px;}
select{-webkit-appearance:none;appearance:none;}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes glow{0%,100%{box-shadow:0 0 16px rgba(121,186,236,0.25)}50%{box-shadow:0 0 40px rgba(121,186,236,0.55)}}
@keyframes ripple{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.2);opacity:0}}
@keyframes slideUpModal{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)}}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(121,186,236,0.5)}70%{box-shadow:0 0 0 10px rgba(121,186,236,0)}}
`;

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = {
  free: { id:"free", label:"Free", color:C.green },
  pro:  { id:"pro",  label:"Pro",  color:C.blue  },
  elite:{ id:"elite",label:"Elite",color:"#f0b429"},
};

// ─────────────────────────────────────────────────────────────────────────────
// MODES
// ─────────────────────────────────────────────────────────────────────────────
const MODES = [
  { id:"reply",    icon:"💬", label:"AI Replies",   access:"free"  },
  { id:"email",    icon:"📧", label:"Email",        access:"free"  },
  { id:"grammar",  icon:"✅", label:"Grammar",      access:"free"  },
  { id:"essay",    icon:"✍️",  label:"Essay",        access:"trial" },
  { id:"academic", icon:"🎓", label:"Academic",     access:"trial" },
  { id:"cv",       icon:"💼", label:"CV/Resume",    access:"trial" },
  { id:"author",   icon:"📖", label:"Author",       access:"trial" },
  { id:"history",  icon:"🕐", label:"History",      access:"free"  },
];

const TONES = [
  {id:"chill",        emoji:"😌",label:"Chill",        desc:"laid-back, unbothered"},
  {id:"confident",    emoji:"💪",label:"Confident",    desc:"direct, assured"},
  {id:"flirty",       emoji:"😏",label:"Flirty",       desc:"playful, suggestive"},
  {id:"professional", emoji:"💼",label:"Professional", desc:"clean, polished"},
];

const LEVELS      = ["A1","A2","B1","B2","C1","C2"];
const ESSAY_TYPES = ["Argumentative","Descriptive","Expository","Narrative","Compare & Contrast","Reflective"];

const GRAMMAR_STYLES = [
  {id:"formal",  icon:"🎩",label:"Formal",  desc:"Elevated, authoritative"},
  {id:"academic",icon:"📚",label:"Academic",desc:"Scholarly, precise"},
  {id:"casual",  icon:"🗣️",label:"Casual",  desc:"Natural, conversational"},
];

const EMAIL_TYPES = [
  {id:"professional", icon:"💼",label:"Professional", desc:"Work emails"},
  {id:"follow-up",    icon:"🔄",label:"Follow-up",    desc:"Check-ins"},
  {id:"apology",      icon:"🙏",label:"Apology",      desc:"Make it right"},
  {id:"request",      icon:"📋",label:"Request",      desc:"Ask for something"},
  {id:"cold-outreach",icon:"🚀",label:"Cold Outreach",desc:"First contact"},
  {id:"thank-you",    icon:"🌟",label:"Thank You",    desc:"Gratitude"},
];

const FICTION_GENRES = [
  {id:"fantasy",    icon:"🧙",label:"Fantasy",         desc:"Magic, worlds, quests"},
  {id:"sci-fi",     icon:"🚀",label:"Sci-Fi",          desc:"Tech, space, futures"},
  {id:"romance",    icon:"💕",label:"Romance",         desc:"Love, passion, tension"},
  {id:"thriller",   icon:"🔪",label:"Thriller",        desc:"Suspense, twists"},
  {id:"mystery",    icon:"🔍",label:"Mystery",         desc:"Clues, reveals"},
  {id:"historical", icon:"⚔️", label:"Historical",     desc:"Past eras"},
  {id:"literary",   icon:"🌿",label:"Literary",        desc:"Character-driven"},
  {id:"ya",         icon:"✨",label:"Young Adult",     desc:"Teen voices"},
];

const NONFICTION_GENRES = [
  {id:"memoir",   icon:"📔",label:"Memoir",        desc:"Personal stories"},
  {id:"selfhelp", icon:"💡",label:"Self-Help",     desc:"Growth, mindset"},
  {id:"essay-nf", icon:"🖊️", label:"Personal Essay",desc:"Opinion, voice"},
  {id:"travel",   icon:"🗺️", label:"Travel Writing",desc:"Places, journeys"},
];

const CV_SECTIONS = ["Work Experience","Education","Skills","Summary/Objective","Achievements","Projects","Certifications","Languages","References"];

const SOCIAL_PROVIDERS = [
  {id:"google",   label:"Continue with Google",   iconType:"google",   bg:"#fff",     color:"#1a1a2e"},
  {id:"facebook", label:"Continue with Facebook", iconType:"facebook", bg:"#1877F2",  color:"#fff"},
  {id:"apple",    label:"Continue with Apple",    iconType:"apple",    bg:"#000",     color:"#fff", border:"1px solid #333"},
  {id:"email",    label:"Continue with Email",    iconType:"email",    bg:C.surface,  color:C.text, border:"1px solid #1a2535"},
];

// ─────────────────────────────────────────────────────────────────────────────
// TERMS CONTENT
// ─────────────────────────────────────────────────────────────────────────────
const TERMS_CONTENT = [
  {heading:"1. Acceptance of Terms",body:"By creating an account and using GhostwriterMe (the \"Service\"), you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the Service."},
  {heading:"2. Eligibility & Age Requirement",body:"You must be at least 13 years of age to use this Service. Users under 18 must have parental or guardian consent. We reserve the right to terminate accounts of users found to be underage."},
  {heading:"3. User-Generated Content & Responsibility",body:"ALL content generated through our Service is produced at your direction and under your responsibility. You are solely responsible for any content you create, generate, send, publish, or use through this Service. GhostwriterMe bears no responsibility for any content generated by users."},
  {heading:"4. Prohibited Uses",body:"You agree not to use the Service to generate content that is defamatory, harassing, illegal, fraudulent, or constitutes academic fraud. Violation may result in immediate account termination."},
  {heading:"5. No Warranty on AI Output",body:"AI-generated content is provided \"as is\" without warranty. GhostwriterMe does not guarantee accuracy or fitness for any particular purpose. Verify all AI-generated content before use."},
  {heading:"6. Limitation of Liability",body:"To the fullest extent permitted by law, GhostwriterMe shall not be liable for any damages arising from your use of the Service or any content generated through it."},
  {heading:"7. Privacy & Data",body:"We do not sell your personal data. History data is stored locally on your device. Conversation data may be used in anonymised form to improve our models."},
  {heading:"8. Subscription & Billing",body:"Subscriptions are billed as selected. Free trials begin upon payment authorisation; no charge until the trial ends. Cancel any time before the trial ends to avoid charges."},
  {heading:"9. Governing Law",body:"These Terms are governed by the laws of Thailand. Disputes shall be resolved in Bangkok courts."},
  {heading:"10. Contact",body:"Questions? Email legal@ghostwriterme.com"},
];

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY STORAGE  (localStorage, keyed per user email + mode)
// ─────────────────────────────────────────────────────────────────────────────
const HS = {
  key: (email, mode) => `gwm_hist_${email}_${mode}`,
  save: (email, mode, entry) => {
    try {
      const k = HS.key(email, mode);
      const existing = HS.load(email, mode);
      const updated = [{ ...entry, id: Date.now(), ts: new Date().toISOString() }, ...existing].slice(0, 50);
      localStorage.setItem(k, JSON.stringify(updated));
    } catch(e) { /* storage full or disabled */ }
  },
  load: (email, mode) => {
    try {
      const raw = localStorage.getItem(HS.key(email, mode));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  loadAll: (email) => {
    const modes = ["reply","email","essay","academic","cv","author","grammar"];
    const all = [];
    modes.forEach(m => {
      HS.load(email, m).forEach(e => all.push({ ...e, mode: m }));
    });
    return all.sort((a,b) => new Date(b.ts) - new Date(a.ts));
  },
  clear: (email, mode) => {
    try { localStorage.removeItem(HS.key(email, mode)); } catch{}
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const canSpeech = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
const canTTS    = typeof window !== "undefined" && "speechSynthesis" in window;

function useSpeechInput(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = useCallback(() => {
    if (!canSpeech) { alert("Voice input not supported in this browser. Try Chrome."); return; }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    } else {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = e => {
        const t = e.results[0][0].transcript;
        onResult(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setListening(true);
    }
  }, [listening, onResult]);

  return { listening, toggle };
}

function speakText(text) {
  if (!canTTS) { alert("Text-to-speech not supported in this browser."); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (canTTS) window.speechSynthesis.cancel();
}

// ─────────────────────────────────────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────────────────────────────────────
async function callClaude(system, user, maxTokens = 1500) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const d = await r.json();
  return d.content?.map(b => b.text || "").join("") || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16, color = "#fff" }) => (
  <span style={{ display:"inline-block",width:size,height:size,borderRadius:"50%",border:`2px solid rgba(255,255,255,0.12)`,borderTopColor:color,animation:"spin 0.7s linear infinite",flexShrink:0 }}/>
);

const Tag = ({ children, color = C.blue, style: s }) => (
  <span style={{ fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",color,...s }}>{children}</span>
);

const PlanBadge = ({ plan }) => {
  const p = PLANS[plan];
  if (!p) return null;
  const bg = plan === "elite" ? "rgba(240,180,41,0.15)" : plan === "pro" ? C.accentSoft : "rgba(74,222,128,0.12)";
  return (
    <span style={{ background:bg,color:p.color,fontSize:9,fontWeight:700,letterSpacing:"0.08em",padding:"2px 8px",borderRadius:4,textTransform:"uppercase",flexShrink:0 }}>
      {p.label}
    </span>
  );
};

const Card = ({ children, style: s, highlight }) => (
  <div style={{ background:C.card,border:`1px solid ${highlight?C.blue:C.border}`,borderRadius:12,padding:"16px",...(highlight?{boxShadow:`0 0 24px ${C.blueGlow}`}:{}),...s }}>
    {children}
  </div>
);

const ErrorBox = ({ msg }) => (
  <div style={{ marginTop:10,padding:"10px 14px",background:"#1a0000",border:"1px solid #450a0a",borderRadius:8,fontSize:13,color:C.red }}>{msg}</div>
);

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding:"7px 14px",borderRadius:7,background:copied?"#14532d":"#0d1a0d",border:`1px solid ${copied?"#166534":"#1a2535"}`,color:copied?C.green:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s" }}>
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}

function TTSBtn({ text }) {
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (playing) { stopSpeaking(); setPlaying(false); }
    else { speakText(text); setPlaying(true); setTimeout(() => setPlaying(false), text.length * 60); }
  };
  return (
    <button onClick={toggle} title={playing ? "Stop" : "Listen"}
      style={{ padding:"7px 12px",borderRadius:7,background:playing?C.accentSoft:"transparent",border:`1px solid ${playing?C.blue:C.border}`,color:playing?C.blue:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5 }}>
      {playing ? "⏹ Stop" : "🔊 Listen"}
    </button>
  );
}

function ResultActions({ text }) {
  return (
    <div style={{ display:"flex",gap:8,marginTop:12,flexWrap:"wrap" }}>
      <CopyBtn text={text}/>
      <TTSBtn text={text}/>
    </div>
  );
}

const Toggle = ({ on, onClick }) => (
  <div onClick={onClick} style={{ width:38,height:22,borderRadius:11,background:on?C.blue:"#1a2535",position:"relative",transition:"background 0.2s",flexShrink:0,cursor:"pointer" }}>
    <div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left 0.2s" }}/>
  </div>
);

// Mic button component
function MicBtn({ onResult, small }) {
  const { listening, toggle } = useSpeechInput(onResult);
  const sz = small ? 32 : 36;
  return (
    <button onClick={toggle} title={listening?"Stop recording":"Voice input"}
      style={{ width:sz,height:sz,borderRadius:"50%",border:`1.5px solid ${listening?C.blue:C.border}`,background:listening?C.accentSoft:"transparent",color:listening?C.blue:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,transition:"all 0.2s",animation:listening?"micPulse 1.5s infinite":"none" }}>
      {listening ? "⏹" : "🎤"}
    </button>
  );
}

function FormInput({ label, type = "text", placeholder, value, onChange, error, iconLeft, iconRight, onIconRightClick, voiceInput }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:13 }}>
      {label && <label style={{ fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase" }}>{label}</label>}
      <div style={{ position:"relative",display:"flex",alignItems:"center",gap:6 }}>
        <div style={{ position:"relative",flex:1 }}>
          {iconLeft && <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none" }}>{iconLeft}</span>}
          <input type={type} placeholder={placeholder} value={value} onChange={onChange}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ width:"100%",background:C.surface,border:`1px solid ${error?C.red:focused?C.blue:C.border}`,borderRadius:9,padding:`11px ${iconRight?42:13}px 11px ${iconLeft?40:13}px`,color:C.text,fontSize:13,transition:"border-color 0.2s" }}
          />
          {iconRight && <span onClick={onIconRightClick} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:14 }}>{iconRight}</span>}
        </div>
        {voiceInput && <MicBtn onResult={t => onChange({ target: { value: value + (value?" ":"") + t } })} small/>}
      </div>
      {error && <div style={{ fontSize:11,color:C.red,marginTop:3 }}>{error}</div>}
    </div>
  );
}

function GWTextarea({ label, placeholder, value, onChange, rows = 4, hint, voiceInput }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:13 }}>
      {label && <label style={{ fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase" }}>{label}</label>}
      <div style={{ position:"relative" }}>
        <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width:"100%",background:C.surface,border:`1px solid ${focused?C.blue:C.border}`,borderRadius:9,padding:"12px 14px",color:C.text,fontSize:13,lineHeight:1.7,resize:"vertical",fontFamily:"inherit",transition:"border-color 0.2s" }}
        />
        {voiceInput && (
          <div style={{ position:"absolute",bottom:8,right:8 }}>
            <MicBtn onResult={t => onChange({ target: { value: value + (value?"\n":"") + t } })} small/>
          </div>
        )}
      </div>
      {hint && <div style={{ fontSize:11,color:C.muted,marginTop:3 }}>{hint}</div>}
    </div>
  );
}

function GWSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:0 }}>
      {label && <label style={{ fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase" }}>{label}</label>}
      <div style={{ position:"relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 34px 10px 13px",color:C.text,fontSize:13,fontFamily:"inherit",cursor:"pointer" }}>
          {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
        <span style={{ position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted,fontSize:10 }}>▾</span>
      </div>
    </div>
  );
}

const PrimaryBtn = ({ children, onClick, loading, disabled, fullWidth = true }) => (
  <button onClick={onClick} disabled={loading || disabled}
    style={{ width:fullWidth?"100%":"auto",padding:"13px 22px",borderRadius:9,border:"none",background:loading||disabled?"#0d1219":`linear-gradient(135deg,${C.blue},${C.accent})`,color:loading||disabled?C.muted:"#000",fontSize:13,fontWeight:700,cursor:loading||disabled?"not-allowed":"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:loading||disabled?"none":`0 4px 20px ${C.blueGlow}`,fontFamily:"inherit" }}>
    {loading ? <><Spinner/>Processing...</> : children}
  </button>
);

const SecondaryBtn = ({ children, onClick }) => (
  <button onClick={onClick}
    style={{ width:"100%",padding:"12px",borderRadius:9,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit" }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.text; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL ICON
// ─────────────────────────────────────────────────────────────────────────────
function SocialIcon({ type }) {
  if (type === "google") return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
  if (type === "facebook") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
  if (type === "apple") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
    </svg>
  );
  return <span style={{ fontSize:15 }}>✉️</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:500,background:C.bg,display:"flex",flexDirection:"column",animation:"fadeUp 0.2s ease" }}>
      <div style={{ background:"rgba(0,0,0,0.96)",borderBottom:`1px solid ${C.border}`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:18,color:"#fff",letterSpacing:1 }}>Terms & Conditions</div>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit" }}>✕</button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"22px 18px 48px",maxWidth:640,width:"100%",margin:"0 auto" }}>
        {TERMS_CONTENT.map((s, i) => (
          <div key={i} style={{ marginBottom:22 }}>
            <div style={{ fontSize:12,fontWeight:700,color:C.blue,marginBottom:6 }}>{s.heading}</div>
            <div style={{ fontSize:13,color:C.muted,lineHeight:1.8 }}>{s.body}</div>
            {i < TERMS_CONTENT.length - 1 && <div style={{ height:1,background:C.border,marginTop:18 }}/>}
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 18px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.96)" }}>
        <button onClick={onClose} style={{ width:"100%",maxWidth:480,margin:"0 auto",display:"block",padding:"12px",borderRadius:9,background:`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",border:"none",fontFamily:"inherit" }}>
          Got it — Close ✓
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SafetyDisclaimerScreen({ onAccept }) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const allChecked = checked1 && checked2 && checked3;

  const CheckRow = ({ checked, onToggle, children }) => (
    <div onClick={onToggle} style={{ display:"flex",alignItems:"flex-start",gap:11,padding:"13px",background:checked?C.accentSoft:C.surface,border:`1px solid ${checked?C.blue:C.border}`,borderRadius:10,cursor:"pointer",transition:"all 0.15s",marginBottom:9 }}>
      <div style={{ width:18,height:18,borderRadius:4,border:`2px solid ${checked?C.blue:C.border}`,background:checked?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s" }}>
        {checked && <span style={{ color:"#000",fontSize:11,fontWeight:700 }}>✓</span>}
      </div>
      <div style={{ fontSize:13,color:checked?C.text:C.muted,lineHeight:1.6,transition:"color 0.15s" }}>{children}</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 18px",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%",maxWidth:440,animation:"fadeUp 0.4s ease" }}>
        <div style={{ textAlign:"center",marginBottom:26 }}>
          <div style={{ fontSize:52,marginBottom:10,animation:"glow 3s ease infinite" }}>🛡️</div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontSize:28,color:"#fff",letterSpacing:1,marginBottom:8 }}>Before You Begin</div>
          <div style={{ fontSize:13,color:C.muted,lineHeight:1.7 }}>Please read and accept the following before continuing.</div>
        </div>
        <div style={{ background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.22)",borderRadius:10,padding:"12px 14px",marginBottom:20,display:"flex",gap:9,alignItems:"flex-start" }}>
          <span style={{ fontSize:16,flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:12,color:C.yellow,lineHeight:1.7 }}>AI-generated content is produced under <strong>your direction</strong>. You are responsible for how any generated text is used.</div>
        </div>
        <CheckRow checked={checked1} onToggle={() => setChecked1(!checked1)}>
          <strong style={{ color:checked1?"#fff":C.muted }}>I take full responsibility</strong> for all content I generate. GhostwriterMe is not liable for any actions taken.
        </CheckRow>
        <CheckRow checked={checked2} onToggle={() => setChecked2(!checked2)}>
          <strong style={{ color:checked2?"#fff":C.muted }}>I will not use this tool</strong> to create harmful, illegal, or deceptive content.
        </CheckRow>
        <CheckRow checked={checked3} onToggle={() => setChecked3(!checked3)}>
          <strong style={{ color:checked3?"#fff":C.muted }}>I understand AI output</strong> may contain errors. I will verify content before using it.
        </CheckRow>
        <div style={{ display:"flex",gap:5,marginBottom:18,marginTop:4 }}>
          {[checked1,checked2,checked3].map((c,i) => (
            <div key={i} style={{ height:2,flex:1,borderRadius:2,background:c?C.blue:C.border,transition:"background 0.3s" }}/>
          ))}
        </div>
        <button onClick={onAccept} disabled={!allChecked}
          style={{ width:"100%",padding:"14px",borderRadius:9,border:"none",background:allChecked?`linear-gradient(135deg,${C.blue},${C.accent})`:"#0d1219",color:allChecked?"#000":C.muted,fontSize:13,fontWeight:700,cursor:allChecked?"pointer":"not-allowed",transition:"all 0.3s",fontFamily:"inherit",boxShadow:allChecked?`0 4px 20px ${C.blueGlow}`:"none" }}>
          {allChecked ? "I Agree — Enter GhostwriterMe →" : `Accept ${3 - [checked1,checked2,checked3].filter(Boolean).length} more to continue`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab, setTab]               = useState("signin");
  const [showEmail, setShowEmail]   = useState(false);
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPass]         = useState("");
  const [age, setAge]               = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [agreedTerms, setAgreed]    = useState(false);
  const [loading, setLoading]       = useState(null);
  const [errors, setErrors]         = useState({});
  const [showTermsModal, setShowTC] = useState(false);

  const handleSocial = id => {
    if (id === "email") { setShowEmail(true); return; }
    setLoading(id);
    setTimeout(() => { setLoading(null); onAuth({ name:"Demo User",email:"demo@ghostwriterme.com",avatar:"🧠",plan:"free" }); }, 1400);
  };

  const handleSubmit = () => {
    const e = {};
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 6)  e.password = "Password must be 6+ characters";
    if (tab === "signup") {
      if (!name.trim()) e.name = "Name is required";
      const n = parseInt(age, 10);
      if (!age || isNaN(n) || n < 1 || n > 120) e.age = "Enter a valid age";
      else if (n < 13) e.age = "You must be at least 13 to use GhostwriterMe";
      if (!agreedTerms) e.terms = "You must agree to the Terms & Conditions";
    }
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading("email");
    setTimeout(() => { setLoading(null); onAuth({ name:tab==="signup"?name:"Demo User",email,avatar:"✨",plan:"free" }); }, 1400);
  };

  return (
    <>
      {showTermsModal && <TermsModal onClose={() => setShowTC(false)}/>}
      <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 18px",background:C.bg,fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ textAlign:"center",marginBottom:28,animation:"fadeUp 0.4s ease" }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontSize:38,letterSpacing:2,color:"#fff",lineHeight:1 }}>👻 GHOSTWRITERME</div>
          <div style={{ fontSize:10,color:C.muted,letterSpacing:"0.2em",marginTop:5 }}>AI WRITING SUITE · EST. 2026</div>
        </div>
        <div style={{ width:"100%",maxWidth:390,background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"26px 22px",animation:"fadeUp 0.4s 0.1s ease both",boxShadow:"0 24px 60px rgba(0,0,0,0.7)" }}>
          <div style={{ display:"flex",background:C.surface,borderRadius:8,padding:3,marginBottom:22 }}>
            {["signin","signup"].map(t => (
              <button key={t} onClick={() => { setTab(t); setShowEmail(false); setErrors({}); setAgreed(false); setAge(""); }}
                style={{ flex:1,padding:"8px",borderRadius:6,border:"none",background:tab===t?C.blue:"transparent",color:tab===t?"#000":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit" }}>
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {!showEmail ? (
            <>
              <div style={{ fontSize:16,fontWeight:700,color:"#fff",marginBottom:3 }}>{tab==="signin"?"Welcome back 👋":"Join GhostwriterMe"}</div>
              <div style={{ fontSize:12,color:C.muted,marginBottom:20,lineHeight:1.6 }}>{tab==="signin"?"Sign in to your AI writing suite.":"Start free — no credit card needed."}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
                {SOCIAL_PROVIDERS.map(s => (
                  <button key={s.id} onClick={() => handleSocial(s.id)} disabled={!!loading}
                    style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:11,padding:"12px",borderRadius:9,border:s.border||"none",background:s.bg,color:s.color,fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer",transition:"opacity 0.2s,transform 0.15s",opacity:loading&&loading!==s.id?0.4:1,fontFamily:"inherit" }}
                    onMouseEnter={e => { if(!loading) e.currentTarget.style.transform="scale(1.015)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}>
                    {loading===s.id ? <Spinner color={s.color==="#fff"?"#fff":"#333"}/> : <SocialIcon type={s.iconType}/>}
                    {loading===s.id ? "Connecting..." : s.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ animation:"slideIn 0.25s ease" }}>
              <button onClick={() => setShowEmail(false)} style={{ background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",marginBottom:14,display:"flex",alignItems:"center",gap:5,fontFamily:"inherit" }}>← Back</button>
              <div style={{ fontSize:16,fontWeight:700,color:"#fff",marginBottom:18 }}>{tab==="signin"?"Sign in with email":"Sign up with email"}</div>
              {tab === "signup" && (
                <>
                  <FormInput label="Full Name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} error={errors.name} iconLeft="👤"/>
                  <div style={{ marginBottom:13 }}>
                    <label style={{ fontSize:11,letterSpacing:"0.08em",color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase" }}>Your Age</label>
                    <input type="number" min="1" max="120" placeholder="e.g. 25" value={age} onChange={e => setAge(e.target.value)}
                      style={{ width:"100%",background:C.surface,border:`1px solid ${errors.age?C.red:C.border}`,borderRadius:9,padding:"11px 13px",color:C.text,fontSize:13 }}/>
                    {errors.age && <div style={{ fontSize:11,color:C.red,marginTop:3 }}>{errors.age}</div>}
                    <div style={{ fontSize:10,color:C.muted,marginTop:3 }}>Must be 13 or older</div>
                  </div>
                </>
              )}
              <FormInput label="Email" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} iconLeft="✉️"/>
              <FormInput label="Password" type={showPw?"text":"password"} placeholder="••••••••" value={password} onChange={e => setPass(e.target.value)} error={errors.password} iconLeft="🔒" iconRight={showPw?"🙈":"👁️"} onIconRightClick={() => setShowPw(!showPw)}/>
              {tab === "signin" && <div style={{ textAlign:"right",marginTop:-6,marginBottom:14 }}><span style={{ fontSize:12,color:C.blue,cursor:"pointer" }}>Forgot password?</span></div>}
              {tab === "signup" && (
                <div style={{ marginBottom:14 }}>
                  <div onClick={() => { setAgreed(!agreedTerms); if(errors.terms) setErrors({...errors,terms:""}); }}
                    style={{ display:"flex",alignItems:"flex-start",gap:9,padding:"11px 13px",background:agreedTerms?C.accentSoft:C.surface,border:`1px solid ${errors.terms?C.red:agreedTerms?C.blue:C.border}`,borderRadius:9,cursor:"pointer",transition:"all 0.15s" }}>
                    <div style={{ width:17,height:17,borderRadius:4,border:`2px solid ${agreedTerms?C.blue:errors.terms?C.red:C.border}`,background:agreedTerms?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s" }}>
                      {agreedTerms && <span style={{ color:"#000",fontSize:10,fontWeight:700 }}>✓</span>}
                    </div>
                    <div style={{ fontSize:12,color:C.muted,lineHeight:1.6 }}>
                      I agree to the{" "}
                      <span onClick={e => { e.stopPropagation(); setShowTC(true); }} style={{ color:C.blue,fontWeight:600,textDecoration:"underline",cursor:"pointer" }}>Terms & Conditions</span>
                      {" "}and{" "}
                      <span style={{ color:C.blue,fontWeight:600,cursor:"pointer" }}>Privacy Policy</span>
                    </div>
                  </div>
                  {errors.terms && <div style={{ fontSize:11,color:C.red,marginTop:3 }}>{errors.terms}</div>}
                </div>
              )}
              <PrimaryBtn loading={loading==="email"} onClick={handleSubmit}>{tab==="signin"?"Sign In →":"Create Account →"}</PrimaryBtn>
            </div>
          )}
          <div style={{ textAlign:"center",fontSize:11,color:C.muted,marginTop:16,lineHeight:1.7 }}>
            By continuing you agree to our{" "}
            <span onClick={() => setShowTC(true)} style={{ color:C.blue,cursor:"pointer" }}>Terms</span>
            {" "}&amp;{" "}
            <span style={{ color:C.blue,cursor:"pointer" }}>Privacy Policy</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function PaymentScreen({ user, billing, targetPlan, onComplete }) {
  const [region, setRegion]   = useState("thai");
  const [method, setMethod]   = useState(null);
  const [step, setStep]       = useState("method");
  const [loading, setLoading] = useState(false);
  const [card, setCard]       = useState({ number:"",name:"",expiry:"",cvv:"" });
  const [cardErrors, setCE]   = useState({});
  const [tmPhone, setTmPhone] = useState("");

  const isElite = targetPlan === "elite";
  // Elite is always $39 USD / 3 months (fixed, no billing toggle for Elite)
  const priceDisplay = isElite ? "$39 USD" : (billing==="yearly" ? "฿174" : "฿249");
  const periodDisplay = isElite ? "/ 3 months" : "/ month";

  const THAI_METHODS = [
    {id:"promptpay",label:"PromptPay",       icon:"🇹🇭",desc:"Scan QR",        color:"#1e40af"},
    {id:"truemoney", label:"TrueMoney Wallet",icon:"🧡",desc:"TrueMoney balance",color:"#ea580c"},
  ];
  const INTL_METHODS = [
    {id:"card",     label:"Credit / Debit Card",icon:"💳",desc:"Visa, Mastercard",color:C.blueD},
    {id:"applepay", label:"Apple Pay",           icon:"🍎",desc:"Face / Touch ID", color:"#111"},
    {id:"paypal",   label:"PayPal",              icon:"🅿️",desc:"PayPal balance",  color:"#003087"},
  ];

  const fmt4   = v => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp = v => { const n=v.replace(/\D/g,"").slice(0,4); return n.length>2?n.slice(0,2)+"/"+n.slice(2):n; };
  const brand  = n => { const d=n.replace(/\s/g,""); if(d.startsWith("4"))return"VISA"; if(d.startsWith("5"))return"MC"; return null; };

  const validateCard = () => {
    const e={};
    if(card.number.replace(/\s/g,"").length<16) e.number="Enter valid 16-digit number";
    if(!card.name.trim()) e.name="Cardholder name required";
    if(card.expiry.length<5) e.expiry="Enter MM/YY";
    if(card.cvv.length<3) e.cvv="3-digit CVV";
    setCE(e); return Object.keys(e).length===0;
  };

  const handlePay = () => {
    if(method==="card"&&!validateCard()) return;
    setLoading(true);
    setTimeout(()=>{setLoading(false);setStep("success");},2000);
  };

  const b = brand(card.number);

  if (step === "success") return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:C.bg,fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center",maxWidth:340,animation:"fadeUp 0.5s ease" }}>
        <div style={{ fontSize:72,marginBottom:14,animation:"glow 2s ease infinite" }}>🎉</div>
        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:36,color:"#fff",letterSpacing:1,marginBottom:6 }}>YOU'RE IN!</div>
        <div style={{ fontSize:13,color:C.muted,lineHeight:1.8,marginBottom:24 }}>
          {isElite ? "Elite plan activated!" : "3-day free trial started."}<br/>All features are now unlocked. 🚀
        </div>
        <PrimaryBtn onClick={onComplete}>Enter the App →</PrimaryBtn>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:C.bg,padding:"26px 18px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%",maxWidth:440 }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontSize:26,color:"#fff",letterSpacing:1 }}>PAYMENT</div>
          <div style={{ fontSize:11,color:C.muted }}>Secure checkout · SSL encrypted · Cancel anytime</div>
        </div>
        <Card style={{ marginBottom:18 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:"#fff" }}>GhostwriterMe {isElite?"Elite":"Pro"}</div>
              <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{isElite?"Every 3 months":billing+" billing"} · after trial</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontSize:18,color:isElite?"#f0b429":C.blue }}>{priceDisplay}</div>
              <div style={{ fontSize:10,color:C.muted }}>{periodDisplay}</div>
              <div style={{ fontSize:10,color:C.green,marginTop:2 }}>Today: $0.00 ✓</div>
            </div>
          </div>
        </Card>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8 }}>Your Region</div>
          <div style={{ display:"flex",gap:9 }}>
            {[{id:"thai",flag:"🇹🇭",label:"Thailand"},{id:"intl",flag:"🌍",label:"International"}].map(r => (
              <button key={r.id} onClick={()=>{setRegion(r.id);setMethod(null);}}
                style={{ flex:1,padding:"10px",borderRadius:9,background:region===r.id?C.accentSoft:C.card,border:`1px solid ${region===r.id?C.blue:C.border}`,color:region===r.id?"#fff":C.muted,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                {r.flag} {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8 }}>Payment Method</div>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {(region==="thai"?THAI_METHODS:INTL_METHODS).map(m => (
              <button key={m.id} onClick={()=>setMethod(m.id)}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"13px",background:method===m.id?C.accentSoft:C.card,border:`1px solid ${method===m.id?C.blue:C.border}`,borderRadius:10,cursor:"pointer",transition:"all 0.2s",textAlign:"left",fontFamily:"inherit" }}>
                <div style={{ width:40,height:40,borderRadius:9,flexShrink:0,background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{m.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:"#fff" }}>{m.label}</div>
                  <div style={{ fontSize:11,color:C.muted,marginTop:1 }}>{m.desc}</div>
                </div>
                {method===m.id && <div style={{ width:20,height:20,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><span style={{ fontSize:11,color:"#000" }}>✓</span></div>}
              </button>
            ))}
          </div>
        </div>

        {method==="card" && (
          <Card style={{ marginBottom:16,animation:"slideIn 0.3s ease" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontSize:12,color:C.muted }}>Card details</div>
              <div style={{ display:"flex",gap:5 }}>{["VISA","MC"].map(br=><div key={br} style={{ background:b===br?"#fff":"#111",border:`1px solid ${b===br?"#fff":C.border}`,borderRadius:3,padding:"2px 7px",fontSize:9,fontWeight:700,color:b===br?"#1a1a2e":C.muted }}>{br}</div>)}</div>
            </div>
            <FormInput label="Card Number" placeholder="1234 5678 9012 3456" iconLeft="💳" value={card.number} onChange={e=>setCard({...card,number:fmt4(e.target.value)})} error={cardErrors.number}/>
            <FormInput label="Cardholder Name" placeholder="As shown on card" iconLeft="👤" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} error={cardErrors.name}/>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:11 }}>
              <FormInput label="Expiry" placeholder="MM/YY" value={card.expiry} onChange={e=>setCard({...card,expiry:fmtExp(e.target.value)})} error={cardErrors.expiry}/>
              <FormInput label="CVV" type="password" placeholder="***" value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value.replace(/\D/g,"").slice(0,4)})} error={cardErrors.cvv}/>
            </div>
            <div style={{ fontSize:11,color:C.muted }}>🔒 Processed by Stripe. We never store your card.</div>
          </Card>
        )}
        {method==="truemoney" && (
          <Card style={{ marginBottom:16,animation:"slideIn 0.3s ease" }}>
            <FormInput label="TrueMoney Phone" placeholder="0812345678" iconLeft="📱" value={tmPhone} onChange={e=>setTmPhone(e.target.value.replace(/\D/g,"").slice(0,10))}/>
            <div style={{ fontSize:11,color:C.muted }}>You'll receive an OTP. No charge for 3 days.</div>
          </Card>
        )}
        {method==="applepay" && <Card style={{ marginBottom:16,textAlign:"center",animation:"slideIn 0.3s ease" }}><div style={{ fontSize:32,marginBottom:8 }}>🍎</div><div style={{ fontSize:13,fontWeight:700,color:"#fff",marginBottom:4 }}>Apple Pay</div><div style={{ fontSize:11,color:C.muted }}>Authenticate with Face ID or Touch ID.</div></Card>}
        {method==="paypal"   && <Card style={{ marginBottom:16,textAlign:"center",animation:"slideIn 0.3s ease" }}><div style={{ fontSize:32,marginBottom:8 }}>🅿️</div><div style={{ fontSize:13,fontWeight:700,color:"#fff",marginBottom:4 }}>PayPal</div><div style={{ fontSize:11,color:C.muted }}>You'll be redirected to PayPal.</div></Card>}
        {method==="promptpay" && (
          <Card style={{ marginBottom:16,textAlign:"center",animation:"slideIn 0.3s ease" }}>
            <div style={{ fontSize:12,color:C.muted,marginBottom:12 }}>Scan with any Thai banking app</div>
            <div style={{ width:160,height:160,margin:"0 auto 12px",background:"#fff",borderRadius:10,padding:8,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg width="144" height="144" viewBox="0 0 144 144">
                {Array.from({length:10}).map((_,r)=>Array.from({length:10}).map((_,c)=>((r+c)%2===0||Math.random()>0.5)&&<rect key={r+"-"+c} x={c*14+2} y={r*14+2} width={12} height={12} fill="#0d1219"/>))}
                <rect x="2" y="2" width="34" height="34" rx="3" fill="none" stroke="#0d1219" strokeWidth="3"/>
                <rect x="9" y="9" width="20" height="20" rx="2" fill="#0d1219"/>
                <rect x="108" y="2" width="34" height="34" rx="3" fill="none" stroke="#0d1219" strokeWidth="3"/>
                <rect x="115" y="9" width="20" height="20" rx="2" fill="#0d1219"/>
                <rect x="2" y="108" width="34" height="34" rx="3" fill="none" stroke="#0d1219" strokeWidth="3"/>
                <rect x="9" y="115" width="20" height="20" rx="2" fill="#0d1219"/>
              </svg>
            </div>
            <div style={{ fontSize:15,fontWeight:700,color:"#fff",letterSpacing:"0.1em" }}>0812-345-678</div>
            <div style={{ fontSize:11,color:C.muted,marginTop:6 }}>Amount: <strong style={{ color:"#fff" }}>฿0.00 today (trial)</strong></div>
          </Card>
        )}

        {method && (
          <div style={{ animation:"fadeUp 0.3s ease" }}>
            <PrimaryBtn loading={loading} onClick={handlePay}>
              {method==="promptpay"?"I've Completed the QR Payment ✓":method==="truemoney"?"Send OTP & Confirm →":method==="applepay"?"Confirm with Apple Pay":method==="paypal"?"Continue to PayPal →":"Confirm & Start Trial →"}
            </PrimaryBtn>
            <div style={{ textAlign:"center",fontSize:11,color:C.muted,marginTop:8 }}>🔒 Secure · No charge today · Cancel anytime</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY MODE
// ─────────────────────────────────────────────────────────────────────────────
function HistoryMode({ user }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems]   = useState([]);
  const [expanded, setExp]  = useState(null);
  const [speaking, setSpeaking] = useState(null);

  useEffect(() => {
    const all = HS.loadAll(user.email);
    setItems(all);
  }, [user.email]);

  const modeOptions = ["all","reply","email","essay","academic","cv","author","grammar"];
  const filtered = filter === "all" ? items : items.filter(i => i.mode === filter);

  const modeLabel = { reply:"AI Reply",email:"Email",essay:"Essay",academic:"Academic",cv:"CV",author:"Author",grammar:"Grammar" };
  const modeIcon  = { reply:"💬",email:"📧",essay:"✍️",academic:"🎓",cv:"💼",author:"📖",grammar:"✅" };

  const handleSpeak = (id, text) => {
    if (speaking === id) { stopSpeaking(); setSpeaking(null); }
    else { speakText(text); setSpeaking(id); }
  };

  if (items.length === 0) return (
    <div style={{ textAlign:"center",padding:"48px 0" }}>
      <div style={{ fontSize:48,marginBottom:12 }}>🕐</div>
      <div style={{ fontSize:14,fontWeight:700,color:"#fff",marginBottom:6 }}>No history yet</div>
      <div style={{ fontSize:13,color:C.muted }}>Your generated content will appear here after you use any mode.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",gap:7,marginBottom:18,overflowX:"auto",paddingBottom:4 }}>
        {modeOptions.map(m => (
          <button key={m} onClick={() => setFilter(m)}
            style={{ flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${filter===m?C.blue:C.border}`,background:filter===m?C.accentSoft:"transparent",color:filter===m?C.blue:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize",transition:"all 0.15s" }}>
            {m === "all" ? "All" : (modeIcon[m]||"") + " " + (modeLabel[m]||m)}
          </button>
        ))}
      </div>

      <div style={{ fontSize:11,color:C.muted,marginBottom:12 }}>{filtered.length} item{filtered.length!==1?"s":""}</div>

      {filtered.map(item => (
        <Card key={item.id} style={{ marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:expanded===item.id?10:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:9,flex:1,minWidth:0 }}>
              <span style={{ fontSize:18,flexShrink:0 }}>{modeIcon[item.mode]||"📝"}</span>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12,color:C.muted,textTransform:"capitalize" }}>{modeLabel[item.mode]||item.mode} · {new Date(item.ts).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                <div style={{ fontSize:13,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.title||item.output?.slice(0,60)||"Untitled"}</div>
              </div>
            </div>
            <button onClick={() => setExp(expanded===item.id?null:item.id)}
              style={{ flexShrink:0,padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",marginLeft:8 }}>
              {expanded===item.id?"Hide":"View"}
            </button>
          </div>
          {expanded===item.id && (
            <div style={{ animation:"fadeUp 0.2s ease" }}>
              {item.input && <div style={{ fontSize:12,color:C.muted,background:C.surface,borderRadius:7,padding:"9px 11px",marginBottom:9,lineHeight:1.6 }}><strong>Input:</strong> {item.input}</div>}
              <div style={{ fontSize:13,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap",maxHeight:240,overflowY:"auto",background:C.surface,borderRadius:7,padding:"10px 12px" }}>{item.output}</div>
              <div style={{ display:"flex",gap:7,marginTop:10 }}>
                <CopyBtn text={item.output}/>
                <button onClick={() => handleSpeak(item.id, item.output)}
                  style={{ padding:"6px 12px",borderRadius:7,background:speaking===item.id?C.accentSoft:"transparent",border:`1px solid ${speaking===item.id?C.blue:C.border}`,color:speaking===item.id?C.blue:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>
                  {speaking===item.id?"⏹ Stop":"🔊 Listen"}
                </button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 1: AI REPLIES
// ─────────────────────────────────────────────────────────────────────────────
function ReplyMode({ user, isPro }) {
  const [message, setMessage] = useState("");
  const [tone, setTone]       = useState("confident");
  const [noDesp, setNoDesp]   = useState(false);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [used, setUsed]       = useState(0);
  const FREE_LIMIT = 3;
  const ref = useRef(null);

  const generate = async () => {
    if (!message.trim()) return;
    if (!isPro && used >= FREE_LIMIT) { setError(`Free plan: ${FREE_LIMIT} replies/day used.`); return; }
    setLoading(true); setError(""); setReplies([]);
    const toneObj = TONES.find(t => t.id === tone);
    const sys = `You are GhostwriterMe — emotionally intelligent, witty, socially calibrated. Never robotic. No em-dashes. ${noDesp?"IMPORTANT: Strip ALL desperate/clingy energy. Unbothered only.":""} Tone: ${toneObj.label} — ${toneObj.desc} Return ONLY valid JSON: {"replies":[{"option":1,"text":"...","vibe":"one-word"},{"option":2,"text":"...","vibe":"one-word"},{"option":3,"text":"...","vibe":"one-word"}]}`;
    try {
      const raw = await callClaude(sys, `Message received:\n"${message}"`, 1000);
      const p = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setReplies(p.replies || []);
      setUsed(u => u + 1);
      if (user) p.replies.forEach((r,i) => { if(i===0) HS.save(user.email,"reply",{title:`Reply to: ${message.slice(0,40)}`,input:message,output:r.text}); });
      setTimeout(() => ref.current?.scrollIntoView({ behavior:"smooth" }), 100);
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {!isPro && <div style={{ background:C.accentSoft,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 13px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:12,color:C.muted }}>{FREE_LIMIT-used} free replies left today</span>
        <span style={{ fontSize:11,color:C.blue,fontWeight:600 }}>Upgrade →</span>
      </div>}
      <GWTextarea label="Paste the Message" placeholder={"\"hey, you free this weekend?\"\n\"we need to talk...\"\nPaste anything stressing you out 💀"} value={message} onChange={e => setMessage(e.target.value)} rows={4} voiceInput/>
      <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9,marginTop:2 }}>Pick Your Energy</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:13 }}>
        {TONES.map(t => (
          <button key={t.id} onClick={() => setTone(t.id)}
            style={{ background:tone===t.id?C.accentSoft:C.surface,border:`1px solid ${tone===t.id?C.blue:C.border}`,borderRadius:9,padding:"10px 11px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s" }}>
            <div style={{ fontSize:17 }}>{t.emoji}</div>
            <div style={{ fontSize:12,fontWeight:600,marginTop:3 }}>{t.label}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:2 }}>{t.desc}</div>
          </button>
        ))}
      </div>
      <div onClick={() => setNoDesp(!noDesp)} style={{ background:noDesp?C.accentSoft:C.surface,border:`1px solid ${noDesp?C.blue:C.border}`,borderRadius:9,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.15s",marginBottom:14 }}>
        <div><div style={{ fontSize:12,fontWeight:600 }}>💀 Don't Sound Desperate</div><div style={{ fontSize:11,color:C.muted,marginTop:2 }}>Strips all clingy energy. Unbothered only.</div></div>
        <Toggle on={noDesp} onClick={() => setNoDesp(!noDesp)}/>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!message.trim()}>✍️ Generate Replies</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {replies.length > 0 && (
        <div ref={ref} style={{ marginTop:22,animation:"fadeUp 0.4s ease" }}>
          <Tag style={{ marginBottom:10,display:"block" }}>Pick one & send it</Tag>
          {replies.map((r, i) => (
            <Card key={i} style={{ marginTop:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
                <Tag color={C.accent}>{r.vibe}</Tag>
                <span style={{ fontSize:11,color:C.muted }}>Option {r.option}</span>
              </div>
              <div style={{ fontSize:13,lineHeight:1.7,color:C.text }}>{r.text}</div>
              <ResultActions text={r.text}/>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 2: EMAIL
// ─────────────────────────────────────────────────────────────────────────────
function EmailMode({ user }) {
  const [emailType, setEmailType] = useState("professional");
  const [context, setContext]     = useState("");
  const [recipient, setRecipient] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [tone, setTone]           = useState("professional");
  const [length, setLength]       = useState("medium");
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const generate = async () => {
    if (!context.trim()) return;
    setLoading(true); setError(""); setResult(null);
    const eObj = EMAIL_TYPES.find(e => e.id === emailType);
    const tObj = TONES.find(t => t.id === tone);
    const wt   = {short:"~80 words",medium:"~150 words",long:"~250 words"}[length];
    const sys  = `You are an expert email writer. Return ONLY valid JSON: {"subject":"...","body":"...","tip":"one short tip"}`;
    const prompt = `Write a ${eObj.label} email. Context: ${context}${recipient?" Recipient: "+recipient:""}${keyPoints?" Key points: "+keyPoints:""} Tone: ${tObj.label} Length: ${wt}`;
    try {
      const raw = await callClaude(sys, prompt, 1000);
      const r   = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setResult(r);
      if (user) HS.save(user.email,"email",{title:r.subject,input:context,output:r.body});
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.18)",borderRadius:8,padding:"9px 13px",marginBottom:16,display:"flex",alignItems:"center",gap:7 }}>
        <PlanBadge plan="free"/><span style={{ fontSize:12,color:C.muted }}>Email Mode is free — unlimited.</span>
      </div>
      <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9 }}>Email Type</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
        {EMAIL_TYPES.map(e => (
          <button key={e.id} onClick={() => setEmailType(e.id)}
            style={{ background:emailType===e.id?C.accentSoft:C.surface,border:`1px solid ${emailType===e.id?C.blue:C.border}`,borderRadius:9,padding:"9px 11px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s" }}>
            <div style={{ fontSize:17 }}>{e.icon}</div>
            <div style={{ fontSize:11,fontWeight:600,marginTop:3 }}>{e.label}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:1 }}>{e.desc}</div>
          </button>
        ))}
      </div>
      <GWTextarea label="Situation / Context" placeholder="What's this email about?" value={context} onChange={e => setContext(e.target.value)} rows={3} voiceInput/>
      <FormInput label="Recipient (optional)" placeholder="e.g. My manager Sarah..." iconLeft="👤" value={recipient} onChange={e => setRecipient(e.target.value)} voiceInput/>
      <GWTextarea label="Key Points (optional)" placeholder="e.g. Ask about timeline, mention portfolio..." value={keyPoints} onChange={e => setKeyPoints(e.target.value)} rows={2} voiceInput/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:14 }}>
        <GWSelect label="Tone" value={tone} onChange={setTone} options={TONES.map(t=>({value:t.id,label:`${t.emoji} ${t.label}`}))}/>
        <GWSelect label="Length" value={length} onChange={setLength} options={[{value:"short",label:"Short (~80w)"},{value:"medium",label:"Medium (~150w)"},{value:"long",label:"Long (~250w)"}]}/>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!context.trim()}>📧 Generate Email</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {result && (
        <div style={{ marginTop:20,animation:"fadeUp 0.4s ease" }}>
          <Card style={{ marginBottom:10 }}>
            <Tag color={C.muted}>Subject Line</Tag>
            <div style={{ fontSize:14,fontWeight:700,color:"#fff",marginTop:6 }}>{result.subject}</div>
            <ResultActions text={result.subject}/>
          </Card>
          <Card style={{ marginBottom:10 }}>
            <Tag color={C.accent}>Email Body</Tag>
            <div style={{ fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap",marginTop:8 }}>{result.body}</div>
            <ResultActions text={result.body}/>
          </Card>
          {result.tip && <div style={{ background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:9,padding:"11px 13px",display:"flex",gap:9 }}>
            <span style={{ fontSize:15 }}>💡</span>
            <div style={{ fontSize:12,color:C.yellow,lineHeight:1.6 }}>{result.tip}</div>
          </div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 3: ESSAY
// ─────────────────────────────────────────────────────────────────────────────
function EssayMode({ user }) {
  const [topic, setTopic]     = useState("");
  const [details, setDetails] = useState("");
  const [level, setLevel]     = useState("B2");
  const [type, setType]       = useState("Argumentative");
  const [wc, setWc]           = useState("500");
  const [essay, setEssay]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const levelDesc = {A1:"Beginner · simple words",A2:"Elementary · basic everyday",B1:"Intermediate · clear",B2:"Upper-intermediate · nuanced",C1:"Advanced · fluent",C2:"Mastery · native-like"};

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setEssay("");
    const sys = `You are an expert essay writer. Calibrate to CEFR level exactly. Write ONLY the essay. No preamble.`;
    try {
      const res = await callClaude(sys,`Write a ${type} essay on: "${topic}"\nKey points: ${details||"none"}\nCEFR: ${level}\nWords: ~${wc}`,2000);
      setEssay(res);
      if (user) HS.save(user.email,"essay",{title:topic,input:`${type}, ${level}, ${wc}w`,output:res});
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <GWTextarea label="Essay Topic" placeholder="e.g. The impact of social media on teenage mental health" value={topic} onChange={e => setTopic(e.target.value)} rows={2} voiceInput/>
      <GWTextarea label="Key Points (optional)" placeholder="e.g. Statistics on anxiety, comparison with pre-social-media era..." value={details} onChange={e => setDetails(e.target.value)} rows={3} voiceInput/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13 }}>
        <GWSelect label="Essay Type" value={type} onChange={setType} options={ESSAY_TYPES}/>
        <GWSelect label="Word Count" value={wc} onChange={setWc} options={["300","500","750","1000","1500","2000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:8 }}>English Level (CEFR)</div>
        <div style={{ display:"flex",gap:6 }}>
          {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ flex:1,padding:"8px 3px",borderRadius:7,background:level===l?C.accentSoft:C.surface,border:`1px solid ${level===l?C.blue:C.border}`,color:level===l?"#fff":C.muted,fontSize:11,fontWeight:level===l?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s" }}>{l}</button>)}
        </div>
        <div style={{ fontSize:10,color:C.muted,marginTop:5 }}>{levelDesc[level]}</div>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!topic.trim()}>✍️ Generate Essay</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {essay && <Card style={{ marginTop:18,animation:"fadeUp 0.4s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><Tag color={C.accent}>{type} · {level}</Tag><span style={{ fontSize:11,color:C.muted }}>~{essay.split(/\s+/).length} words</span></div>
        <div style={{ fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap" }}>{essay}</div>
        <ResultActions text={essay}/>
      </Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 4: ACADEMIC
// ─────────────────────────────────────────────────────────────────────────────
function AcademicMode({ user }) {
  const [topic, setTopic]       = useState("");
  const [details, setDetails]   = useState("");
  const [citations, setCitations] = useState([{type:"url",value:""}]);
  const [wc, setWc]             = useState("1000");
  const [style, setStyle]       = useState("APA");
  const [essay, setEssay]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const addCite    = () => setCitations([...citations,{type:"url",value:""}]);
  const removeCite = i => setCitations(citations.filter((_,idx) => idx!==i));
  const updateCite = (i,f,v) => { const c=[...citations]; c[i]={...c[i],[f]:v}; setCitations(c); };

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setEssay("");
    const citeList = citations.filter(c=>c.value.trim()).map((c,i)=>`[${i+1}] ${c.type==="url"?"URL":"PDF"}: ${c.value}`).join("\n");
    const sys = `You are an expert academic writer. Write scholarly essays at C1/C2 level. Use ${style} citations. Include References. Write ONLY the essay.`;
    try {
      const sourcesLine = citeList ? "Sources:\n" + citeList : "";
      const academicPrompt = "Academic essay: \"" + topic + "\"\nArguments: " + (details||"none") + "\nWords: ~" + wc + "\nStyle: " + style + (sourcesLine ? "\n" + sourcesLine : "");
      const res = await callClaude(sys, academicPrompt, 2500);
      setEssay(res);
      if (user) HS.save(user.email,"academic",{title:topic,input:`${style}, ${wc}w`,output:res});
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <GWTextarea label="Essay Topic / Thesis" placeholder="e.g. The role of AI in modern healthcare diagnostics" value={topic} onChange={e => setTopic(e.target.value)} rows={2} voiceInput/>
      <GWTextarea label="Arguments & Key Points" placeholder="e.g. ML diagnostic accuracy, ethical concerns..." value={details} onChange={e => setDetails(e.target.value)} rows={3} voiceInput/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:16 }}>
        <GWSelect label="Citation Style" value={style} onChange={setStyle} options={["APA","MLA","Chicago","Harvard","Vancouver","IEEE"]}/>
        <GWSelect label="Word Count" value={wc} onChange={setWc} options={["500","750","1000","1500","2000","3000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9 }}>
          <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase" }}>Sources to Cite</div>
          <button onClick={addCite} style={{ background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",color:C.blue,fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>+ Add</button>
        </div>
        {citations.map((c,i) => (
          <div key={i} style={{ display:"flex",gap:7,marginBottom:8,alignItems:"center" }}>
            <select value={c.type} onChange={e => updateCite(i,"type",e.target.value)} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 7px",color:C.text,fontSize:11,fontFamily:"inherit",width:80,flexShrink:0 }}>
              <option value="url">🔗 URL</option><option value="pdf">📄 PDF</option>
            </select>
            <input value={c.value} onChange={e => updateCite(i,"value",e.target.value)} placeholder={c.type==="url"?"https://...":"Author, Title, Year..."}
              style={{ flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 11px",color:C.text,fontSize:11,fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
            {citations.length>1 && <button onClick={()=>removeCite(i)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:15,flexShrink:0 }}>✕</button>}
          </div>
        ))}
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!topic.trim()}>🎓 Generate Academic Essay</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {essay && <Card style={{ marginTop:18,animation:"fadeUp 0.4s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><Tag color={C.accent}>Academic · {style}</Tag><span style={{ fontSize:11,color:C.muted }}>~{essay.split(/\s+/).length} words</span></div>
        <div style={{ fontSize:13,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif" }}>{essay}</div>
        <ResultActions text={essay}/>
      </Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 5: GRAMMAR
// ─────────────────────────────────────────────────────────────────────────────
function GrammarMode({ user }) {
  const [text, setText]       = useState("");
  const [style, setStyle]     = useState("formal");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const check = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(""); setResult(null);
    const sObj = GRAMMAR_STYLES.find(s => s.id === style);
    const sys  = `You are an expert grammar checker. Return ONLY valid JSON: {"errors":[{"type":"grammar|spelling|punctuation|style","original":"...","fixed":"...","explanation":"brief"}],"rewritten":"full rewritten text","score":0-100,"summary":"one sentence"}`;
    try {
      const raw = await callClaude(sys,`Check and rewrite in ${sObj.label} style (${sObj.desc}):\n\n"${text}"`,2000);
      const r   = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setResult(r);
      if (user) HS.save(user.email,"grammar",{title:`Grammar check: ${text.slice(0,40)}`,input:text,output:r.rewritten});
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  const sc = result ? (result.score>=80?C.green:result.score>=60?C.yellow:C.red) : C.blue;
  return (
    <div>
      <GWTextarea label="Paste Your Text" placeholder="Paste any text — email, essay, message — and we'll check and rewrite it..." value={text} onChange={e => setText(e.target.value)} rows={6} voiceInput/>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9 }}>Rewrite Style</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9 }}>
          {GRAMMAR_STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)} style={{ background:style===s.id?C.accentSoft:C.surface,border:`1px solid ${style===s.id?C.blue:C.border}`,borderRadius:9,padding:"12px 7px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s" }}>
              <div style={{ fontSize:22,marginBottom:5 }}>{s.icon}</div>
              <div style={{ fontSize:11,fontWeight:600 }}>{s.label}</div>
              <div style={{ fontSize:10,color:C.muted,marginTop:2,lineHeight:1.4 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <PrimaryBtn onClick={check} loading={loading} disabled={!text.trim()}>✅ Check & Rewrite</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {result && (
        <div style={{ marginTop:18,animation:"fadeUp 0.4s ease" }}>
          <Card style={{ marginBottom:10,display:"flex",alignItems:"center",gap:16 }}>
            <div style={{ width:60,height:60,borderRadius:"50%",border:`3px solid ${sc}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontSize:20,fontWeight:800,color:sc,lineHeight:1 }}>{result.score}</span>
              <span style={{ fontSize:8,color:C.muted,letterSpacing:"0.1em" }}>SCORE</span>
            </div>
            <div><div style={{ fontSize:13,color:C.text,marginBottom:3 }}>{result.summary}</div><div style={{ fontSize:11,color:C.muted }}>{result.errors?.length||0} issue{result.errors?.length!==1?"s":""} found</div></div>
          </Card>
          {result.errors?.length>0 && (
            <Card style={{ marginBottom:10 }}>
              <Tag color={C.red}>Issues Found</Tag>
              {result.errors.map((e,i) => {
                const tc = {grammar:C.red,spelling:"#93c5fd",punctuation:C.green,style:"#c4b5fd"}[e.type]||C.muted;
                const bg = {grammar:"#450a0a",spelling:"#172554",punctuation:"#1a2e05",style:"#2d1f4a"}[e.type]||"#1e1e30";
                return <div key={i} style={{ padding:"10px 0",borderBottom:i<result.errors.length-1?`1px solid ${C.border}`:"none" }}>
                  <span style={{ fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",background:bg,color:tc,padding:"2px 6px",borderRadius:3 }}>{e.type}</span>
                  <div style={{ display:"flex",gap:7,fontSize:12,marginTop:6,marginBottom:3,flexWrap:"wrap",alignItems:"center" }}>
                    <span style={{ color:C.red,textDecoration:"line-through" }}>{e.original}</span>
                    <span style={{ color:C.muted }}>→</span>
                    <span style={{ color:C.green }}>{e.fixed}</span>
                  </div>
                  <div style={{ fontSize:11,color:C.muted }}>{e.explanation}</div>
                </div>;
              })}
            </Card>
          )}
          <Card>
            <Tag color={C.accent}>Rewritten — {GRAMMAR_STYLES.find(s=>s.id===style)?.label}</Tag>
            <div style={{ fontSize:13,lineHeight:1.9,color:C.text,marginTop:10,whiteSpace:"pre-wrap" }}>{result.rewritten}</div>
            <ResultActions text={result.rewritten}/>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 6: CV
// ─────────────────────────────────────────────────────────────────────────────
function CVMode({ user }) {
  const [jobTitle, setJobTitle]       = useState("");
  const [industry, setIndustry]       = useState("");
  const [experience, setExperience]   = useState("");
  const [skills, setSkills]           = useState("");
  const [education, setEducation]     = useState("");
  const [achievements, setAchievements] = useState("");
  const [targetRole, setTargetRole]   = useState("");
  const [cvStyle, setCvStyle]         = useState("modern");
  const [section, setSection]         = useState("full");
  const [result, setResult]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const CV_STYLES = [
    {id:"modern",    icon:"⚡",label:"Modern",    desc:"ATS-optimized"},
    {id:"executive", icon:"👔",label:"Executive", desc:"Senior, authoritative"},
    {id:"creative",  icon:"🎨",label:"Creative",  desc:"Stand out"},
    {id:"minimal",   icon:"◽",label:"Minimal",   desc:"Simple, elegant"},
  ];

  const generate = async () => {
    if (!jobTitle.trim() && !experience.trim()) return;
    setLoading(true); setError(""); setResult("");
    const sys = `You are an expert CV writer. Write compelling resumes that get interviews. Use action verbs, quantify achievements. Format with ## headings. Write ONLY the CV.`;
    const prompt = section === "full"
      ? `Complete ${cvStyle} CV for: Job Title: ${jobTitle||"N/A"} Target Role: ${targetRole||jobTitle||"N/A"} Industry: ${industry||"N/A"} Experience: ${experience||"N/A"} Skills: ${skills||"N/A"} Education: ${education||"N/A"} Achievements: ${achievements||"N/A"}`
      : `Write only the ${section} section. Job: ${jobTitle}. Experience: ${experience}. Skills: ${skills}.`;
    try {
      const res = await callClaude(sys, prompt, 2000);
      setResult(res);
      if (user) HS.save(user.email,"cv",{title:`CV: ${jobTitle||targetRole}`,input:`${cvStyle} style`,output:res});
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9 }}>CV Style</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
        {CV_STYLES.map(s => (
          <button key={s.id} onClick={() => setCvStyle(s.id)} style={{ background:cvStyle===s.id?C.accentSoft:C.surface,border:`1px solid ${cvStyle===s.id?C.blue:C.border}`,borderRadius:9,padding:"10px 11px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s" }}>
            <div style={{ fontSize:17 }}>{s.icon}</div>
            <div style={{ fontSize:11,fontWeight:600,marginTop:3 }}>{s.label}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:1 }}>{s.desc}</div>
          </button>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:4 }}>
        <div><GWSelect label="Generate" value={section} onChange={setSection} options={[{value:"full",label:"Full CV"},...CV_SECTIONS.map(s=>({value:s,label:s+" only"}))]}/></div>
        <FormInput label="Target Role" placeholder="e.g. Senior PM" value={targetRole} onChange={e => setTargetRole(e.target.value)} iconLeft="🎯"/>
      </div>
      <FormInput label="Current Job Title" placeholder="e.g. Product Manager at Acme" iconLeft="💼" value={jobTitle} onChange={e => setJobTitle(e.target.value)}/>
      <FormInput label="Industry" placeholder="e.g. FinTech, Healthcare" iconLeft="🏢" value={industry} onChange={e => setIndustry(e.target.value)}/>
      <GWTextarea label="Work Experience" placeholder="Company, title, years, responsibilities and achievements..." value={experience} onChange={e => setExperience(e.target.value)} rows={4} voiceInput/>
      <GWTextarea label="Key Skills" placeholder="e.g. Python, Figma, leadership, Agile..." value={skills} onChange={e => setSkills(e.target.value)} rows={2} voiceInput/>
      <GWTextarea label="Education" placeholder="e.g. BSc CS, Chulalongkorn, 2019–2023" value={education} onChange={e => setEducation(e.target.value)} rows={2}/>
      <GWTextarea label="Achievements (optional)" placeholder="e.g. Grew revenue 40%, managed 12-person team..." value={achievements} onChange={e => setAchievements(e.target.value)} rows={2} voiceInput/>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!jobTitle.trim()&&!experience.trim()}>💼 Build My CV</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {result && <Card style={{ marginTop:18,animation:"fadeUp 0.4s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><Tag color={C.accent}>{cvStyle} CV · {section==="full"?"Full":section}</Tag><span style={{ fontSize:11,color:C.muted }}>~{result.split(/\s+/).length} words</span></div>
        <div style={{ fontSize:12,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif" }}>{result}</div>
        <ResultActions text={result}/>
      </Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE 7: AUTHOR
// ─────────────────────────────────────────────────────────────────────────────
function AuthorMode({ user }) {
  const [category, setCategory]   = useState("fiction");
  const [genre, setGenre]         = useState("fantasy");
  const [nfGenre, setNfGenre]     = useState("memoir");
  const [prompt, setPrompt]       = useState("");
  const [chars, setChars]         = useState("");
  const [setting, setSetting]     = useState("");
  const [outputType, setOutputType] = useState("scene");
  const [length, setLength]       = useState("medium");
  const [pov, setPov]             = useState("third");
  const [result, setResult]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const OUTPUT_TYPES = [
    {id:"scene",     label:"Scene",       desc:"Narrative scene"},
    {id:"opening",   label:"Opening",     desc:"Hook the reader"},
    {id:"chapter",   label:"Chapter",     desc:"Full chapter"},
    {id:"outline",   label:"Outline",     desc:"Plot structure"},
    {id:"character", label:"Character",   desc:"Profile & voice"},
    {id:"dialogue",  label:"Dialogue",    desc:"Conversation"},
  ];

  const activeGenre = category === "fiction"
    ? FICTION_GENRES.find(g => g.id === genre)
    : NONFICTION_GENRES.find(g => g.id === nfGenre);

  const wordTarget = {short:"~300 words",medium:"~600 words",long:"~1200 words"}[length];

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(""); setResult("");
    const isFiction = category === "fiction";
    const sys = isFiction
      ? `You are a master ${activeGenre?.label} fiction author. Write vivid, compelling fiction showing rather than telling. Write ONLY the requested content.`
      : `You are an award-winning ${activeGenre?.label} non-fiction author. Write authentic, engaging non-fiction. Write ONLY the requested content.`;
    const povMap = {first:"First person (I/me)",third:"Third person limited",omniscient:"Third person omniscient"};
    const closingLine = isFiction
      ? "Make it feel like a published " + (activeGenre?activeGenre.label:"") + " novel — gripping, authentic, genre-appropriate."
      : "Make it feel like a published " + (activeGenre?activeGenre.label:"") + " book — compelling, honest, beautifully written.";
    const fullPrompt = "Write a " + (outputType==="chapter"?"full chapter":outputType) + " in the " + (activeGenre?activeGenre.label:"") + " " + (isFiction?"genre":"style") + ".\n"
      + prompt + "\n"
      + (chars ? "Characters: " + chars + "\n" : "")
      + (setting ? "Setting: " + setting + "\n" : "")
      + (isFiction ? "POV: " + povMap[pov] + "\n" : "")
      + "Length: " + wordTarget + "\n"
      + closingLine;
    try {
      const res = await callClaude(sys, fullPrompt, 2500);
      setResult(res);
      if (user) HS.save(user.email,"author",{title:`${activeGenre?.label}: ${prompt.slice(0,40)}`,input:`${outputType}, ${length}`,output:res});
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display:"flex",background:C.surface,borderRadius:8,padding:3,marginBottom:16 }}>
        {[{id:"fiction",label:"📖 Fiction"},{id:"nonfiction",label:"📰 Non-Fiction"}].map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={{ flex:1,padding:"8px",borderRadius:6,border:"none",background:category===c.id?C.blue:"transparent",color:category===c.id?"#000":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit" }}>{c.label}</button>
        ))}
      </div>
      <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9 }}>Genre</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:14 }}>
        {(category==="fiction"?FICTION_GENRES:NONFICTION_GENRES).map(g => {
          const active = category==="fiction" ? genre===g.id : nfGenre===g.id;
          return (
            <button key={g.id} onClick={() => category==="fiction"?setGenre(g.id):setNfGenre(g.id)}
              style={{ background:active?C.accentSoft:C.surface,border:`1px solid ${active?C.blue:C.border}`,borderRadius:9,padding:"9px 10px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:9 }}>
              <span style={{ fontSize:20,flexShrink:0 }}>{g.icon}</span>
              <div><div style={{ fontSize:11,fontWeight:600 }}>{g.label}</div><div style={{ fontSize:10,color:C.muted,marginTop:1 }}>{g.desc}</div></div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize:10,letterSpacing:"0.1em",color:C.muted,textTransform:"uppercase",marginBottom:9 }}>What to Generate</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:14 }}>
        {OUTPUT_TYPES.map(o => (
          <button key={o.id} onClick={() => setOutputType(o.id)}
            style={{ background:outputType===o.id?C.accentSoft:C.surface,border:`1px solid ${outputType===o.id?C.blue:C.border}`,borderRadius:8,padding:"9px 7px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s" }}>
            <div style={{ fontSize:11,fontWeight:600 }}>{o.label}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:2,lineHeight:1.3 }}>{o.desc}</div>
          </button>
        ))}
      </div>
      <GWTextarea label="Story / Piece Brief" placeholder={category==="fiction"?"e.g. A young mage discovers a forbidden spell...":"e.g. The day I realized I had been living someone else's life..."} value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} voiceInput/>
      <GWTextarea label="Characters / People (optional)" placeholder={category==="fiction"?"e.g. Kira — 23, skeptical. Master Chen — cryptic.":"e.g. My father, my old boss..."} value={chars} onChange={e => setChars(e.target.value)} rows={2} voiceInput/>
      <GWTextarea label="Setting / Context (optional)" placeholder={category==="fiction"?"e.g. Floating island city, steampunk, 1920s":"e.g. Rural Thailand, 2018"} value={setting} onChange={e => setSetting(e.target.value)} rows={2}/>
      <div style={{ display:"grid",gridTemplateColumns:category==="fiction"?"1fr 1fr 1fr":"1fr 1fr",gap:13,marginBottom:14 }}>
        <GWSelect label="Length" value={length} onChange={setLength} options={[{value:"short",label:"Short (~300w)"},{value:"medium",label:"Medium (~600w)"},{value:"long",label:"Long (~1200w)"}]}/>
        {category==="fiction" && <GWSelect label="POV" value={pov} onChange={setPov} options={[{value:"first",label:"First Person"},{value:"third",label:"Third Limited"},{value:"omniscient",label:"Omniscient"}]}/>}
        <GWSelect label="Output" value={outputType} onChange={setOutputType} options={OUTPUT_TYPES.map(o=>({value:o.id,label:o.label}))}/>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!prompt.trim()}>📖 Generate {outputType.charAt(0).toUpperCase()+outputType.slice(1)}</PrimaryBtn>
      {error && <ErrorBox msg={error}/>}
      {result && <Card style={{ marginTop:20,animation:"fadeUp 0.4s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><Tag color={C.accent}>{activeGenre?.label} · {outputType}</Tag><span style={{ fontSize:11,color:C.muted }}>~{result.split(/\s+/).length} words</span></div>
        <div style={{ fontSize:13,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif",fontStyle:"italic" }}>{result}</div>
        <ResultActions text={result}/>
      </Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL MODAL (Pro or Elite)
// ─────────────────────────────────────────────────────────────────────────────
function TrialModal({ mode, targetPlan, onStartTrial, onDismiss }) {
  const [billing, setBilling] = useState(targetPlan==="elite"?"quarterly":"monthly");
  const isElite = targetPlan === "elite";

  const HIGHLIGHTS = {
    essay:    {icon:"✍️",  title:"Essay Writer",      perks:["A1–C2 CEFR levels","6 essay types","Word count control","Instant generation"]},
    academic: {icon:"🎓", title:"Academic Essay",     perks:["APA, MLA, Chicago & more","URL/PDF citations","Auto-references","C1/C2 academic English"]},
    cv:       {icon:"💼", title:"CV / Resume Builder",perks:["4 CV styles","ATS-optimised","Full CV or sections","Tailored to target role"]},
    author:   {icon:"📖", title:"Author Mode",        perks:["8 fiction + 4 non-fiction","Scene, chapter, outline","POV selector","Literary-quality prose"]},
  };

  const h = HIGHLIGHTS[mode] || HIGHLIGHTS.essay;
  const monthly=249, yearly=174;

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",animation:"fadeUp 0.2s ease" }}
      onClick={e => { if(e.target===e.currentTarget) onDismiss(); }}>
      <div style={{ width:"100%",maxWidth:520,background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px 16px 0 0",padding:"24px 20px 32px",animation:"slideUpModal 0.3s ease",maxHeight:"92vh",overflowY:"auto" }}>
        <div style={{ width:36,height:3,borderRadius:2,background:C.border,margin:"0 auto 20px" }}/>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18 }}>
          <div style={{ width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>{h.icon}</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontSize:20,color:"#fff",letterSpacing:0.5 }}>{h.title}</div>
            <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>Start your 3-day free trial to unlock</div>
          </div>
        </div>
        <div style={{ background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:18 }}>
          {h.perks.map(p => (
            <div key={p} style={{ display:"flex",alignItems:"center",gap:9,fontSize:12,color:C.text,padding:"4px 0" }}>
              <span style={{ color:C.green,flexShrink:0 }}>✓</span>{p}
            </div>
          ))}
        </div>

        {!isElite && (
          <div style={{ display:"flex",background:C.surface,borderRadius:8,padding:3,marginBottom:14 }}>
            {[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly — Save 30%"}].map(b => (
              <button key={b.id} onClick={() => setBilling(b.id)} style={{ flex:1,padding:"7px",borderRadius:6,border:"none",background:billing===b.id?C.blue:"transparent",color:billing===b.id?"#000":C.muted,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit" }}>{b.label}</button>
            ))}
          </div>
        )}

        <div style={{ background:`linear-gradient(135deg,rgba(121,186,236,0.1),${C.card})`,border:`1px solid ${isElite?"rgba(240,180,41,0.35)":"rgba(121,186,236,0.3)"}`,borderRadius:12,padding:"16px",marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif",fontSize:28,color:"#fff" }}>
                {isElite ? "$39 USD" : ("฿" + (billing==="monthly"?monthly:yearly))}
                <span style={{ fontSize:13,color:C.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:400 }}>{isElite?" / 3 months":"/month"}</span>
              </div>
              {billing==="yearly"&&!isElite&&<div style={{ fontSize:11,color:C.green,marginTop:1 }}>Save ฿{(monthly-yearly)*12}/year</div>}
              {isElite && <div style={{ fontSize:10,color:"#f0b429",marginTop:2 }}>≈ $13/month · billed quarterly</div>}
              {!isElite && <div style={{ fontSize:10,color:C.muted,marginTop:2 }}>≈ $7 USD / month</div>}
            </div>
            <div style={{ background:isElite?"rgba(240,180,41,0.1)":C.accentSoft,border:`1px solid ${isElite?"rgba(240,180,41,0.3)":"rgba(121,186,236,0.3)"}`,borderRadius:7,padding:"7px 11px",textAlign:"right" }}>
              <div style={{ fontSize:10,color:isElite?"#f0b429":C.blue,fontWeight:700 }}>🎁 3 DAYS FREE</div>
              <div style={{ fontSize:9,color:C.muted,marginTop:1 }}>No charge until day 4</div>
            </div>
          </div>
          <PrimaryBtn onClick={() => onStartTrial(billing, targetPlan)}>Start 3-Day Free Trial →</PrimaryBtn>
          <div style={{ textAlign:"center",fontSize:11,color:C.muted,marginTop:8 }}>Cancel anytime · No charge until day 4</div>
        </div>
        <button onClick={onDismiss} style={{ width:"100%",padding:"11px",borderRadius:9,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
function AppShell({ user, onStartTrial, onSignOut }) {
  const [mode, setMode]           = useState("reply");
  const [trialModal, setTrialModal] = useState(null);
  const [trialPlan, setTrialPlan] = useState("pro");
  const isPro   = user.plan === "pro" || user.plan === "elite";
  const isElite = user.plan === "elite";

  const handleTabClick = m => {
    if (m.access === "trial" && !isPro) { setTrialPlan("pro"); setTrialModal(m.id); }
    else setMode(m.id);
  };

  const handleStartTrial = (billing, plan) => {
    setTrialModal(null);
    onStartTrial(billing, plan || trialPlan);
  };

  const badgeFor = m => {
    if (m.id === "history") return null;
    if (m.access === "free") return <PlanBadge plan="free"/>;
    if (m.access === "trial" && !isPro) return <span style={{ background:"rgba(251,191,36,0.15)",color:C.yellow,fontSize:9,fontWeight:700,letterSpacing:"0.06em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",flexShrink:0 }}>TRY</span>;
    return <PlanBadge plan="free"/>;
  };

  const modeProps = { user, isPro, isElite };

  return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.text,paddingBottom:80 }}>
      {trialModal && (
        <TrialModal mode={trialModal} targetPlan={trialPlan} onStartTrial={handleStartTrial} onDismiss={() => setTrialModal(null)}/>
      )}

      {/* Navbar */}
      <div style={{ position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`,padding:"11px 16px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontSize:18,color:"#fff",letterSpacing:1.5,lineHeight:1 }}>👻 GHOSTWRITERME</div>
          <div style={{ fontSize:8,color:C.muted,letterSpacing:"0.18em" }}>AI WRITING SUITE</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          {isElite && <div style={{ background:"rgba(240,180,41,0.15)",border:"1px solid rgba(240,180,41,0.3)",borderRadius:20,padding:"4px 12px",fontSize:10,color:"#f0b429",fontWeight:700 }}>⚡ ELITE</div>}
          {isPro && !isElite && <div style={{ background:C.accentSoft,border:`1px solid rgba(121,186,236,0.3)`,borderRadius:20,padding:"4px 12px",fontSize:10,color:C.blue,fontWeight:700 }}>✨ PRO TRIAL</div>}
          {!isPro && (
            <div style={{ display:"flex",gap:6 }}>
              <button onClick={() => { setTrialPlan("pro"); setTrialModal("essay"); }} style={{ background:C.accentSoft,border:`1px solid rgba(121,186,236,0.3)`,borderRadius:20,padding:"4px 11px",fontSize:10,color:C.blue,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Pro Free 🎁</button>
              <button onClick={() => { setTrialPlan("elite"); setTrialModal("essay"); }} style={{ background:"rgba(240,180,41,0.12)",border:"1px solid rgba(240,180,41,0.3)",borderRadius:20,padding:"4px 11px",fontSize:10,color:"#f0b429",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Elite ⚡</button>
            </div>
          )}
          <div style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer" }} title={user.email}>{user.avatar}</div>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto",scrollbarWidth:"none" }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => handleTabClick(m)}
            style={{ flex:1,minWidth:64,background:"transparent",border:"none",borderBottom:`2px solid ${mode===m.id?C.blue:"transparent"}`,padding:"11px 4px 9px",color:mode===m.id?C.blue:C.muted,fontFamily:"inherit",fontSize:10,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
            <span style={{ fontSize:16 }}>{m.icon}</span>
            <span style={{ fontSize:8,letterSpacing:"0.03em",whiteSpace:"nowrap" }}>{m.label}</span>
            {badgeFor(m)}
          </button>
        ))}
      </div>

      {/* Plan banner */}
      <div style={{ maxWidth:600,margin:"0 auto",padding:"14px 16px 0" }}>
        {isPro && <div style={{ background:C.accentSoft,border:`1px solid rgba(121,186,236,0.2)`,borderRadius:8,padding:"9px 13px",marginBottom:18,display:"flex",alignItems:"center",gap:9,fontSize:12,color:"#a8d4f5" }}>
          <span>{isElite?"⚡":"🎁"}</span>
          <span>You're on a <strong style={{ color:C.blue }}>{isElite?"Elite":"3-day Pro trial"}</strong> — all features unlocked!</span>
        </div>}

        <div style={{ animation:"fadeUp 0.3s ease" }}>
          {mode==="reply"    && <ReplyMode    {...modeProps}/>}
          {mode==="email"    && <EmailMode    {...modeProps}/>}
          {mode==="grammar"  && <GrammarMode  {...modeProps}/>}
          {mode==="essay"    && <EssayMode    {...modeProps}/>}
          {mode==="academic" && <AcademicMode {...modeProps}/>}
          {mode==="cv"       && <CVMode       {...modeProps}/>}
          {mode==="author"   && <AuthorMode   {...modeProps}/>}
          {mode==="history"  && <HistoryMode  user={user}/>}
        </div>

        <div style={{ marginTop:48,paddingTop:18,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:7,fontSize:10,color:C.border }}>
          <span>👻 GhostwriterMe · 7 AI Writing Modes</span>
          <span onClick={onSignOut} style={{ color:C.muted,cursor:"pointer" }}>Sign out</span>
          <span>฿249/month after trial</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING SCREEN — unified panel, all 3 plans side by side with tab switcher
// ─────────────────────────────────────────────────────────────────────────────
function PricingScreen({ user, onSelect }) {
  // Single billing toggle that applies to Pro (monthly/yearly)
  // Elite is always $39 USD / 3 months — fixed price, no toggle needed
  const [billing, setBilling] = useState("monthly");

  // Pro prices in THB
  const PRO_MONTHLY = 249;
  const PRO_YEARLY  = 174; // per month billed annually

  // Elite price — fixed $39 USD every 3 months
  const ELITE_USD = 39;
  const ELITE_PERIOD = "3 months";

  const FREE_F = [
    "3 AI replies / day",
    "Email Mode — unlimited",
    "Grammar check (basic)",
    "History (last 50 items)",
    "🎤 Voice input",
    "🔊 Text-to-speech",
  ];

  const PRO_ONLY_F = [
    "Unlimited AI replies",
    "✍️ Essay Writer (CEFR A1–C2)",
    "🎓 Academic + auto-citations",
    "💼 CV / Resume Builder",
    "📖 Author Mode (8 fiction + 4 non-fiction genres)",
    "Full history — all modes",
    "Priority generation speed",
  ];

  const ELITE_ONLY_F = [
    "🌐 Multi-language essay output",
    "📊 AI content score & suggestions",
    "🔁 Unlimited rewrites per session",
    "📁 Export to PDF / Word",
    "🎨 Custom tone profiles (save & reuse)",
    "👤 Dedicated support channel",
    "⚡ Early access to new features",
  ];

  // Which plan tab is highlighted in the unified card
  const [selected, setSelected] = useState("pro");

  const planData = {
    free: {
      label: "Free",
      color: C.green,
      price: "$0",
      period: "forever",
      sub: null,
      badge: null,
      features: FREE_F,
      featureColor: C.muted,
      checkColor: C.green,
      cta: "Continue Free",
      ctaStyle: "secondary",
      onClick: () => onSelect("free", null, null),
    },
    pro: {
      label: "Pro",
      color: C.blue,
      price: billing === "monthly" ? "฿" + PRO_MONTHLY : "฿" + PRO_YEARLY,
      period: "/ month",
      sub: billing === "yearly" ? "Save ฿" + (PRO_MONTHLY - PRO_YEARLY) * 12 + "/yr" : "≈ $7 USD / month",
      badge: "MOST POPULAR",
      badgeColor: C.blue,
      features: [...FREE_F, ...PRO_ONLY_F],
      featureColor: C.text,
      checkColor: C.blue,
      cta: "Start 3-Day Free Trial →",
      ctaStyle: "primary-blue",
      onClick: () => onSelect("pro", billing, null),
    },
    elite: {
      label: "Elite",
      color: "#f0b429",
      price: "$" + ELITE_USD,
      period: "/ " + ELITE_PERIOD,
      sub: "≈ $13/month · billed quarterly",
      badge: "⚡ ELITE",
      badgeColor: "#f0b429",
      features: [...FREE_F, ...PRO_ONLY_F, ...ELITE_ONLY_F],
      featureColor: C.text,
      checkColor: "#f0b429",
      cta: "Start Elite Free Trial ⚡",
      ctaStyle: "primary-gold",
      onClick: () => onSelect("elite", "quarterly", null),
    },
  };

  const p = planData[selected];

  return (
    <div style={{ minHeight:"100vh",background:C.bg,padding:"28px 16px 80px",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%",maxWidth:460 }}>

        {/* User greeting */}
        <div style={{ display:"flex",alignItems:"center",gap:11,marginBottom:22,animation:"fadeUp 0.4s ease" }}>
          <div style={{ width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{user.avatar}</div>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:"#fff" }}>Hey, {user.name.split(" ")[0]} 👋</div>
            <div style={{ fontSize:11,color:C.muted }}>{user.email}</div>
          </div>
        </div>

        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:26,color:"#fff",letterSpacing:1,marginBottom:4,animation:"fadeUp 0.4s 0.05s ease both" }}>CHOOSE YOUR PLAN</div>
        <div style={{ fontSize:12,color:C.muted,marginBottom:20,animation:"fadeUp 0.4s 0.08s ease both" }}>All plans include voice input & text-to-speech. Upgrade anytime.</div>

        {/* ── Plan tab switcher ── */}
        <div style={{ display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:4,marginBottom:18,animation:"fadeUp 0.4s 0.1s ease both" }}>
          {["free","pro","elite"].map(pid => (
            <button key={pid} onClick={() => setSelected(pid)}
              style={{ flex:1,padding:"9px 4px",borderRadius:7,border:"none",background:selected===pid?planData[pid].color:"transparent",color:selected===pid?"#000":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
              {pid === "elite" && "⚡ "}
              {planData[pid].label}
            </button>
          ))}
        </div>

        {/* Pro billing toggle — only shown when Pro is selected */}
        {selected === "pro" && (
          <div style={{ display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:3,marginBottom:14,animation:"fadeUp 0.2s ease" }}>
            {[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly — Save 30%"}].map(b => (
              <button key={b.id} onClick={() => setBilling(b.id)}
                style={{ flex:1,padding:"7px",borderRadius:6,border:"none",background:billing===b.id?C.blue:"transparent",color:billing===b.id?"#000":C.muted,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit" }}>
                {b.label}
              </button>
            ))}
          </div>
        )}

        {/* Elite info pill — shown when Elite is selected */}
        {selected === "elite" && (
          <div style={{ background:"rgba(240,180,41,0.08)",border:"1px solid rgba(240,180,41,0.22)",borderRadius:9,padding:"9px 13px",marginBottom:14,display:"flex",alignItems:"center",gap:8,animation:"fadeUp 0.2s ease" }}>
            <span style={{ fontSize:16 }}>💡</span>
            <div style={{ fontSize:11,color:"#f0b429",lineHeight:1.6 }}>
              Elite is billed <strong>$39 USD every 3 months</strong> — no annual commitment required. Cancel anytime.
            </div>
          </div>
        )}

        {/* ── Main plan card ── */}
        <div style={{ background:selected==="elite"?`linear-gradient(150deg,rgba(240,180,41,0.07),${C.card})`:selected==="pro"?`linear-gradient(150deg,rgba(121,186,236,0.09),${C.card})`:C.card,border:`1px solid ${selected==="elite"?"rgba(240,180,41,0.4)":selected==="pro"?C.blue:C.border}`,borderRadius:14,padding:"20px",position:"relative",overflow:"hidden",animation:"fadeUp 0.3s ease",boxShadow:selected==="elite"?"0 0 32px rgba(240,180,41,0.1)":selected==="pro"?`0 0 32px ${C.blueGlow}`:"none",marginBottom:16 }}>

          {/* Badge */}
          {p.badge && (
            <div style={{ position:"absolute",top:-1,right:16,background:selected==="elite"?"linear-gradient(135deg,#f0b429,#ffd700)":`linear-gradient(135deg,${C.blue},${C.accent})`,color:"#000",fontSize:9,fontWeight:700,letterSpacing:"0.08em",padding:"4px 12px",borderRadius:"0 0 7px 7px" }}>
              {p.badge}
            </div>
          )}

          {/* Plan name */}
          <div style={{ fontSize:10,letterSpacing:"0.12em",color:p.color,textTransform:"uppercase",marginBottom:6 }}>{p.label}</div>

          {/* Price */}
          <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:2 }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontSize:32,color:"#fff",lineHeight:1 }}>{p.price}</span>
            <span style={{ fontSize:12,color:C.muted }}>{p.period}</span>
          </div>
          {p.sub && <div style={{ fontSize:10,color:selected==="pro"&&billing==="yearly"?C.green:C.muted,marginBottom:16 }}>{p.sub}</div>}
          {!p.sub && <div style={{ marginBottom:16 }}/>}

          {/* Features list */}
          <ul style={{ listStyle:"none",marginBottom:18,display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto",paddingRight:2 }}>
            {p.features.map((f, i) => {
              const isEliteExclusive = selected==="elite" && i >= FREE_F.length + PRO_ONLY_F.length;
              const isProExclusive   = selected==="pro"   && i >= FREE_F.length;
              return (
                <li key={f} style={{ fontSize:12,color:isEliteExclusive?C.accent:isProExclusive?C.text:p.featureColor,display:"flex",alignItems:"flex-start",gap:7 }}>
                  <span style={{ color:p.checkColor,flexShrink:0,marginTop:1 }}>✓</span>
                  {f}
                </li>
              );
            })}
          </ul>

          {/* Trial note */}
          {selected !== "free" && (
            <div style={{ background:selected==="elite"?"rgba(240,180,41,0.08)":C.accentSoft,border:`1px solid ${selected==="elite"?"rgba(240,180,41,0.2)":"rgba(121,186,236,0.22)"}`,borderRadius:9,padding:"9px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:9 }}>
              <span style={{ fontSize:18 }}>🎁</span>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:"#fff" }}>3-day free trial included</div>
                <div style={{ fontSize:10,color:C.muted }}>No charge until day 4. Cancel anytime.</div>
              </div>
            </div>
          )}

          {/* CTA button */}
          {p.ctaStyle === "secondary" && <SecondaryBtn onClick={p.onClick}>{p.cta}</SecondaryBtn>}
          {p.ctaStyle === "primary-blue" && <PrimaryBtn onClick={p.onClick}>{p.cta}</PrimaryBtn>}
          {p.ctaStyle === "primary-gold" && (
            <button onClick={p.onClick}
              style={{ width:"100%",padding:"13px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#f0b429,#ffd700)",color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px rgba(240,180,41,0.3)" }}>
              {p.cta}
            </button>
          )}
        </div>

        {/* Compare row */}
        <div style={{ display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap",animation:"fadeUp 0.4s 0.2s ease both" }}>
          {["free","pro","elite"].filter(pid => pid !== selected).map(pid => (
            <button key={pid} onClick={() => setSelected(pid)}
              style={{ padding:"5px 13px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=planData[pid].color; e.currentTarget.style.color=planData[pid].color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted; }}>
              View {planData[pid].label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function GhostwriterMeApp() {
  const [screen, setScreen]   = useState("auth");   // auth | safety | pricing | payment | app
  const [user, setUser]       = useState(null);
  const [billing, setBilling] = useState("monthly");
  const [targetPlan, setTP]   = useState("pro");

  const handleAuth = u => {
    setUser({ ...u, plan:"free" });
    setScreen("safety");
  };

  const handleSafetyAccept = () => setScreen("app");

  const handleSelectPlan = (plan, bill) => {
    if (plan === "free") { setScreen("app"); return; }
    setTP(plan);
    setBilling(bill || "monthly");
    setScreen("payment");
  };

  const handleStartTrial = (bill, plan) => {
    setTP(plan || "pro");
    setBilling(bill || "monthly");
    setScreen("payment");
  };

  const handlePayDone = () => {
    setUser(u => ({ ...u, plan: targetPlan }));
    setScreen("app");
  };

  const handleSignOut = () => { setUser(null); setScreen("auth"); };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {screen==="auth"    && <AuthScreen onAuth={handleAuth}/>}
      {screen==="safety"  && <SafetyDisclaimerScreen onAccept={handleSafetyAccept}/>}
      {screen==="pricing" && <PricingScreen user={user} onSelect={handleSelectPlan}/>}
      {screen==="payment" && <PaymentScreen user={user} billing={billing} targetPlan={targetPlan} onComplete={handlePayDone}/>}
      {screen==="app"     && <AppShell user={user} onStartTrial={handleStartTrial} onSignOut={handleSignOut}/>}
    </>
  );
}