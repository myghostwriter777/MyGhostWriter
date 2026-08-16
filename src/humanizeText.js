const CITATION_MARKER=/\[(?:\s*\d+\s*)(?:(?:,|;|\u2013|-)\s*\d+\s*)*\]/g;

export function protectCitationMarkers(value){
  const citations=[];
  const text=String(value||"").replace(CITATION_MARKER,marker=>{
    const token=`GWMREFTOKEN${citations.length}END`;
    citations.push({token,marker});
    return token;
  });
  return{text,citations};
}

export function restoreCitationMarkers(value,citations=[]){
  let text=String(value||"");const missing=[];
  citations.forEach(({token,marker},index)=>{
    const flexible=new RegExp(`GWM[\\s_-]*REF[\\s_-]*TOKEN[\\s_-]*${index}[\\s_-]*END`,"i");
    if(flexible.test(text))text=text.replace(flexible,marker);
    else missing.push(marker);
    text=text.replace(new RegExp(`GWM[\\s_-]*REF[\\s_-]*TOKEN[\\s_-]*${index}[\\s_-]*END`,"gi"),"");
  });
  if(missing.length)text=text.trimEnd()+(text.trim()?" ":"")+missing.join(" ");
  return text.replace(/[ \t]+\n/g,"\n").replace(/ {2,}/g," ").trim();
}

// Humanize may keep genuine questions from the source, but it must never add
// new rhetorical ones. Any extra question marks are safely changed to stops.
export function limitQuestionsToSource(value,source){
  let allowed=(String(source||"").match(/\?/g)||[]).length;
  return String(value||"").replace(/\?/g,()=>allowed-->0?"?":".");
}

