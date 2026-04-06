import { useState, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
bg:"#08080f", surface:"#0f0f1a", card:"#13131f", border:"#1f1f30",
purple:"#8b5cf6", purpleD:"#6d28d9", accent:"#e879f9",
text:"#ede9fe", muted:"#6b6b8a", green:"#4ade80", red:"#f87171", yellow:"#fbbf24",
};

const GLOBAL_CSS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;} input,button,select,textarea{font-family:inherit;outline:none;} ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#1f1f30;border-radius:2px;} select{-webkit-appearance:none;appearance:none;} @keyframes fadeUp {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}} @keyframes spin   {to{transform:rotate(360deg)}} @keyframes bounce {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes glow   {0%,100%{box-shadow:0 0 20px rgba(139,92,246,0.3)}50%{box-shadow:0 0 48px rgba(139,92,246,0.65)}} @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes slideUpModal{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const MODES = [
{ id:"reply",    icon:"💬", label:"AI Replies",   access:"free"  },
{ id:"email",    icon:"📧", label:"Email Mode",   access:"free"  },
{ id:"grammar",  icon:"✅", label:"Grammar",      access:"free"  },
{ id:"essay",    icon:"✍️",  label:"Essay Writer", access:"trial" },
{ id:"academic", icon:"🎓", label:"Academic",     access:"trial" },
{ id:"cv",       icon:"💼", label:"CV / Resume",  access:"trial" },
{ id:"author",   icon:"📖", label:"Author Mode",  access:"trial" },
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
{id:"professional",icon:"💼",label:"Professional",desc:"Work emails, colleagues"},
{id:"follow-up",   icon:"🔄",label:"Follow-up",   desc:"Check-ins, reminders"},
{id:"apology",     icon:"🙏",label:"Apology",     desc:"Sorry, make it right"},
{id:"request",     icon:"📋",label:"Request",     desc:"Ask for something"},
{id:"cold-outreach",icon:"🚀",label:"Cold Outreach",desc:"First contact, pitch"},
{id:"thank-you",   icon:"🌟",label:"Thank You",   desc:"Gratitude, appreciation"},
];

const FICTION_GENRES = [
{id:"fantasy",    icon:"🧙",label:"Fantasy",           desc:"Magic, worlds, quests"},
{id:"sci-fi",     icon:"🚀",label:"Science Fiction",   desc:"Tech, space, futures"},
{id:"romance",    icon:"💕",label:"Romance",           desc:"Love, passion, tension"},
{id:"thriller",   icon:"🔪",label:"Thriller",         desc:"Suspense, danger, twists"},
{id:"mystery",    icon:"🔍",label:"Mystery",           desc:"Clues, detectives, reveals"},
{id:"historical", icon:"⚔️", label:"Historical",       desc:"Past eras, real events"},
{id:"literary",   icon:"🌿",label:"Literary Fiction",  desc:"Character-driven, lyrical"},
{id:"ya",         icon:"✨",label:"Young Adult",       desc:"Teen voices, big emotions"},
];

const NONFICTION_GENRES = [
{id:"memoir",    icon:"📔",label:"Memoir",         desc:"Personal stories, truth"},
{id:"selfhelp",  icon:"💡",label:"Self-Help",      desc:"Growth, habits, mindset"},
{id:"essay-nf",  icon:"🖊️", label:"Personal Essay",desc:"Opinion, voice, reflection"},
{id:"travel",    icon:"🗺️", label:"Travel Writing", desc:"Places, people, journeys"},
];

const CV_SECTIONS = ["Work Experience","Education","Skills","Summary/Objective","Achievements","Projects","Certifications","Languages","References"];

const SOCIAL_PROVIDERS = [
{id:"google",   label:"Continue with Google",
icon:<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>,
bg:"#fff",color:"#1a1a2e"},
{id:"facebook", label:"Continue with Facebook",
icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
bg:"#1877F2",color:"#fff"},
{id:"apple",    label:"Continue with Apple",
icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/></svg>,
bg:"#000",color:"#fff",border:"1px solid #333"},
{id:"email",    label:"Continue with Email",
icon:<span style={{fontSize:16}}>✉️</span>,
bg:C.surface,color:C.text,border:`1px solid ${C.border}`},
];

// ═══════════════════════════════════════════════════════════════════════════════
// TERMS & CONDITIONS CONTENT
// ═══════════════════════════════════════════════════════════════════════════════
const TERMS_CONTENT = [
{
  heading: "1. Acceptance of Terms",
  body: "By creating an account and using GhostwriterMe (the \"Service\"), you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the Service. These Terms constitute a legally binding agreement between you and GhostwriterMe Co., Ltd."
},
{
  heading: "2. Eligibility & Age Requirement",
  body: "You must be at least 13 years of age to use this Service. By registering, you confirm that you meet this minimum age requirement. Users under 18 must have parental or guardian consent. We reserve the right to terminate accounts of users found to be underage."
},
{
  heading: "3. User-Generated Content & Responsibility",
  body: "GhostwriterMe provides AI-assisted writing tools. ALL content generated through our Service is produced at your direction and under your responsibility. You are solely and exclusively responsible for any and all text, messages, essays, emails, CVs, or other content you create, generate, send, publish, or otherwise use through this Service. GhostwriterMe bears no responsibility, liability, or accountability for any content generated by users, regardless of how it is used."
},
{
  heading: "4. Prohibited Uses",
  body: "You agree not to use the Service to generate content that: (a) is defamatory, harassing, threatening, or harmful to others; (b) infringes intellectual property rights; (c) constitutes fraud, deception, or misrepresentation; (d) violates any applicable law or regulation; (e) is used to spam, phish, or deceive recipients; (f) constitutes academic fraud or plagiarism in violation of your institution's policies. Violation of these terms may result in immediate account termination."
},
{
  heading: "5. No Warranty on AI Output",
  body: "The AI-generated content is provided \"as is\" without warranty of any kind. GhostwriterMe does not guarantee accuracy, completeness, suitability, or fitness for any particular purpose of any generated content. You should independently verify all AI-generated content before use. We expressly disclaim all warranties, express or implied."
},
{
  heading: "6. Limitation of Liability",
  body: "To the fullest extent permitted by law, GhostwriterMe, its directors, employees, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from: (a) your use of or inability to use the Service; (b) any content generated through the Service and how it is used; (c) any actions taken by third parties in response to content you generated. Your sole remedy for dissatisfaction with the Service is to stop using it."
},
{
  heading: "7. Privacy & Data",
  body: "We collect and process data as described in our Privacy Policy. By using the Service, you consent to such processing. We do not sell your personal data to third parties. Conversation data may be used to improve our AI models in anonymized form. You may request deletion of your data at any time by contacting support."
},
{
  heading: "8. Subscription & Billing",
  body: "Pro subscriptions are billed monthly or annually as selected. The 3-day free trial begins upon payment method authorization; no charge is made until day 4. You may cancel at any time before the trial ends to avoid charges. Refunds are handled on a case-by-case basis at our discretion. Price changes will be communicated 30 days in advance."
},
{
  heading: "9. Intellectual Property",
  body: "Content you generate using the Service is yours. GhostwriterMe retains all rights to its platform, AI models, interfaces, and technology. You may not reverse-engineer, reproduce, or create derivative works from our platform without written permission."
},
{
  heading: "10. Modifications",
  body: "We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance. We will notify users of material changes via email or in-app notification at least 14 days before they take effect."
},
{
  heading: "11. Governing Law",
  body: "These Terms are governed by the laws of Thailand. Any disputes shall be resolved in the courts of Bangkok, Thailand. If any provision of these Terms is found unenforceable, the remaining provisions continue in full force."
},
{
  heading: "12. Contact",
  body: "For questions about these Terms, contact us at legal@ghostwriterme.com or GhostwriterMe Co., Ltd., Bangkok, Thailand."
},
];

// ═══════════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════════
const Spinner = ({size=16,color="#fff"}) => (
  <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",border:`2px solid rgba(255,255,255,0.15)`,borderTopColor:color,animation:"spin 0.7s linear infinite",flexShrink:0}}/>
);

const TypingDots = () => (
  <span style={{display:"inline-flex",gap:4,alignItems:"center"}}>
    {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:C.purple,display:"inline-block",animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}
  </span>
);

const Tag = ({children,color=C.purple,style:s}) => (
  <span style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color,...s}}>{children}</span>
);

const ProBadge = () => (
  <span style={{background:`linear-gradient(135deg,${C.purple},${C.accent})`,color:"#fff",fontSize:9,fontWeight:700,letterSpacing:"0.08em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",flexShrink:0}}>PRO</span>
);

const FreeBadge = () => (
  <span style={{background:"rgba(74,222,128,0.15)",color:C.green,fontSize:9,fontWeight:700,letterSpacing:"0.08em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",flexShrink:0}}>FREE</span>
);

const TrialBadge = () => (
  <span style={{background:"rgba(251,191,36,0.15)",color:C.yellow,fontSize:9,fontWeight:700,letterSpacing:"0.06em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",flexShrink:0}}>TRY FREE</span>
);

const Card = ({children,style:s,highlight}) => (
  <div style={{background:C.card,border:`1px solid ${highlight?C.purple:C.border}`,borderRadius:14,padding:"18px",...(highlight?{boxShadow:"0 0 30px rgba(139,92,246,0.12)"}:{}),...s}}>{children}</div>
);

const ErrorBox = ({msg}) => (
  <div style={{marginTop:12,padding:"11px 14px",background:"#1a0000",border:"1px solid #450a0a",borderRadius:10,fontSize:13,color:C.red}}>{msg}</div>
);

function CopyBtn({text}) {
  const [copied,setCopied] = useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{width:"100%",marginTop:12,padding:"9px",borderRadius:8,background:copied?"#14532d":"#1e1e2e",border:`1px solid ${copied?"#166534":"#2a2a3a"}`,color:copied?C.green:"#9ca3af",fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
      {copied?"✓ Copied!":"Copy to clipboard"}
    </button>
  );
}

