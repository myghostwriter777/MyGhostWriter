import React from "react";

// GhostwriterMe's own line-icon family. The rounded geometry, ink dots, and
// small four-point sparks echo Ghosty's soft silhouette and writing motif.
const Spark=({x=19,y=5})=>(<path d={`M${x} ${y-2}v4M${x-2} ${y}h4`}/>);

function Glyph({name}){
  switch(name){
    case "ghost": return <><path d="M6.5 19V10a5.5 5.5 0 0 1 11 0v9l-2.2-1.6L13.1 19l-2.2-1.6L8.7 19 6.5 17.4"/><circle cx="10" cy="10.5" r=".7" fill="currentColor" stroke="none"/><circle cx="14" cy="10.5" r=".7" fill="currentColor" stroke="none"/><path d="M10.2 13.5c1.1.8 2.5.8 3.6 0"/></>;
    case "reply": case "personal": return <><path d="M5 6.5h14v9H11l-4.5 3v-3H5z"/><path d="M8.5 10h7M8.5 12.8h4.5"/><Spark/></>;
    case "mail": case "email": case "contact": return <><rect x="3.5" y="6" width="17" height="12" rx="2.3"/><path d="m5 8 7 5 7-5"/><Spark x={19} y={4}/></>;
    case "inbox": return <><path d="M4 7.5h16v11H4z"/><path d="m5.5 9 6.5 4.5L18.5 9M8 5h8"/></>;
    case "grammar": case "checkDocument": return <><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4M8.8 14l2 2 4.2-4.5"/></>;
    case "essay": case "draft": case "personalEssay": return <><path d="m5 18 1.2-4.4L15.5 4.3a2 2 0 0 1 2.8 2.8L9 16.4zM6.2 13.6 9 16.4M5 20h14"/><circle cx="18.8" cy="4" r=".8" fill="currentColor" stroke="none"/></>;
    case "academic": case "cap": return <><path d="m3 9 9-4 9 4-9 4zM6.5 11v4.5c3.4 2.3 7.6 2.3 11 0V11M20 10v5"/><circle cx="20" cy="17" r="1"/></>;
    case "cv": case "profileDocument": return <><path d="M6 3.5h12V20H6z"/><circle cx="10" cy="9" r="2"/><path d="M8 14c1.2-1.5 2.8-1.5 4 0M14.5 9h1.5M14.5 12h1.5M9 17h7"/></>;
    case "author": case "book": case "memoir": return <><path d="M4 5.5h5.2c1.5 0 2.8 1 2.8 2.4v11c0-1.4-1.3-2.4-2.8-2.4H4zM20 5.5h-5.2c-1.5 0-2.8 1-2.8 2.4v11c0-1.4 1.3-2.4 2.8-2.4H20z"/><path d="M7 9h2M15 9h2"/></>;
    case "story": case "movie": return <><rect x="4" y="7.5" width="16" height="11" rx="2"/><path d="M4 11h16M7 7.5l2.5-4M12 7.5l2.5-4M17 7.5l2.5-4M4.5 5.5h15"/></>;
    case "humanize": return <><path d="M7 18.5c-2-2-3-4.2-3-6.5a8 8 0 0 1 16 0c0 2.3-1 4.5-3 6.5"/><path d="M8 13c1-2.7 2.4-4 4-4s3 1.3 4 4M9 16c2-1.3 4-1.3 6 0M10.5 19h3"/><circle cx="12" cy="6" r=".8" fill="currentColor" stroke="none"/></>;
    case "history": case "clock": return <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2M6 4.8 4.5 6"/><Spark x={19} y={5}/></>;
    case "chill": return <><path d="M4 13c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0M6 17h12M7 8h5"/><circle cx="17.5" cy="7" r="1.2"/></>;
    case "confident": case "shieldCheck": return <><path d="M12 3.5 19 6v5.4c0 4.3-2.8 7.3-7 9.1-4.2-1.8-7-4.8-7-9.1V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>;
    case "flirty": case "romance": case "heart": return <><path d="M12 19s-7-4.2-7-9.2A3.8 3.8 0 0 1 12 7.7 3.8 3.8 0 0 1 19 9.8C19 14.8 12 19 12 19z"/><Spark x={19} y={5}/></>;
    case "professional": case "briefcase": return <><rect x="3.5" y="7" width="17" height="11.5" rx="2"/><path d="M9 7V5h6v2M3.5 12h17M10 12v2h4v-2"/></>;
    case "formal": return <><path d="m9 4 3 3 3-3M10.5 7 9 18l3 2 3-2-1.5-11M6 5 4 19M18 5l2 14"/></>;
    case "casual": return <><path d="M5 6.5h14v9H11l-4 3v-3H5z"/><circle cx="9" cy="10" r=".65" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r=".65" fill="currentColor" stroke="none"/><path d="M9 12.5c1.7 1.3 4.3 1.3 6 0"/></>;
    case "followUp": case "refresh": return <><path d="M18.5 8A7 7 0 1 0 19 15M18.5 8V4.5M18.5 8H15"/><path d="M5.5 16v3.5M5.5 16H9"/></>;
    case "apology": return <><path d="M5 7h14v9H11l-4 3v-3H5z"/><path d="M12 14s-3-1.8-3-4a1.6 1.6 0 0 1 3-1 1.6 1.6 0 0 1 3 1c0 2.2-3 4-3 4z"/></>;
    case "request": case "clipboard": return <><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3.5h6V5M8 10h8M8 14h5M8 18h7"/></>;
    case "outreach": case "send": case "sciFi": return <><path d="m3.5 11 17-7-6.8 16-2.4-6.1zM11.3 13.9 20.5 4"/><Spark x={5} y={18}/></>;
    case "thanks": case "spark": case "youngAdult": return <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/><Spark x={18.5} y={18}/><circle cx="5" cy="5" r=".7" fill="currentColor" stroke="none"/></>;
    case "fantasy": return <><path d="M16.5 16.5A7 7 0 0 1 8 6a7.5 7.5 0 1 0 8.5 10.5z"/><Spark x={17} y={6}/><circle cx="19" cy="11" r=".7" fill="currentColor" stroke="none"/></>;
    case "thriller": return <><path d="M12 4.5c4.8 0 8 4.2 8 7.5s-3.2 7.5-8 7.5S4 15.3 4 12s3.2-7.5 8-7.5z"/><circle cx="12" cy="12" r="2.5"/><path d="M12 9.5V6"/></>;
    case "mystery": case "search": case "reviewer": return <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m14.5 14.5 5 5M8.5 10a2 2 0 0 1 4 0c0 1.4-2 1.5-2 3M10.5 15.5h.01"/></>;
    case "historical": case "scroll": return <><path d="M7 5h10v14H7c-1.7 0-2.5-1-2.5-2s.8-2 2.5-2h10M7 5c-1.7 0-2.5 1-2.5 2S5.3 9 7 9h10"/><path d="M10 12h4"/></>;
    case "literary": return <><path d="M5 18c7 0 12-4.5 14-13-8.5 1-13 5.5-14 13zM5 18c3.8-3.3 7.3-6 11-8"/><circle cx="4" cy="19" r=".7" fill="currentColor" stroke="none"/></>;
    case "selfHelp": case "idea": return <><path d="M8.5 15.5c-1.5-1.1-2.5-2.8-2.5-4.8a6 6 0 0 1 12 0c0 2-1 3.7-2.5 4.8L15 18H9zM9.5 21h5M12 2V1"/><Spark x={19} y={5}/></>;
    case "travel": case "compass": return <><circle cx="12" cy="12" r="8.5"/><path d="m15.7 8.3-2 5.4-5.4 2 2-5.4z"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/></>;
    case "target": return <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/><path d="m15 9 5-5M17 4h3v3"/></>;
    case "outline": return <><path d="M6 3.5h12V20H6z"/><path d="M9 8h6M9 12h6M9 16h4"/><circle cx="7.7" cy="8" r=".4" fill="currentColor" stroke="none"/></>;
    case "question": return <><path d="M5 6h14v10H11l-4 3v-3H5z"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.7-2.5 1.8-2.5 3.2M12 14.5h.01"/></>;
    case "sources": return <><path d="M7 4h11v14H7zM4 7v13h11"/><path d="M10 8h5M10 11h5M10 14h3"/></>;
    case "structure": return <><rect x="9" y="3.5" width="6" height="4" rx="1"/><rect x="3.5" y="16.5" width="6" height="4" rx="1"/><rect x="14.5" y="16.5" width="6" height="4" rx="1"/><path d="M12 7.5v4.5M6.5 16.5V12h11v4.5"/></>;
    case "research": return <><path d="M8 3.5h8M10 3.5v5l-4.5 8A2.7 2.7 0 0 0 7.8 20h8.4a2.7 2.7 0 0 0 2.3-3.5l-4.5-8v-5M7.8 14h8.4"/><circle cx="12" cy="16.5" r=".7" fill="currentColor" stroke="none"/></>;
    case "report": return <><path d="M6 3.5h12V20H6z"/><path d="M9 16v-3M12 16V9M15 16v-5M9 7h4"/></>;
    case "presentation": return <><rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M7 9h5M7 12h8M12 16.5V21M8.5 21h7"/><Spark x={18.5} y={7}/></>;
    case "interview": return <><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.7 2.4-5.5 5.5-5.5s4.9 1.8 5.5 5.5M17 7.5c1.5 1.1 1.5 2.9 0 4M19.5 5.5c2.7 2.6 2.7 6.4 0 9"/><circle cx="9" cy="8" r=".5" fill="currentColor" stroke="none"/></>;
    case "meeting": return <><rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M8 20h8M12 16.5V20M8 9.5a4 4 0 0 0 8 0M10 7.5v2a2 2 0 0 0 4 0v-2"/><Spark x={19} y={4}/></>;
    case "slides": return <><rect x="4" y="4" width="13" height="10" rx="1.5"/><path d="M7 8h5M7 11h7M7 17h13M7 20h10M20 7v8"/><Spark x={20} y={4}/></>;
    case "study": return <><path d="M5 4.5h6c1.2 0 2.2.8 2.2 2v13c0-1.2-1-2-2.2-2H5zM19 4.5h-3.4c-1.3 0-2.4.8-2.4 2v13c0-1.2 1.1-2 2.4-2H19z"/><path d="M7.5 8.5h3M7.5 11.5h3M15.5 8.5h1"/><Spark x={19} y={4}/></>;
    case "power": return <><path d="M12 3v9"/><path d="M7.2 6.4a8 8 0 1 0 9.6 0"/></>;
    case "upload": return <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v6h14v-6"/></>;
    case "audience": return <><circle cx="8" cy="9" r="2.7"/><circle cx="16" cy="9" r="2.7"/><path d="M2.8 19c.5-3.5 2.2-5.2 5.2-5.2s4.7 1.7 5.2 5.2M10.8 19c.5-3.5 2.2-5.2 5.2-5.2s4.7 1.7 5.2 5.2"/></>;
    case "building": return <><path d="M5 21V5h10v16M15 9h4v12M3 21h18"/><path d="M8 8h1M12 8h1M8 12h1M12 12h1M8 16h1M12 16h1M17 12h1M17 16h1"/></>;
    case "pdf": return <><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4M8.2 16v-4h1.2a1.2 1.2 0 0 1 0 2.4H8.2M12 16v-4h1c1.5 0 2.3.8 2.3 2s-.8 2-2.3 2z"/></>;
    case "word": return <><path d="M5 4h14v16H5z"/><path d="m8 9 1.5 7L12 11l2.5 5L16 9"/><Spark x={19} y={5}/></>;
    case "code": return <><path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 5l-2 14"/></>;
    case "image": return <><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="8.5" cy="9.5" r="1.4"/><path d="m5.5 17 4.2-4 2.7 2.4 2.5-2.2 3.6 3.8"/></>;
    case "camera": return <><path d="M4 8h3l1.2-2h7.6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/><Spark x={19} y={5}/></>;
    case "paperclip": return <path d="m8.5 12.5 6.8-6.8a3 3 0 0 1 4.2 4.2l-8.2 8.2a4.2 4.2 0 0 1-6-6l8-8M7.5 14.5l8-8"/>;
    case "scan": return <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 9h8M8 12h6M8 15h8"/></>;
    case "mic": return <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"/></>;
    case "volume": return <><path d="M4 10h4l4-3v10l-4-3H4zM15 10c1.2 1.2 1.2 2.8 0 4M17.5 7.5c2.7 2.7 2.7 6.3 0 9"/></>;
    case "stop": return <rect x="6" y="6" width="12" height="12" rx="2"/>;
    case "copy": return <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5H5v11h3"/></>;
    case "save": return <><path d="M5 4h12l2 2v14H5z"/><path d="M8 4v5h7V4M8 20v-7h8v7"/></>;
    case "check": return <path d="m5 12.5 4.2 4.2L19 7"/>;
    case "alert": return <><path d="M12 3.5 21 20H3z"/><path d="M12 9v5M12 17h.01"/></>;
    case "info": return <><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></>;
    case "shield": return <><path d="M12 3.5 19 6v5.4c0 4.3-2.8 7.3-7 9.1-4.2-1.8-7-4.8-7-9.1V6z"/><path d="M9.5 12h5M12 9.5v5"/></>;
    case "globe": return <><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.5 5.2 3.5 8.5s-1 6.2-3.5 8.5c-2.5-2.3-3.5-5.2-3.5-8.5s1-6.2 3.5-8.5z"/></>;
    case "user": return <><circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/><Spark x={19} y={5}/></>;
    case "lock": return <><rect x="5.5" y="10" width="13" height="10" rx="2"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3M12 14v2"/></>;
    case "eye": return <><path d="M3.5 12s3.2-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3.2 5.5-8.5 5.5S3.5 12 3.5 12z"/><circle cx="12" cy="12" r="2.5"/></>;
    case "eyeOff": return <><path d="M4 4l16 16M6.2 7.2C4.5 8.8 3.5 12 3.5 12s3.2 5.5 8.5 5.5c1.2 0 2.3-.3 3.3-.7M9.8 6.8c.7-.2 1.4-.3 2.2-.3 5.3 0 8.5 5.5 8.5 5.5s-.7 1.3-2 2.7"/></>;
    case "close": return <path d="M6 6l12 12M18 6 6 18"/>;
    case "sun": return <><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/></>;
    case "moon": return <><path d="M19 15.2A8 8 0 0 1 8.8 5 8.5 8.5 0 1 0 19 15.2z"/><Spark x={18.5} y={5}/></>;
    case "settings": return <><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></>;
    case "document": return <><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4M9 12h6M9 15h6"/></>;
    case "flag": return <><path d="M6 21V4M6 5h11l-2 4 2 4H6"/><circle cx="6" cy="3" r="1"/></>;
    case "cloud": return <><path d="M6.5 18h11a3.5 3.5 0 0 0 .4-7A6 6 0 0 0 6.5 9.5a4.3 4.3 0 0 0 0 8.5z"/><path d="m9.5 14 2 2 3.5-4"/></>;
    case "link": return <><path d="m9.5 14.5-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14.5 9.5l1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 15.5l7-7"/></>;
    case "file": return <><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4"/></>;
    case "users": return <><circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.3"/><path d="M3.5 19c.6-3.4 2.5-5 5.5-5s4.9 1.6 5.5 5M14 15c3.5-.8 5.5.6 6 3.5"/></>;
    case "conflict": return <><path d="m6 4 12 16M18 4 6 20M5 3l3 1-2 2M19 3l-3 1 2 2"/></>;
    case "newspaper": return <><path d="M4 5h14v14H6a2 2 0 0 1-2-2zM18 8h2v9a2 2 0 0 1-2 2"/><path d="M7 9h8M7 12h3M12 12h3M7 15h8"/></>;
    case "compare": return <><path d="M8 5H4v14h4M16 5h4v14h-4M9 8l-2 2 2 2M15 16l2-2-2-2"/></>;
    case "gift": return <><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 6h18v4H3zM12 6v14M12 6H8.5A2.5 2.5 0 1 1 11 3.5zM12 6h3.5A2.5 2.5 0 1 0 13 3.5z"/></>;
    case "celebrate": return <><path d="m5 20 3-10 6 6zM8 10l6 6"/><path d="M13 5h.01M17 8h.01M18 3l.5 2M10 3l1 2M20 12l-2-.5"/></>;
    case "timer": return <><circle cx="12" cy="13" r="7.5"/><path d="M9 3h6M12 5.5V3M12 9v4l2.5 1.5"/></>;
    case "trash": return <><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>;
    case "arrowLeft": return <path d="M19 12H5m6-6-6 6 6 6"/>;
    case "arrowRight": case "chevronRight": return <path d="m8 5 7 7-7 7"/>;
    case "chevronDown": return <path d="m5 9 7 7 7-7"/>;
    case "dawn": return <><path d="M4 18h16M6.5 15.5a5.5 5.5 0 0 1 11 0M12 4v3M5.5 8l2 2M18.5 8l-2 2"/></>;
    case "trendUp": return <><path d="m4 17 5-5 3 3 7-8M14 7h5v5"/><Spark x={6} y={6}/></>;
    case "bolt": return <path d="m13.5 3-7 11h5l-1 7 7-11h-5z"/>;
    case "trendDown": return <><path d="m4 7 5 5 3-3 7 8M14 17h5v-5"/><Spark x={6} y={18}/></>;
    case "dusk": return <><path d="M4 18h16M7 15a5.2 5.2 0 0 1 9.8-2.4M17.5 6.5A4.5 4.5 0 0 1 12 11a5 5 0 0 0 5.5-4.5z"/></>;
    default: return <><path d="M6 6h12v12H6z"/><Spark/></>;
  }
}

export default function GwmIcon({name,size=18,color="currentColor",strokeWidth=1.8,className,style,title}){
  return(
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{display:"block",flex:"0 0 auto",...style}}
      role={title?"img":undefined}
      aria-hidden={title?undefined:"true"}
      aria-label={title||undefined}
    >
      <Glyph name={name}/>
    </svg>
  );
}
