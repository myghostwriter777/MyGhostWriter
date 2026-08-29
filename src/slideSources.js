const HTTP_URL=/^https?:\/\//i;

const sourceId=(url,index)=>{
  let hash=2166136261;
  for(const character of String(url||index)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return `slide-source-${(hash>>>0).toString(36)}`;
};

export function normalizeSlideSources(...groups){
  const seen=new Set();const sources=[];
  groups.flatMap(group=>Array.isArray(group)?group:[]).forEach((source,index)=>{
    const url=String(source?.url||"").trim();
    if(!HTTP_URL.test(url))return;
    const key=url.replace(/\/$/,"").toLowerCase();
    if(seen.has(key))return;seen.add(key);
    let fallback="Research source";
    try{fallback=new URL(url).hostname.replace(/^www\./,"");}catch{}
    sources.push({id:String(source?.id||sourceId(key,index)),title:String(source?.title||fallback).trim().slice(0,180)||fallback,url});
  });
  return sources.slice(0,16);
}

export function slideSourceDomain(url){
  try{return new URL(String(url||"")).hostname.replace(/^www\./,"");}catch{return String(url||"").replace(/^https?:\/\//i,"").split("/")[0]||"Add URL";}
}

export function makeSourcesSlide(sourceCount=0){
  return {
    isSources:true,
    eyebrow:"Research",
    title:"Sources",
    supportingText:`${Number(sourceCount)||0} source${Number(sourceCount)===1?"":"s"} used in this deck`,
    bullets:[],
    speakerNotes:"Review, edit, add, or remove sources before sharing the deck.",
    visualDirection:"A clean, readable bibliography card that matches the deck.",
    visualType:"sources",
    layout:"top-third",
    narrativeRole:"close",
    isHumorBeat:false,
    visualLabel:"",
    dataValue:"",
    dataLabel:"",
    sourceUrls:[],
  };
}

export function withSourcesSlide(deck,sources){
  const normalized=normalizeSlideSources(sources);
  const slides=(deck?.slides||[]).filter(slide=>!slide?.isSources);
  return {...deck,sources:normalized,slides:[...slides,makeSourcesSlide(normalized.length)]};
}