const Toggle = ({on,onClick}) => (
  <div onClick={onClick} style={{width:38,height:22,borderRadius:11,background:on?C.purple:"#2a2a3a",position:"relative",transition:"background 0.2s",flexShrink:0,cursor:"pointer"}}>
    <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left 0.2s"}}/>
  </div>
);

function FormInput({label,type="text",placeholder,value,onChange,error,iconLeft,iconRight,onIconRightClick}) {
  const [focused,setFocused] = useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase"}}>{label}</label>}
      <div style={{position:"relative"}}>
        {iconLeft&&<span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}}>{iconLeft}</span>}
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{width:"100%",background:C.surface,border:`1px solid ${error?C.red:focused?C.purple:C.border}`,borderRadius:10,padding:`12px ${iconRight?44:14}px 12px ${iconLeft?42:14}px`,color:C.text,fontSize:14,transition:"border-color 0.2s"}}
        />
        {iconRight&&<span onClick={onIconRightClick} style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:15}}>{iconRight}</span>}
      </div>
      {error&&<div style={{fontSize:11,color:C.red,marginTop:4}}>{error}</div>}
    </div>
  );
}

function GWTextarea({label,placeholder,value,onChange,rows=4,hint}) {
  const [focused,setFocused] = useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase"}}>{label}</label>}
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",background:C.surface,border:`1px solid ${focused?C.purple:C.border}`,borderRadius:10,padding:"13px 15px",color:C.text,fontSize:13,lineHeight:1.7,resize:"vertical",fontFamily:"inherit",transition:"border-color 0.2s"}}
      />
      {hint&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{hint}</div>}
    </div>
  );
}

function GWSelect({label,value,onChange,options}) {
  return (
    <div style={{marginBottom:0}}>
      {label&&<label style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase"}}>{label}</label>}
      <div style={{position:"relative"}}>
        <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 36px 11px 14px",color:C.text,fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>
          {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
        </select>
        <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.muted,fontSize:11}}>▾</span>
      </div>
    </div>
  );
}

const PrimaryBtn = ({children,onClick,loading,disabled,fullWidth=true}) => (
  <button onClick={onClick} disabled={loading||disabled} style={{width:fullWidth?"100%":"auto",padding:"14px 24px",borderRadius:10,border:"none",background:loading||disabled?"#1e1e30":`linear-gradient(135deg,${C.purple},${C.accent})`,color:loading||disabled?C.muted:"#fff",fontSize:14,fontWeight:700,cursor:loading||disabled?"not-allowed":"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:loading||disabled?"none":"0 4px 24px rgba(139,92,246,0.3)",fontFamily:"inherit"}}>
    {loading?<><Spinner/>Processing…</>:children}
  </button>
);

const SecondaryBtn = ({children,onClick}) => (
  <button onClick={onClick} style={{width:"100%",padding:"13px",borderRadius:10,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.purple;e.currentTarget.style.color=C.text;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
  >{children}</button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TERMS & CONDITIONS MODAL (full-page overlay)
// ═══════════════════════════════════════════════════════════════════════════════
function TermsModal({onClose}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:C.bg,display:"flex",flexDirection:"column",animation:"fadeUp 0.25s ease"}}>
      {/* Header */}
      <div style={{background:"rgba(8,8,15,0.97)",borderBottom:`1px solid ${C.border}`,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"sticky",top:0,zIndex:10}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#fff",letterSpacing:2,lineHeight:1}}>👻 Terms & Conditions</div>
          <div style={{fontSize:10,color:C.muted,letterSpacing:"0.15em",marginTop:3}}>GHOSTWRITERME · EFFECTIVE JAN 2026</div>
        </div>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"inherit",lineHeight:1}}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",padding:"24px 20px 48px",maxWidth:680,width:"100%",margin:"0 auto"}}>
        {/* Intro banner */}
        <div style={{background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.25)",borderRadius:12,padding:"14px 16px",marginBottom:28,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>⚖️</span>
          <div style={{fontSize:12,color:"#c4b5fd",lineHeight:1.7}}>
            Please read these Terms carefully before using GhostwriterMe. By signing up, you accept full responsibility for any content you generate using our AI tools.
          </div>
        </div>

        {TERMS_CONTENT.map((section, i) => (
          <div key={i} style={{marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:700,color:C.purple,marginBottom:8,letterSpacing:"0.03em"}}>{section.heading}</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.85}}>{section.body}</div>
            {i < TERMS_CONTENT.length - 1 && <div style={{height:1,background:C.border,marginTop:20}}/>}
          </div>
        ))}

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginTop:8,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Last updated: January 2026 · Version 1.0<br/>Questions? <span style={{color:C.purple}}>legal@ghostwriterme.com</span></div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{padding:"16px 20px",borderTop:`1px solid ${C.border}`,background:"rgba(8,8,15,0.97)",flexShrink:0}}>
        <button onClick={onClose} style={{width:"100%",maxWidth:480,margin:"0 auto",display:"block",padding:"13px",borderRadius:10,background:`linear-gradient(135deg,${C.purple},${C.accent})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",border:"none",fontFamily:"inherit",boxShadow:"0 4px 24px rgba(139,92,246,0.3)"}}>
          Got it — Close ✓
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY DISCLAIMER SCREEN (shown once after first login, before app)
// ═══════════════════════════════════════════════════════════════════════════════
function SafetyDisclaimerScreen({onAccept}) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const allChecked = checked1 && checked2 && checked3;

  const CheckRow = ({checked, onToggle, children}) => (
    <div onClick={onToggle} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px",background:checked?"rgba(139,92,246,0.08)":C.surface,border:`1px solid ${checked?C.purple:C.border}`,borderRadius:12,cursor:"pointer",transition:"all 0.15s",marginBottom:10}}>
      <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?C.purple:C.border}`,background:checked?C.purple:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
        {checked && <span style={{color:"#fff",fontSize:12,lineHeight:1}}>✓</span>}
      </div>
      <div style={{fontSize:13,color:checked?C.text:C.muted,lineHeight:1.6,transition:"color 0.15s"}}>{children}</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{width:"100%",maxWidth:460,animation:"fadeUp 0.5s ease"}}>

        {/* Icon + Title */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:56,marginBottom:12,animation:"glow 3s ease infinite"}}>🛡️</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,color:"#fff",letterSpacing:2,lineHeight:1,marginBottom:8}}>BEFORE YOU BEGIN</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7,maxWidth:340,margin:"0 auto"}}>GhostwriterMe generates content based on your instructions. Please read and accept the following before continuing.</div>
        </div>

        {/* Warning banner */}
        <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:12,padding:"13px 15px",marginBottom:22,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
          <div style={{fontSize:12,color:C.yellow,lineHeight:1.7}}>AI-generated content is produced under <strong>your direction</strong>. You are responsible for how any generated text is used.</div>
        </div>

        {/* Checkboxes */}
        <CheckRow checked={checked1} onToggle={()=>setChecked1(!checked1)}>
          <strong style={{color:checked1?"#fff":C.muted}}>I take full responsibility</strong> for all content I generate using GhostwriterMe. GhostwriterMe is not liable for any actions taken based on AI-generated content.
        </CheckRow>

        <CheckRow checked={checked2} onToggle={()=>setChecked2(!checked2)}>
          <strong style={{color:checked2?"#fff":C.muted}}>I will not use this tool</strong> to create harmful, illegal, deceptive, or harassing content, or to commit academic fraud.
        </CheckRow>

        <CheckRow checked={checked3} onToggle={()=>setChecked3(!checked3)}>
          <strong style={{color:checked3?"#fff":C.muted}}>I understand AI output</strong> may contain errors or inaccuracies. I will review and verify all generated content before using it.
        </CheckRow>

        {/* Progress indicator */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20,marginTop:4}}>
          {[checked1,checked2,checked3].map((c,i)=>(
            <div key={i} style={{height:3,flex:1,borderRadius:2,background:c?C.purple:C.border,transition:"background 0.3s"}}/>
          ))}
        </div>

        <button onClick={onAccept} disabled={!allChecked} style={{width:"100%",padding:"15px",borderRadius:10,border:"none",background:allChecked?`linear-gradient(135deg,${C.purple},${C.accent})`:"#1a1a2a",color:allChecked?"#fff":C.muted,fontSize:14,fontWeight:700,cursor:allChecked?"pointer":"not-allowed",transition:"all 0.3s",fontFamily:"inherit",boxShadow:allChecked?"0 4px 24px rgba(139,92,246,0.35)":"none"}}>
          {allChecked ? "I Agree — Enter GhostwriterMe →" : `Accept all ${3 - [checked1,checked2,checked3].filter(Boolean).length} remaining condition${3 - [checked1,checked2,checked3].filter(Boolean).length !== 1 ? "s" : ""} to continue`}
        </button>

        <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:14,lineHeight:1.6}}>
          These conditions are in addition to our full <span style={{color:C.purple}}>Terms & Conditions</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAUDE API
// ═══════════════════════════════════════════════════════════════════════════════
async function callClaude(system,user,maxTokens=1500) {
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages:[{role:"user",content:user}]})
  });
  const d = await r.json();
  return d.content?.map(b=>b.text||"").join("")||"";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: AUTH  (with terms checkbox, age field, safety acceptance)
// ═══════════════════════════════════════════════════════════════════════════════
function AuthScreen({onAuth}) {
  const [tab,setTab]             = useState("signin");
  const [showEmail,setShowEmail] = useState(false);
  const [name,setName]           = useState("");
  const [email,setEmail]         = useState("");
  const [password,setPass]       = useState("");
  const [age,setAge]             = useState("");
  const [showPw,setShowPw]       = useState(false);
  const [agreedTerms,setAgreedTerms] = useState(false);
  const [loading,setLoading]     = useState(null);
  const [errors,setErrors]       = useState({});
  const [showTermsModal,setShowTermsModal] = useState(false);

  const handleSocial = id => {
    if(id==="email"){setShowEmail(true);return;}
    setLoading(id);
    setTimeout(()=>{setLoading(null);onAuth({name:"Demo User",email:"demo@ghostwriterme.com",avatar:"🧠",plan:"none"});},1400);
  };

  const handleEmailSubmit = () => {
    const e={};
    if(!email.includes("@")) e.email="Enter a valid email";
    if(password.length<6)    e.password="Password must be 6+ characters";
    if(tab==="signup") {
      if(!name.trim())       e.name="Name is required";
      const ageNum = parseInt(age, 10);
      if(!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) e.age="Enter a valid age";
      else if(ageNum < 13) e.age="You must be at least 13 years old to use GhostwriterMe";
      if(!agreedTerms)       e.terms="You must agree to the Terms & Conditions";
    }
    if(Object.keys(e).length){setErrors(e);return;}
    setLoading("email");
    setTimeout(()=>{setLoading(null);onAuth({name:tab==="signup"?name:"Demo User",email,avatar:"✨",plan:"none"});},1400);
  };

  return (
    <>
      {showTermsModal && <TermsModal onClose={()=>setShowTermsModal(false)}/>}

      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",background:C.bg}}>
        <div style={{textAlign:"center",marginBottom:32,animation:"fadeUp 0.5s ease"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,letterSpacing:3,color:"#fff",lineHeight:1}}>👻 GHOSTWRITERME</div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:"0.2em",marginTop:6}}>AI WRITING SUITE · EST. 2026</div>
        </div>

        <div style={{width:"100%",maxWidth:400,background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"30px 26px",animation:"fadeUp 0.5s 0.1s ease both",boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}}>
          {/* Tab switcher */}
          <div style={{display:"flex",background:C.surface,borderRadius:10,padding:4,marginBottom:24}}>
            {["signin","signup"].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setShowEmail(false);setErrors({});setAgreedTerms(false);setAge("");}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:tab===t?C.purple:"transparent",color:tab===t?"#fff":C.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
                {t==="signin"?"Sign In":"Create Account"}
              </button>
            ))}
          </div>

          {!showEmail ? (
            <>
              <div style={{fontSize:17,fontWeight:800,color:"#fff",marginBottom:4}}>{tab==="signin"?"Welcome back 👋":"Join GhostwriterMe"}</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:22,lineHeight:1.6}}>{tab==="signin"?"Sign in to access your AI writing suite.":"Start free — no credit card needed."}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {SOCIAL_PROVIDERS.map(s=>(
                  <button key={s.id} onClick={()=>handleSocial(s.id)} disabled={!!loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,padding:"13px",borderRadius:10,border:s.border||"none",background:s.bg,color:s.color,fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",transition:"opacity 0.2s,transform 0.15s",opacity:loading&&loading!==s.id?0.4:1,fontFamily:"inherit"}}
                    onMouseEnter={e=>{if(!loading)e.currentTarget.style.transform="scale(1.015)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                  >
                    {loading===s.id?<Spinner color={s.color==="#fff"?"#fff":"#333"}/>:s.icon}
                    {loading===s.id?"Connecting...":s.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{animation:"slideIn 0.3s ease"}}>
              <button onClick={()=>setShowEmail(false)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>← Back</button>
              <div style={{fontSize:17,fontWeight:800,color:"#fff",marginBottom:20}}>{tab==="signin"?"Sign in with email":"Sign up with email"}</div>

              {tab==="signup" && (
                <>
                  <FormInput label="Full Name" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} error={errors.name} iconLeft="👤"/>
                  {/* Age field */}
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase"}}>Your Age</label>
                    <div style={{position:"relative"}}>
                      <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}}>🎂</span>
                      <input
                        type="number"
                        min="1" max="120"
                        placeholder="e.g. 25"
                        value={age}
                        onChange={e=>setAge(e.target.value)}
                        style={{width:"100%",background:C.surface,border:`1px solid ${errors.age?C.red:C.border}`,borderRadius:10,padding:"12px 14px 12px 42px",color:C.text,fontSize:14,transition:"border-color 0.2s"}}
                        onFocus={e=>e.target.style.borderColor=errors.age?C.red:C.purple}
                        onBlur={e=>e.target.style.borderColor=errors.age?C.red:C.border}
                      />
                    </div>
                    {errors.age && <div style={{fontSize:11,color:C.red,marginTop:4}}>{errors.age}</div>}
                    <div style={{fontSize:10,color:C.muted,marginTop:4}}>Must be 13 or older to use GhostwriterMe</div>
                  </div>
                </>
              )}

              <FormInput label="Email" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} error={errors.email} iconLeft="✉️"/>
              <FormInput label="Password" type={showPw?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPass(e.target.value)} error={errors.password} iconLeft="🔒" iconRight={showPw?"🙈":"👁️"} onIconRightClick={()=>setShowPw(!showPw)}/>
              {tab==="signin"&&<div style={{textAlign:"right",marginTop:-8,marginBottom:16}}><span style={{fontSize:12,color:C.purple,cursor:"pointer"}}>Forgot password?</span></div>}

              {/* Terms & Conditions checkbox (signup only) */}
              {tab==="signup" && (
                <div style={{marginBottom:16}}>
                  <div
                    onClick={()=>{setAgreedTerms(!agreedTerms);if(errors.terms)setErrors({...errors,terms:""});}}
                    style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:agreedTerms?"rgba(139,92,246,0.08)":C.surface,border:`1px solid ${errors.terms?C.red:agreedTerms?C.purple:C.border}`,borderRadius:10,cursor:"pointer",transition:"all 0.15s"}}
                  >
                    {/* Custom checkbox */}
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${agreedTerms?C.purple:errors.terms?C.red:C.border}`,background:agreedTerms?C.purple:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                      {agreedTerms && <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                    </div>
                    <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                      I have read and agree to the{" "}
                      <span
                        onClick={e=>{e.stopPropagation();setShowTermsModal(true);}}
                        style={{color:C.purple,fontWeight:600,textDecoration:"underline",cursor:"pointer"}}
                      >
                        Terms & Conditions
                      </span>{" "}
                      and{" "}
                      <span style={{color:C.purple,fontWeight:600,textDecoration:"underline",cursor:"pointer"}}>Privacy Policy</span>
                    </div>
                  </div>
                  {errors.terms && <div style={{fontSize:11,color:C.red,marginTop:4}}>{errors.terms}</div>}
                </div>
              )}

              <PrimaryBtn loading={loading==="email"} onClick={handleEmailSubmit}>{tab==="signin"?"Sign In →":"Create Account →"}</PrimaryBtn>
            </div>
          )}

          <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:18,lineHeight:1.7}}>
            By continuing you agree to our{" "}
            <span onClick={()=>setShowTermsModal(true)} style={{color:C.purple,cursor:"pointer"}}>Terms</span>{" "}
            &amp;{" "}
            <span style={{color:C.purple,cursor:"pointer"}}>Privacy Policy</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: PLAN
// ═══════════════════════════════════════════════════════════════════════════════
function PlanScreen({user,onPlan}) {
  const [billing,setBilling] = useState("monthly");
  const monthly=249, yearly=Math.round(monthly*0.7);

  const FREE_FEATURES  = ["3 AI replies/day","All 4 reply tones","Don't Sound Desperate mode","📧 Email Mode (full access)"];
  const PRO_FEATURES   = ["Unlimited AI replies","📧 Email Mode","✍️ Essay Writer (A1–C2 CEFR)","🎓 Academic Mode + auto-citations","✅ Grammar Check + rewrite","💼 CV / Resume Builder","📖 Author Mode (fiction + non-fiction)","Personality learning AI","Priority generation speed"];

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"32px 20px 80px",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:460}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28,animation:"fadeUp 0.4s ease"}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{user.avatar}</div>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Hey, {user.name.split(" ")[0]} 👋</div><div style={{fontSize:11,color:C.muted}}>{user.email}</div></div>
        </div>

        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:1,color:"#fff",lineHeight:1.1,marginBottom:8,animation:"fadeUp 0.4s 0.05s ease both"}}>CHOOSE YOUR PLAN</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24,animation:"fadeUp 0.4s 0.1s ease both"}}>Free gives you Replies + Email. Pro unlocks the full suite.</div>

        <div style={{display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:4,marginBottom:22,animation:"fadeUp 0.4s 0.12s ease both"}}>
          {[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly — Save 30%"}].map(b=>(
            <button key={b.id} onClick={()=>setBilling(b.id)} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:billing===b.id?C.purple:"transparent",color:billing===b.id?"#fff":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>
          ))}
        </div>

        <Card style={{marginBottom:14,animation:"fadeUp 0.4s 0.18s ease both"}}>
          <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:6}}>Free</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:"#fff",letterSpacing:1,marginBottom:16}}>฿0 <span style={{fontSize:14,color:C.muted,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400}}>/ forever</span></div>
          <ul style={{listStyle:"none",marginBottom:20,display:"flex",flexDirection:"column",gap:7}}>
            {FREE_FEATURES.map(f=><li key={f} style={{fontSize:13,color:C.muted,display:"flex",alignItems:"flex-start",gap:8}}><span style={{color:C.green,flexShrink:0}}>✓</span>{f}</li>)}
            {["Essay Writer","Academic Mode","Grammar Check","CV / Resume Builder","Author Mode"].map(f=><li key={f} style={{fontSize:13,color:"#2a2a3a",display:"flex",gap:8}}><span style={{color:"#2a2a3a"}}>✕</span>{f}</li>)}
          </ul>
          <SecondaryBtn onClick={()=>onPlan("free",null)}>Continue Free</SecondaryBtn>
        </Card>

        <div style={{background:`linear-gradient(160deg,rgba(76,29,149,0.28),${C.card})`,border:`1px solid ${C.purple}`,borderRadius:16,padding:"24px",position:"relative",overflow:"hidden",animation:"fadeUp 0.4s 0.22s ease both",boxShadow:"0 0 48px rgba(139,92,246,0.18)"}}>
          <div style={{position:"absolute",top:-1,right:20,background:`linear-gradient(135deg,${C.purple},${C.accent})`,color:"#fff",fontSize:10,fontWeight:700,letterSpacing:"0.1em",padding:"4px 14px",borderRadius:"0 0 8px 8px"}}>MOST POPULAR</div>
          <div style={{fontSize:11,letterSpacing:"0.12em",color:C.purple,textTransform:"uppercase",marginBottom:6}}>Pro</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:"#fff",letterSpacing:1,marginBottom:2}}>฿{billing==="monthly"?monthly:yearly} <span style={{fontSize:14,color:C.muted,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400}}>/ month</span></div>
          {billing==="yearly"&&<div style={{fontSize:11,color:C.green,marginBottom:10}}>Billed ฿{yearly*12}/yr · Save ฿{(monthly-yearly)*12}</div>}
          <div style={{fontSize:11,color:C.muted,marginBottom:16}}>≈ $7 USD / month</div>
          <ul style={{listStyle:"none",marginBottom:18,display:"flex",flexDirection:"column",gap:7}}>
            {PRO_FEATURES.map(f=><li key={f} style={{fontSize:13,color:C.text,display:"flex",alignItems:"flex-start",gap:8}}><span style={{color:C.green,flexShrink:0,marginTop:1}}>✓</span>{f}</li>)}
          </ul>
          <div style={{background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🎁</span>
            <div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>3-day free trial included</div><div style={{fontSize:11,color:C.muted}}>No charge until day 4. Cancel anytime.</div></div>
          </div>
          <PrimaryBtn onClick={()=>onPlan("pro",billing)}>Start Free Trial → Choose Payment</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN: PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════
function PaymentScreen({user,billing,onComplete}) {
  const [region,setRegion]   = useState("thai");
  const [method,setMethod]   = useState(null);
  const [step,setStep]       = useState("method");
  const [loading,setLoading] = useState(false);
  const [card,setCard]       = useState({number:"",name:"",expiry:"",cvv:""});
  const [cardErrors,setCardErrors] = useState({});
  const [tmPhone,setTmPhone] = useState("");
  const price = billing==="yearly"?174:249;

  const THAI_METHODS = [
    {id:"promptpay",label:"PromptPay",       icon:"🇹🇭",desc:"Scan QR with any banking app",  color:"#1e40af"},
    {id:"truemoney", label:"TrueMoney Wallet",icon:"🧡",desc:"Pay with TrueMoney balance",    color:"#ea580c"},
  ];
  const INTL_METHODS = [
    {id:"card",     label:"Credit / Debit Card",icon:"💳",desc:"Visa, Mastercard accepted",  color:C.purpleD},
    {id:"applepay", label:"Apple Pay",           icon:"🍎",desc:"Face ID or Touch ID",        color:"#111"},
    {id:"paypal",   label:"PayPal",              icon:"🅿️",desc:"Pay with PayPal balance",    color:"#003087"},
  ];

  const fmt4  = v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp= v=>{const n=v.replace(/\D/g,"").slice(0,4);return n.length>2?n.slice(0,2)+"/"+n.slice(2):n;};
  const brand = n=>{const d=n.replace(/\s/g,"");if(d.startsWith("4"))return"VISA";if(d.startsWith("5"))return"MC";return null;};

  const validateCard = () => {
    const e={};
    if(card.number.replace(/\s/g,"").length<16)e.number="Enter valid 16-digit number";
    if(!card.name.trim())e.name="Cardholder name required";
    if(card.expiry.length<5)e.expiry="Enter MM/YY";
    if(card.cvv.length<3)e.cvv="3-digit CVV";
    setCardErrors(e); return Object.keys(e).length===0;
  };

  const handlePay = () => {
    if(method==="card"&&!validateCard())return;
    setLoading(true);
    setTimeout(()=>{setLoading(false);setStep("success");},2000);
  };

  const b = brand(card.number);

  if(step==="success") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:C.bg}}>
      <div style={{textAlign:"center",maxWidth:360,animation:"fadeUp 0.5s ease"}}>
        <div style={{fontSize:80,marginBottom:16,animation:"glow 2s ease infinite"}}>🎉</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:"#fff",letterSpacing:2,marginBottom:8}}>YOU'RE IN!</div>
        <div style={{fontSize:14,color:C.muted,lineHeight:1.8,marginBottom:28}}>Your 3-day free trial has started.<br/>All 7 features are now unlocked. 🚀</div>
        <Card style={{marginBottom:24,textAlign:"left"}}>
          <div style={{fontSize:11,letterSpacing:"0.1em",color:C.muted,marginBottom:14,textTransform:"uppercase"}}>Order Summary</div>
          {[["Account",user.email],["Plan","Pro — 3-Day Free Trial"],["Then",`฿${price}/month`],["Payment",method==="promptpay"?"PromptPay":method==="truemoney"?"TrueMoney":method==="card"?`Card ···${card.number.slice(-4)}`:method==="applepay"?"Apple Pay":"PayPal"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:9}}>
              <span style={{color:C.muted}}>{k}</span><span style={{color:"#fff",fontWeight:600}}>{v}</span>
            </div>
          ))}
        </Card>
        <PrimaryBtn onClick={onComplete}>Enter the App →</PrimaryBtn>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"28px 20px 80px",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:460}}>
        <div style={{marginBottom:24}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:"#fff",letterSpacing:1}}>PAYMENT</div><div style={{fontSize:12,color:C.muted}}>Secure checkout · SSL encrypted · Cancel anytime</div></div>

        <Card style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>GhostwriterMe Pro</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{billing==="yearly"?"Annual":"Monthly"} · after free trial</div></div>
            <div style={{textAlign:"right"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"#fff",letterSpacing:1}}>฿{price}<span style={{fontSize:13,color:C.muted}}>/mo</span></div><div style={{fontSize:10,color:C.green}}>Today: ฿0.00 ✓</div></div>
          </div>
        </Card>

        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>Your Region</div>
          <div style={{display:"flex",gap:10}}>
            {[{id:"thai",flag:"🇹🇭",label:"Thailand"},{id:"intl",flag:"🌍",label:"International"}].map(r=>(
              <button key={r.id} onClick={()=>{setRegion(r.id);setMethod(null);}} style={{flex:1,padding:"11px",borderRadius:10,background:region===r.id?"rgba(139,92,246,0.15)":C.card,border:`1px solid ${region===r.id?C.purple:C.border}`,color:region===r.id?"#fff":C.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span>{r.flag}</span>{r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(region==="thai"?THAI_METHODS:INTL_METHODS).map(m=>(
              <button key={m.id} onClick={()=>setMethod(m.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px",background:method===m.id?"rgba(139,92,246,0.1)":C.card,border:`1px solid ${method===m.id?C.purple:C.border}`,borderRadius:12,cursor:"pointer",transition:"all 0.2s",textAlign:"left",fontFamily:"inherit"}}>
                <div style={{width:44,height:44,borderRadius:10,flexShrink:0,background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{m.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{m.label}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.desc}</div></div>
                {method===m.id&&<div style={{width:22,height:22,borderRadius:"50%",background:C.purple,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:12,color:"#fff"}}>✓</span></div>}
              </button>
            ))}
          </div>
        </div>

        {method==="promptpay"&&(
          <Card style={{marginBottom:18,textAlign:"center",animation:"slideIn 0.3s ease"}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Scan with any Thai banking app</div>
            <div style={{width:180,height:180,margin:"0 auto 14px",background:"#fff",borderRadius:12,padding:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                {Array.from({length:11}).map((_,r)=>Array.from({length:11}).map((_,c)=>((r+c)%2===0||Math.random()>0.5)&&<rect key={`${r}-${c}`} x={c*14+2} y={r*14+2} width={12} height={12} fill="#13131f"/>))}
                <rect x="2" y="2" width="38" height="38" rx="3" fill="none" stroke="#13131f" strokeWidth="4"/>
                <rect x="10" y="10" width="22" height="22" rx="2" fill="#13131f"/>
                <rect x="120" y="2" width="38" height="38" rx="3" fill="none" stroke="#13131f" strokeWidth="4"/>
                <rect x="128" y="10" width="22" height="22" rx="2" fill="#13131f"/>
                <rect x="2" y="120" width="38" height="38" rx="3" fill="none" stroke="#13131f" strokeWidth="4"/>
                <rect x="10" y="128" width="22" height="22" rx="2" fill="#13131f"/>
              </svg>
            </div>
            <div style={{fontSize:12,color:C.muted}}>PromptPay Ref</div>
            <div style={{fontSize:17,fontWeight:700,color:"#fff",letterSpacing:"0.12em",marginTop:4}}>0812-345-678</div>
            <div style={{fontSize:11,color:C.muted,marginTop:8}}>Amount: <strong style={{color:"#fff"}}>฿0.00 today (trial)</strong></div>
          </Card>
        )}
        {method==="truemoney"&&(
          <Card style={{marginBottom:18,animation:"slideIn 0.3s ease"}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Enter your TrueMoney registered number</div>
            <FormInput label="Phone Number" placeholder="0812345678" iconLeft="📱" value={tmPhone} onChange={e=>setTmPhone(e.target.value.replace(/\D/g,"").slice(0,10))}/>
            <div style={{fontSize:11,color:C.muted}}>You'll receive an OTP to confirm. No charge for 3 days.</div>
          </Card>
        )}
        {method==="card"&&(
          <Card style={{marginBottom:18,animation:"slideIn 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:12,color:C.muted}}>Card details</div>
              <div style={{display:"flex",gap:6}}>{["VISA","MC"].map(br=><div key={br} style={{background:b===br?"#fff":"#1e1e30",border:`1px solid ${b===br?"#fff":C.border}`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,color:b===br?"#1a1a2e":C.muted}}>{br}</div>)}</div>
            </div>
            <FormInput label="Card Number" placeholder="1234 5678 9012 3456" iconLeft="💳" value={card.number} onChange={e=>setCard({...card,number:fmt4(e.target.value)})} error={cardErrors.number}/>
            <FormInput label="Cardholder Name" placeholder="As shown on card" iconLeft="👤" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} error={cardErrors.name}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FormInput label="Expiry" placeholder="MM/YY" value={card.expiry} onChange={e=>setCard({...card,expiry:fmtExp(e.target.value)})} error={cardErrors.expiry}/>
              <FormInput label="CVV" type="password" placeholder="•••" value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value.replace(/\D/g,"").slice(0,4)})} error={cardErrors.cvv}/>
            </div>
            <div style={{fontSize:11,color:C.muted}}>🔒 Processed by Stripe. We never store your card.</div>
          </Card>
        )}
        {method==="applepay"&&<Card style={{marginBottom:18,textAlign:"center",animation:"slideIn 0.3s ease"}}><div style={{fontSize:36,marginBottom:10}}>🍎</div><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:6}}>Apple Pay</div><div style={{fontSize:12,color:C.muted}}>Authenticate with Face ID or Touch ID.</div></Card>}
        {method==="paypal"&&<Card style={{marginBottom:18,textAlign:"center",animation:"slideIn 0.3s ease"}}><div style={{fontSize:36,marginBottom:10}}>🅿️</div><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:6}}>PayPal</div><div style={{fontSize:12,color:C.muted}}>You'll be redirected to PayPal to approve.</div></Card>}

        {method&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <PrimaryBtn loading={loading} onClick={handlePay}>
              {method==="promptpay"?"I've Completed the QR Payment ✓":method==="truemoney"?"Send OTP & Confirm →":method==="applepay"?"Confirm with Apple Pay":method==="paypal"?"Continue to PayPal →":"Confirm & Start Free Trial →"}
            </PrimaryBtn>
            <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:10}}>🔒 Secure · No charge for 3 days · Cancel anytime</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 1: AI REPLIES
// ═══════════════════════════════════════════════════════════════════════════════
function ReplyMode({isPro}) {
  const [message,setMessage] = useState("");
  const [tone,setTone]       = useState("confident");
  const [noDesp,setNoDesp]   = useState(false);
  const [replies,setReplies] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError]     = useState("");
  const [used,setUsed]       = useState(0);
  const FREE_LIMIT = 3;
  const ref = useRef(null);

  const generate = async () => {
    if(!message.trim())return;
    if(!isPro&&used>=FREE_LIMIT){setError(`Free plan: ${FREE_LIMIT} replies/day used. Upgrade to Pro for unlimited.`);return;}
    setLoading(true);setError("");setReplies([]);
    const toneObj=TONES.find(t=>t.id===tone);
    const sys=`You are GhostwriterMe — emotionally intelligent, witty, socially calibrated. Never robotic. No em-dashes. No clichés. ${noDesp?"IMPORTANT: Strip ALL desperate/clingy energy. Unbothered, high-value only.":""} Tone: ${toneObj.label} — ${toneObj.desc} Return ONLY valid JSON: {"replies":[{"option":1,"text":"...","vibe":"one-word"},{"option":2,"text":"...","vibe":"one-word"},{"option":3,"text":"...","vibe":"one-word"}]}`;
    try {
      const raw=await callClaude(sys,`Message received:\n"${message}"`,1000);
      const p=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setReplies(p.replies||[]);setUsed(u=>u+1);
      setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),100);
    } catch{setError("Something went wrong. Try again.");}
    finally{setLoading(false);}
  };

  return (
    <div>
      {!isPro&&<div style={{background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:C.muted}}>{FREE_LIMIT-used} free {FREE_LIMIT-used===1?"reply":"replies"} left today</span>
        <span style={{fontSize:11,color:C.purple,fontWeight:600}}>Upgrade for unlimited →</span>
      </div>}
      <GWTextarea label="Paste the Message" placeholder={`"hey, you free this weekend?"\n"we need to talk about your performance…"\nPaste anything stressing you out 💀`} value={message} onChange={e=>setMessage(e.target.value)} rows={4}/>
      <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10,marginTop:4}}>Pick Your Energy</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {TONES.map(t=>(
          <button key={t.id} onClick={()=>setTone(t.id)} style={{background:tone===t.id?"rgba(139,92,246,0.18)":C.surface,border:`1px solid ${tone===t.id?C.purple:C.border}`,borderRadius:10,padding:"11px 12px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
            <div style={{fontSize:18}}>{t.emoji}</div>
            <div style={{fontSize:13,fontWeight:600,marginTop:4}}>{t.label}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.desc}</div>
          </button>
        ))}
      </div>
      <div onClick={()=>setNoDesp(!noDesp)} style={{background:noDesp?"rgba(139,92,246,0.1)":C.surface,border:`1px solid ${noDesp?C.purple:C.border}`,borderRadius:10,padding:"13px 15px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.15s",marginBottom:16}}>
        <div><div style={{fontSize:13,fontWeight:600}}>💀 Don't Sound Desperate Mode</div><div style={{fontSize:11,color:C.muted,marginTop:3}}>Strips all clingy energy. Unbothered only.</div></div>
        <Toggle on={noDesp} onClick={()=>setNoDesp(!noDesp)}/>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!message.trim()}>✍️ Generate Replies</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {replies.length>0&&(
        <div ref={ref} style={{marginTop:24,animation:"fadeUp 0.4s ease"}}>
          <Tag style={{marginBottom:12,display:"block"}}>Your replies — pick one, send it</Tag>
          {replies.map((r,i)=>(
            <Card key={i} style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Tag color={C.accent}>{r.vibe}</Tag><span style={{fontSize:11,color:C.muted}}>Option {r.option}</span></div>
              <div style={{fontSize:14,lineHeight:1.7,color:C.text}}>{r.text}</div>
              <CopyBtn text={r.text}/>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 2: EMAIL MODE
// ═══════════════════════════════════════════════════════════════════════════════
function EmailMode() {
  const [emailType,setEmailType] = useState("professional");
  const [context,setContext]     = useState("");
  const [recipient,setRecipient] = useState("");
  const [keyPoints,setKeyPoints] = useState("");
  const [tone,setTone]           = useState("professional");
  const [length,setLength]       = useState("medium");
  const [result,setResult]       = useState(null);
  const [loading,setLoading]     = useState(false);
  const [error,setError]         = useState("");

  const generate = async () => {
    if(!context.trim())return;
    setLoading(true);setError("");setResult(null);
    const eObj=EMAIL_TYPES.find(e=>e.id===emailType);
    const tObj=TONES.find(t=>t.id===tone);
    const wordTarget={short:"~80 words",medium:"~150 words",long:"~250 words"}[length];
    const sys=`You are an expert professional email writer. Write clear, effective, human-sounding emails — never robotic or over-formal. Return ONLY valid JSON: {"subject":"email subject line","body":"full email body with greeting and sign-off","tip":"one short tactical tip for sending this email"}`;
    const prompt=`Write a ${eObj.label} email. Situation/context: ${context} ${recipient?"Recipient: "+recipient:""} ${keyPoints?"Key points to include: "+keyPoints:""} Tone: ${tObj.label} — ${tObj.desc} Length: ${wordTarget} Write a natural, compelling email.`;
    try {
      const raw=await callClaude(sys,prompt,1000);
      setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    } catch{setError("Something went wrong. Try again.");}
    finally{setLoading(false);}
  };

  return (
    <div>
      <div style={{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
        <FreeBadge/><span style={{fontSize:12,color:C.muted}}>Email Mode is free for all users — no limit.</span>
      </div>
      <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>Email Type</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:16}}>
        {EMAIL_TYPES.map(e=>(
          <button key={e.id} onClick={()=>setEmailType(e.id)} style={{background:emailType===e.id?"rgba(139,92,246,0.18)":C.surface,border:`1px solid ${emailType===e.id?C.purple:C.border}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
            <div style={{fontSize:18}}>{e.icon}</div>
            <div style={{fontSize:12,fontWeight:600,marginTop:4}}>{e.label}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{e.desc}</div>
          </button>
        ))}
      </div>
      <GWTextarea label="Situation / Context" placeholder="What's this email about? e.g. Following up on a job interview from last Tuesday at Acme Corp..." value={context} onChange={e=>setContext(e.target.value)} rows={3}/>
      <FormInput label="Recipient (optional)" placeholder="e.g. My manager Sarah, a client, a recruiter..." iconLeft="👤" value={recipient} onChange={e=>setRecipient(e.target.value)}/>
      <GWTextarea label="Key Points to Include (optional)" placeholder="e.g. Ask about timeline, mention my portfolio, offer to jump on a call..." value={keyPoints} onChange={e=>setKeyPoints(e.target.value)} rows={2}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <GWSelect label="Tone" value={tone} onChange={setTone} options={TONES.map(t=>({value:t.id,label:`${t.emoji} ${t.label}`}))}/>
        <GWSelect label="Length" value={length} onChange={setLength} options={[{value:"short",label:"Short (~80 words"},{value:"medium",label:"Medium (~150 words)"},{value:"long",label:"Long (~250 words)"}]}/>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!context.trim()}>📧 Generate Email</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {result&&(
        <div style={{marginTop:22,animation:"fadeUp 0.4s ease"}}>
          <Card style={{marginBottom:12}}>
            <div style={{marginBottom:10}}><Tag color={C.muted}>Subject Line</Tag></div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{result.subject}</div>
            <CopyBtn text={result.subject}/>
          </Card>
          <Card style={{marginBottom:12}}>
            <div style={{marginBottom:10}}><Tag color={C.accent}>Email Body</Tag></div>
            <div style={{fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{result.body}</div>
            <CopyBtn text={result.body}/>
          </Card>
          {result.tip&&<div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"12px 14px",display:"flex",gap:10}}>
            <span style={{fontSize:16}}>💡</span>
            <div style={{fontSize:12,color:C.yellow,lineHeight:1.6}}>{result.tip}</div>
          </div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 3: ESSAY WRITER
// ═══════════════════════════════════════════════════════════════════════════════
function EssayMode() {
  const [topic,setTopic]   = useState("");
  const [details,setDetails] = useState("");
  const [level,setLevel]   = useState("B2");
  const [type,setType]     = useState("Argumentative");
  const [wc,setWc]         = useState("500");
  const [essay,setEssay]   = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError]   = useState("");
  const levelDesc={A1:"Beginner · very simple words",A2:"Elementary · basic everyday",B1:"Intermediate · clear & direct",B2:"Upper-intermediate · nuanced",C1:"Advanced · fluent & flexible",C2:"Mastery · native-like precision"};

  const generate = async () => {
    if(!topic.trim())return;
    setLoading(true);setError("");setEssay("");
    const sys=`You are an expert essay writer. Calibrate precisely to the CEFR level: A1/A2=simple short sentences; B1/B2=intermediate varied structures; C1/C2=advanced complex syntax. Write ONLY the essay. No preamble.`;
    try{const res=await callClaude(sys,`Write a ${type} essay on: "${topic}"\nKey points: ${details||"none"}\nCEFR level: ${level}\nWord count: ~${wc} words`,2000);setEssay(res);}
    catch{setError("Something went wrong. Try again.");}finally{setLoading(false);}
  };

  return (
    <div>
      <GWTextarea label="Essay Topic" placeholder="e.g. The impact of social media on teenage mental health" value={topic} onChange={e=>setTopic(e.target.value)} rows={2}/>
      <GWTextarea label="Key Points to Include (optional)" placeholder="e.g. Statistics on anxiety, comparison with pre-social media era…" value={details} onChange={e=>setDetails(e.target.value)} rows={3}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <GWSelect label="Essay Type" value={type} onChange={setType} options={ESSAY_TYPES}/>
        <GWSelect label="Word Count" value={wc} onChange={setWc} options={["300","500","750","1000","1500","2000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:8}}>English Level (CEFR)</div>
        <div style={{display:"flex",gap:7}}>
          {LEVELS.map(l=><button key={l} onClick={()=>setLevel(l)} style={{flex:1,padding:"9px 4px",borderRadius:8,background:level===l?"rgba(139,92,246,0.2)":C.surface,border:`1px solid ${level===l?C.purple:C.border}`,color:level===l?"#fff":C.muted,fontSize:12,fontWeight:level===l?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}
        </div>
        <div style={{fontSize:11,color:C.muted,marginTop:6}}>{levelDesc[level]}</div>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!topic.trim()}>✍️ Generate Essay</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {essay&&<Card style={{marginTop:20,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><Tag color={C.accent}>{type} · {level} Level</Tag><span style={{fontSize:11,color:C.muted}}>~{essay.split(/\s+/).length} words</span></div><div style={{fontSize:14,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap"}}>{essay}</div><CopyBtn text={essay}/></Card>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 4: ACADEMIC ESSAY
// ═══════════════════════════════════════════════════════════════════════════════
function AcademicMode() {
  const [topic,setTopic]     = useState("");
  const [details,setDetails] = useState("");
  const [citations,setCitations] = useState([{type:"url",value:""}]);
  const [wc,setWc]           = useState("1000");
  const [style,setStyle]     = useState("APA");
  const [essay,setEssay]     = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError]     = useState("");

  const addCite=()=>setCitations([...citations,{type:"url",value:""}]);
  const removeCite=i=>setCitations(citations.filter((_,idx)=>idx!==i));
  const updateCite=(i,f,v)=>{const c=[...citations];c[i]={...c[i],[f]:v};setCitations(c);};

  const generate = async () => {
    if(!topic.trim())return;
    setLoading(true);setError("");setEssay("");
    const citeList=citations.filter(c=>c.value.trim()).map((c,i)=>`[${i+1}] ${c.type==="url"?"URL":"PDF"}: ${c.value}`).join("\n");
    const sys=`You are an expert academic writer. Write scholarly essays at C1/C2 English level. Use ${style} citations. Include full References section. Write ONLY the essay.`;
    try{const res=await callClaude(sys,`Academic essay on: "${topic}"\nArguments: ${details||"none"}\nWord count: ~${wc}\nCitation style: ${style}\n${citeList?`Sources:\n${citeList}`:""}`,2500);setEssay(res);}
    catch{setError("Something went wrong. Try again.");}finally{setLoading(false);}
  };

  return (
    <div>
      <GWTextarea label="Essay Topic / Thesis" placeholder="e.g. The role of AI in modern healthcare diagnostics" value={topic} onChange={e=>setTopic(e.target.value)} rows={2}/>
      <GWTextarea label="Arguments & Key Points" placeholder="e.g. ML diagnostic accuracy, ethical concerns, real-world case studies…" value={details} onChange={e=>setDetails(e.target.value)} rows={3}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <GWSelect label="Citation Style" value={style} onChange={setStyle} options={["APA","MLA","Chicago","Harvard","Vancouver","IEEE"]}/>
        <GWSelect label="Word Count" value={wc} onChange={setWc} options={["500","750","1000","1500","2000","3000"].map(n=>({value:n,label:n+" words"}))}/>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase"}}>Sources to Cite</div>
          <button onClick={addCite} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 12px",color:C.purple,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ Add Source</button>
        </div>
        {citations.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <select value={c.type} onChange={e=>updateCite(i,"type",e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 8px",color:C.text,fontSize:11,fontFamily:"inherit",width:90,flexShrink:0}}>
              <option value="url">🔗 URL</option><option value="pdf">📄 PDF</option>
            </select>
            <input value={c.value} onChange={e=>updateCite(i,"value",e.target.value)} placeholder={c.type==="url"?"https://journal.com/article":"Author, Title, Journal, Year…"} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
            {citations.length>1&&<button onClick={()=>removeCite(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>}
          </div>
        ))}
        <div style={{fontSize:11,color:C.muted}}>Sources will be cited in {style} format with a References section.</div>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!topic.trim()}>🎓 Generate Academic Essay</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {essay&&<Card style={{marginTop:20,animation:"fadeUp 0.4s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><Tag color={C.accent}>Academic · {style} Format</Tag><span style={{fontSize:11,color:C.muted}}>~{essay.split(/\s+/).length} words</span></div><div style={{fontSize:13,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif"}}>{essay}</div><CopyBtn text={essay}/></Card>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 5: GRAMMAR CHECK
// ═══════════════════════════════════════════════════════════════════════════════
function GrammarMode() {
  const [text,setText]     = useState("");
  const [style,setStyle]   = useState("formal");
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError]   = useState("");

  const check = async () => {
    if(!text.trim())return;
    setLoading(true);setError("");setResult(null);
    const sObj=GRAMMAR_STYLES.find(s=>s.id===style);
    const sys=`You are an expert grammar checker. Analyze the text for all errors and rewrite it in the requested style. Return ONLY valid JSON: {"errors":[{"type":"grammar|spelling|punctuation|style","original":"...","fixed":"...","explanation":"brief"}],"rewritten":"full rewritten text","score":0-100,"summary":"one sentence"}`;
    try{const raw=await callClaude(sys,`Check and rewrite in ${sObj.label} style (${sObj.desc}):\n\n"${text}"`,2000);setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));}
    catch{setError("Something went wrong. Try again.");}finally{setLoading(false);}
  };

  const sc=result?(result.score>=80?C.green:result.score>=60?C.yellow:C.red):C.purple;
  return (
    <div>
      <GWTextarea label="Paste Your Text" placeholder="Paste any text — email, essay, message — and we'll check and rewrite it…" value={text} onChange={e=>setText(e.target.value)} rows={6}/>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>Rewrite Style</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {GRAMMAR_STYLES.map(s=>(
            <button key={s.id} onClick={()=>setStyle(s.id)} style={{background:style===s.id?"rgba(139,92,246,0.18)":C.surface,border:`1px solid ${style===s.id?C.purple:C.border}`,borderRadius:10,padding:"13px 8px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
              <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div><div style={{fontSize:12,fontWeight:600}}>{s.label}</div><div style={{fontSize:10,color:C.muted,marginTop:3,lineHeight:1.4}}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <PrimaryBtn onClick={check} loading={loading} disabled={!text.trim()}>✅ Check & Rewrite</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {result&&(
        <div style={{marginTop:20,animation:"fadeUp 0.4s ease"}}>
          <Card style={{marginBottom:12,display:"flex",alignItems:"center",gap:18}}>
            <div style={{width:66,height:66,borderRadius:"50%",border:`3px solid ${sc}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:22,fontWeight:800,color:sc,lineHeight:1}}>{result.score}</span>
              <span style={{fontSize:9,color:C.muted,letterSpacing:"0.1em"}}>SCORE</span>
            </div>
            <div><div style={{fontSize:13,color:C.text,marginBottom:4}}>{result.summary}</div><div style={{fontSize:11,color:C.muted}}>{result.errors?.length||0} issue{result.errors?.length!==1?"s":""} found</div></div>
          </Card>
          {result.errors?.length>0&&(
            <Card style={{marginBottom:12}}>
              <Tag color={C.red}>Issues Found</Tag>
              {result.errors.map((e,i)=>{
                const tc={grammar:C.red,spelling:"#93c5fd",punctuation:C.green,style:"#c4b5fd"}[e.type]||C.muted;
                const bg={grammar:"#450a0a",spelling:"#172554",punctuation:"#1a2e05",style:"#2d1f4a"}[e.type]||"#1e1e30";
                return <div key={i} style={{padding:"11px 0",borderBottom:i<result.errors.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",background:bg,color:tc,padding:"2px 6px",borderRadius:3}}>{e.type}</span>
                  <div style={{display:"flex",gap:8,fontSize:13,marginTop:7,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{color:C.red,textDecoration:"line-through"}}>{e.original}</span>
                    <span style={{color:C.muted}}>→</span>
                    <span style={{color:C.green}}>{e.fixed}</span>
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>{e.explanation}</div>
                </div>;
              })}
            </Card>
          )}
          <Card><Tag color={C.accent}>Rewritten — {GRAMMAR_STYLES.find(s=>s.id===style)?.label} Style</Tag><div style={{fontSize:14,lineHeight:1.9,color:C.text,marginTop:12,whiteSpace:"pre-wrap"}}>{result.rewritten}</div><CopyBtn text={result.rewritten}/></Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 6: CV / RESUME BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
function CVMode() {
  const [jobTitle,setJobTitle]   = useState("");
  const [industry,setIndustry]   = useState("");
  const [experience,setExperience] = useState("");
  const [skills,setSkills]       = useState("");
  const [education,setEducation] = useState("");
  const [achievements,setAchievements] = useState("");
  const [targetRole,setTargetRole] = useState("");
  const [cvStyle,setCvStyle]     = useState("modern");
  const [section,setSection]     = useState("full");
  const [result,setResult]       = useState("");
  const [loading,setLoading]     = useState(false);
  const [error,setError]         = useState("");

  const CV_STYLES = [
    {id:"modern",    icon:"⚡",label:"Modern",    desc:"Clean, ATS-optimized"},
    {id:"executive", icon:"👔",label:"Executive", desc:"Senior, authoritative"},
    {id:"creative",  icon:"🎨",label:"Creative",  desc:"Stand out, personality"},
    {id:"minimal",   icon:"◽",label:"Minimal",   desc:"Simple, elegant"},
  ];

  const generate = async () => {
    if(!jobTitle.trim()&&!experience.trim())return;
    setLoading(true);setError("");setResult("");
    const sys=`You are an expert CV/resume writer and career coach. Write professional, compelling resumes that get interviews. Use strong action verbs, quantify achievements where possible, and tailor to the target role. Format with clear sections using markdown-style headings (## Section). Write ONLY the CV/section content.`;
    const prompt=section==="full"
      ?`Write a complete ${cvStyle} style CV for: Current/Target Job Title: ${jobTitle||"Not specified"} Target Role: ${targetRole||jobTitle||"Not specified"} Industry: ${industry||"Not specified"} Work Experience: ${experience||"Not provided"} Key Skills: ${skills||"Not provided"} Education: ${education||"Not provided"} Key Achievements: ${achievements||"Not provided"} Make it ATS-optimized, compelling, and tailored to the target role. Include: Professional Summary, Work Experience, Education, Skills, and any other relevant sections.`
      :`Write only the ${section} section for a ${cvStyle} CV. Job title: ${jobTitle}. Experience: ${experience}. Skills: ${skills}.`;
    try{const res=await callClaude(sys,prompt,2000);setResult(res);}
    catch{setError("Something went wrong. Try again.");}finally{setLoading(false);}
  };

  return (
    <div>
      <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>CV Style</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:16}}>
        {CV_STYLES.map(s=>(
          <button key={s.id} onClick={()=>setCvStyle(s.id)} style={{background:cvStyle===s.id?"rgba(139,92,246,0.18)":C.surface,border:`1px solid ${cvStyle===s.id?C.purple:C.border}`,borderRadius:10,padding:"11px 12px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
            <div style={{fontSize:18}}>{s.icon}</div>
            <div style={{fontSize:12,fontWeight:600,marginTop:4}}>{s.label}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.desc}</div>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:4}}>
        <div><GWSelect label="Generate" value={section} onChange={setSection} options={[{value:"full",label:"Full CV"},...CV_SECTIONS.map(s=>({value:s,label:s+" only"}))]}/></div>
        <FormInput label="Target Role" placeholder="e.g. Senior Product Manager" value={targetRole} onChange={e=>setTargetRole(e.target.value)} iconLeft="🎯"/>
      </div>
      <FormInput label="Current Job Title" placeholder="e.g. Product Manager at Acme Corp" iconLeft="💼" value={jobTitle} onChange={e=>setJobTitle(e.target.value)}/>
      <FormInput label="Industry" placeholder="e.g. FinTech, Healthcare, E-commerce" iconLeft="🏢" value={industry} onChange={e=>setIndustry(e.target.value)}/>
      <GWTextarea label="Work Experience" placeholder="List your roles: Company, title, years, key responsibilities and achievements. The more detail, the better." value={experience} onChange={e=>setExperience(e.target.value)} rows={4}/>
      <GWTextarea label="Key Skills" placeholder="e.g. Python, project management, Figma, data analysis, leadership, Agile..." value={skills} onChange={e=>setSkills(e.target.value)} rows={2}/>
      <GWTextarea label="Education" placeholder="e.g. BSc Computer Science, Chulalongkorn University, 2019–2023" value={education} onChange={e=>setEducation(e.target.value)} rows={2}/>
      <GWTextarea label="Key Achievements (optional)" placeholder="e.g. Grew revenue 40%, managed team of 12, launched 3 products..." value={achievements} onChange={e=>setAchievements(e.target.value)} rows={2}/>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!jobTitle.trim()&&!experience.trim()}>💼 Build My CV</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {result&&(
        <Card style={{marginTop:20,animation:"fadeUp 0.4s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Tag color={C.accent}>{cvStyle.charAt(0).toUpperCase()+cvStyle.slice(1)} CV · {section==="full"?"Full Document":section}</Tag>
            <span style={{fontSize:11,color:C.muted}}>~{result.split(/\s+/).length} words</span>
          </div>
          <div style={{fontSize:13,lineHeight:1.9,color:C.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif"}}>{result}</div>
          <CopyBtn text={result}/>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 7: AUTHOR MODE
// ═══════════════════════════════════════════════════════════════════════════════
function AuthorMode() {
  const [category,setCategory] = useState("fiction");
  const [genre,setGenre]       = useState("fantasy");
  const [nfGenre,setNfGenre]   = useState("memoir");
  const [prompt,setPrompt]     = useState("");
  const [chars,setChars]       = useState("");
  const [setting,setSetting]   = useState("");
  const [outputType,setOutputType] = useState("scene");
  const [length,setLength]     = useState("medium");
  const [pov,setPov]           = useState("third");
  const [result,setResult]     = useState("");
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState("");

  const OUTPUT_TYPES = [
    {id:"scene",     label:"Scene",        desc:"A full narrative scene"},
    {id:"opening",   label:"Opening",      desc:"Hook the reader instantly"},
    {id:"chapter",   label:"Chapter",      desc:"Full chapter (longer)"},
    {id:"outline",   label:"Plot Outline", desc:"Story structure plan"},
    {id:"character", label:"Character",    desc:"Character profile & voice"},
    {id:"dialogue",  label:"Dialogue",     desc:"Conversation scene"},
  ];

  const activeGenre = category==="fiction"
    ? FICTION_GENRES.find(g=>g.id===genre)
    : NONFICTION_GENRES.find(g=>g.id===nfGenre);

  const wordTarget={short:"~300 words",medium:"~600 words",long:"~1200 words"}[length];

  const generate = async () => {
    if(!prompt.trim())return;
    setLoading(true);setError("");setResult("");
    const isFiction=category==="fiction";
    const sys=isFiction
      ?`You are a master fiction author with expertise in ${activeGenre?.label} writing. Write vivid, compelling fiction that shows rather than tells. Use rich sensory detail, authentic dialogue, and emotional depth. Match the conventions and tropes of the ${activeGenre?.label} genre while bringing a fresh, original voice. Write ONLY the requested content — no explanations or preamble.`
      :`You are an award-winning non-fiction author specializing in ${activeGenre?.label}. Write authentic, engaging non-fiction that reads with narrative pull. Use vivid detail, personal voice, and clear structure. Write ONLY the requested content — no explanations.`;

    const prompt_full=`Write a ${outputType==="chapter"?"full chapter":outputType} in the ${activeGenre?.label} ${isFiction?"genre":"style"}.
${prompt}
${chars?"Characters/People: "+chars:""}
${setting?"Setting/Context: "+setting:""}
${isFiction?"Point of view: "+{first:"First person (I/me)",third:"Third person limited",omniscient:"Third person omniscient"}[pov]:""}
Target length: ${wordTarget}
${isFiction?`Make it feel like a published ${activeGenre?.label} novel — gripping, authentic, genre-appropriate.`:`Make it feel like a published ${activeGenre?.label} book — compelling, honest, and beautifully written.`}`;

    try{const res=await callClaude(sys,prompt_full,2500);setResult(res);}
    catch{setError("Something went wrong. Try again.");}finally{setLoading(false);}
  };

  return (
    <div>
      <div style={{display:"flex",background:C.surface,borderRadius:10,padding:4,marginBottom:18}}>
        {[{id:"fiction",label:"📖 Fiction"},{id:"nonfiction",label:"📰 Non-Fiction"}].map(c=>(
          <button key={c.id} onClick={()=>setCategory(c.id)} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:category===c.id?C.purple:"transparent",color:category===c.id?"#fff":C.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{c.label}</button>
        ))}
      </div>
      <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>Genre</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {(category==="fiction"?FICTION_GENRES:NONFICTION_GENRES).map(g=>{
          const active=category==="fiction"?genre===g.id:nfGenre===g.id;
          return (
            <button key={g.id} onClick={()=>category==="fiction"?setGenre(g.id):setNfGenre(g.id)} style={{background:active?"rgba(139,92,246,0.18)":C.surface,border:`1px solid ${active?C.purple:C.border}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",color:C.text,fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22,flexShrink:0}}>{g.icon}</span>
              <div><div style={{fontSize:12,fontWeight:600}}>{g.label}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>{g.desc}</div></div>
            </button>
          );
        })}
      </div>
      <div style={{fontSize:11,letterSpacing:"0.12em",color:C.muted,textTransform:"uppercase",marginBottom:10}}>What to Generate</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {OUTPUT_TYPES.map(o=>(
          <button key={o.id} onClick={()=>setOutputType(o.id)} style={{background:outputType===o.id?"rgba(139,92,246,0.18)":C.surface,border:`1px solid ${outputType===o.id?C.purple:C.border}`,borderRadius:9,padding:"10px 8px",cursor:"pointer",textAlign:"center",color:C.text,fontFamily:"inherit",transition:"all 0.15s"}}>
            <div style={{fontSize:12,fontWeight:600}}>{o.label}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:3,lineHeight:1.4}}>{o.desc}</div>
          </button>
        ))}
      </div>
      <GWTextarea label={category==="fiction"?"Story Prompt / Scene Brief":"Topic / Piece Brief"} placeholder={category==="fiction"?"e.g. A young mage discovers a forbidden spell that can rewrite memories, but using it has a cost she didn't anticipate...":"e.g. The day I realized I had been living someone else's life — a memoir piece about my career change at 35..."} value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3}/>
      <GWTextarea label={category==="fiction"?"Characters (optional)":"People / Subjects (optional)"} placeholder={category==="fiction"?"e.g. Kira — 23, skeptical, sarcastic. Master Chen — ancient, cryptic.":"e.g. My father, my old boss, myself at 25..."} value={chars} onChange={e=>setChars(e.target.value)} rows={2}/>
      <GWTextarea label={category==="fiction"?"Setting (optional)":"Context / Setting (optional)"} placeholder={category==="fiction"?"e.g. A floating island city above the clouds, steampunk-inspired, 1920s aesthetic":"e.g. Rural Thailand, 2018. My grandmother's kitchen."} value={setting} onChange={e=>setSetting(e.target.value)} rows={2}/>
      <div style={{display:"grid",gridTemplateColumns:category==="fiction"?"1fr 1fr 1fr":"1fr 1fr",gap:14,marginBottom:16}}>
        <GWSelect label="Length" value={length} onChange={setLength} options={[{value:"short",label:"Short (~300w)"},{value:"medium",label:"Medium (~600w)"},{value:"long",label:"Long (~1200w)"}]}/>
        {category==="fiction"&&<GWSelect label="Point of View" value={pov} onChange={setPov} options={[{value:"first",label:"First Person"},{value:"third",label:"Third Limited"},{value:"omniscient",label:"Omniscient"}]}/>}
        <GWSelect label="Output" value={outputType} onChange={setOutputType} options={OUTPUT_TYPES.map(o=>({value:o.id,label:o.label}))}/>
      </div>
      <PrimaryBtn onClick={generate} loading={loading} disabled={!prompt.trim()}>📖 Generate {outputType.charAt(0).toUpperCase()+outputType.slice(1)}</PrimaryBtn>
      {error&&<ErrorBox msg={error}/>}
      {result&&(
        <Card style={{marginTop:22,animation:"fadeUp 0.4s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Tag color={C.accent}>{activeGenre?.label} · {outputType.charAt(0).toUpperCase()+outputType.slice(1)}</Tag>
            <span style={{fontSize:11,color:C.muted}}>~{result.split(/\s+/).length} words</span>
          </div>
          <div style={{fontSize:14,lineHeight:2,color:C.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif",fontStyle:"italic"}}>{result}</div>
          <CopyBtn text={result}/>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function TrialModal({mode, onStartTrial, onDismiss}) {
  const [billing, setBilling] = useState("monthly");
  const monthly=249, yearly=Math.round(monthly*0.7);

  const HIGHLIGHTS = {
    essay:    {icon:"✍️",  title:"Essay Writer",   perks:["A1–C2 CEFR English levels","6 essay types","Word count control","Instant generation"]},
    academic: {icon:"🎓", title:"Academic Essay",  perks:["APA, MLA, Chicago & more","Paste URLs or PDFs to cite","Auto-references section","C1/C2 academic English"]},
    cv:       {icon:"💼", title:"CV / Resume Builder", perks:["4 CV styles (Modern, Executive…)","ATS-optimised output","Section-by-section or full CV","Tailored to your target role"]},
    author:   {icon:"📖", title:"Author Mode",     perks:["8 fiction genres + 4 non-fiction","Scene, chapter, outline & more","POV selector","Literary-quality prose"]},
  };

  const h = HIGHLIGHTS[mode] || HIGHLIGHTS.essay;

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",animation:"fadeUp 0.2s ease"}}
      onClick={e=>{if(e.target===e.currentTarget)onDismiss();}}>
      <div style={{width:"100%",maxWidth:540,background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",animation:"slideUpModal 0.3s ease",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,borderRadius:2,background:C.border,margin:"0 auto 24px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${C.purple},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{h.icon}</div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#fff",letterSpacing:1,lineHeight:1}}>{h.title}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:3}}>Start your 3-day free trial to unlock</div>
          </div>
        </div>
        <div style={{background:C.surface,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
          {h.perks.map(p=>(
            <div key={p} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text,padding:"5px 0"}}>
              <span style={{color:C.green,flexShrink:0}}>✓</span>{p}
            </div>
          ))}
        </div>
        <div style={{display:"flex",background:C.surface,borderRadius:10,padding:4,marginBottom:16}}>
          {[{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly — Save 30%"}].map(b=>(
            <button key={b.id} onClick={()=>setBilling(b.id)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:billing===b.id?C.purple:"transparent",color:billing===b.id?"#fff":C.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{b.label}</button>
          ))}
        </div>
        <div style={{background:`linear-gradient(135deg,rgba(76,29,149,0.3),${C.card})`,border:`1px solid rgba(139,92,246,0.4)`,borderRadius:14,padding:"18px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:"#fff",letterSpacing:1,lineHeight:1}}>
                ฿{billing==="monthly"?monthly:yearly}<span style={{fontSize:14,color:C.muted,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400}}>/mo</span>
              </div>
              {billing==="yearly"&&<div style={{fontSize:11,color:C.green,marginTop:2}}>Save ฿{(monthly-yearly)*12}/year</div>}
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>≈ $7 USD / month</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{background:"rgba(139,92,246,0.15)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:8,padding:"8px 12px"}}>
                <div style={{fontSize:11,color:C.purple,fontWeight:700}}>🎁 3 DAYS FREE</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>No charge until day 4</div>
              </div>
            </div>
          </div>
          <PrimaryBtn onClick={()=>onStartTrial(billing)}>Start 3-Day Free Trial →</PrimaryBtn>
          <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:10}}>Cancel anytime · No charge until day 4</div>
        </div>
        <div style={{fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.7}}>
          Trial unlocks <strong style={{color:C.text}}>all 4 premium modes</strong>: Essay Writer, Academic, CV / Resume & Author Mode
        </div>
        <button onClick={onDismiss} style={{width:"100%",marginTop:16,padding:"12px",borderRadius:10,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function AppShell({user, onStartTrial, onSignOut}) {
  const [mode, setMode]           = useState("reply");
  const [trialModal, setTrialModal] = useState(null);
  const isPro = user.plan === "pro";

  const current = MODES.find(m => m.id === mode);

  const handleTabClick = (m) => {
    if (m.access === "trial" && !isPro) {
      setTrialModal(m.id);
    } else {
      setMode(m.id);
    }
  };

  const handleStartTrial = (billing) => {
    setTrialModal(null);
    onStartTrial(billing);
  };

  const badgeFor = (m) => {
    if (m.access === "free")  return <FreeBadge/>;
    if (m.access === "trial" && !isPro) return <TrialBadge/>;
    if (m.access === "trial" && isPro)  return <FreeBadge/>;
    return <ProBadge/>;
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Plus Jakarta Sans',sans-serif",color:C.text,paddingBottom:80}}>
      {trialModal && (
        <TrialModal
          mode={trialModal}
          onStartTrial={handleStartTrial}
          onDismiss={()=>setTrialModal(null)}
        />
      )}
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(8,8,15,0.93)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:21,color:"#fff",letterSpacing:2,lineHeight:1}}>👻 GHOSTWRITERME</div>
          <div style={{fontSize:9,color:C.muted,letterSpacing:"0.15em"}}>AI WRITING SUITE</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {isPro
            ? <div style={{background:`linear-gradient(135deg,${C.purple},${C.accent})`,borderRadius:20,padding:"4px 13px",fontSize:11,color:"#fff",fontWeight:700}}>✨ PRO TRIAL</div>
            : <button onClick={()=>setTrialModal("essay")} style={{background:"rgba(139,92,246,0.15)",border:`1px solid rgba(139,92,246,0.35)`,borderRadius:20,padding:"5px 13px",fontSize:11,color:C.purple,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Try Pro Free 🎁</button>
          }
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.purple},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer"}} title={user.email}>{user.avatar}</div>
        </div>
      </div>

      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto",scrollbarWidth:"none"}}>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>handleTabClick(m)} style={{flex:1,minWidth:72,background:"transparent",border:"none",borderBottom:`2px solid ${mode===m.id&&(m.access==="free"||isPro)?C.purple:"transparent"}`,padding:"12px 6px 10px",color:mode===m.id&&(m.access==="free"||isPro)?C.text:C.muted,fontFamily:"inherit",fontSize:11,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:17}}>{m.icon}</span>
            <span style={{fontSize:9,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{m.label}</span>
            {badgeFor(m)}
          </button>
        ))}
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"22px 18px 0"}}>
        {isPro && (
          <div style={{background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:20,display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#c4b5fd"}}>
            <span>🎁</span><span>You're on a <strong style={{color:C.accent}}>3-day free trial</strong> — all 7 features unlocked!</span>
          </div>
        )}

        <div style={{animation:"fadeUp 0.3s ease"}}>
          {mode==="reply"    && <ReplyMode isPro={isPro}/>}
          {mode==="email"    && <EmailMode/>}
          {mode==="grammar"  && <GrammarMode/>}
          {mode==="essay"    && <EssayMode/>}
          {mode==="academic" && <AcademicMode/>}
          {mode==="cv"       && <CVMode/>}
          {mode==="author"   && <AuthorMode/>}
        </div>

        <div style={{marginTop:56,paddingTop:20,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,fontSize:11,color:"#2a2a3a"}}>
          <span>👻 GhostwriterMe · 7 AI Writing Modes</span>
          <span onClick={onSignOut} style={{color:C.muted,cursor:"pointer"}}>Sign out</span>
          <span>฿249/month after trial</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function GhostwriterMeApp() {
  const [screen,setScreen]         = useState("auth");  // auth | safety | payment | app
  const [user,setUser]             = useState(null);
  const [billing,setBilling]       = useState("monthly");

  // Auth → safety disclaimer
  const handleAuth = u => {
    setUser({...u, plan:"free"});
    setScreen("safety");
  };

  // Safety accepted → app
  const handleSafetyAccept = () => {
    setScreen("app");
  };

  const handleStartTrial = (bill) => {
    setBilling(bill||"monthly");
    setScreen("payment");
  };

  const handlePayDone = () => {
    setUser(u=>({...u, plan:"pro"}));
    setScreen("app");
  };

  const handleSignOut = () => {
    setUser(null);
    setScreen("auth");
  };

  return (
    <>
      <style>{GLOBAL_CSS + `@keyframes slideUpModal {from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {screen==="auth"    && <AuthScreen onAuth={handleAuth}/>}
      {screen==="safety"  && <SafetyDisclaimerScreen onAccept={handleSafetyAccept}/>}
      {screen==="payment" && <PaymentScreen user={user} billing={billing} onComplete={handlePayDone}/>}
      {screen==="app"     && <AppShell user={user} onStartTrial={handleStartTrial} onSignOut={handleSignOut}/>}
    </>
  );
}