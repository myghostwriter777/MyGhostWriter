import {generateImage,generateText} from "ai";

export const config={api:{bodyParser:{sizeLimit:"12mb"}},maxDuration:60};

const PRIMARY_MODEL="google/gemini-3.1-flash-image-preview";
const FALLBACK_MODEL="bfl/flux-2-flex";
const MAX_REFERENCES=3;
const MAX_REFERENCE_BYTES=4*1024*1024;
const MAX_TOTAL_REFERENCE_BYTES=9*1024*1024;
const IMAGE_DATA_URL=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i;

function validateReferences(references){
  if(references==null)return[];
  if(!Array.isArray(references)||references.length>MAX_REFERENCES)throw new Error(`Use up to ${MAX_REFERENCES} reference images.`);
  let total=0;
  return references.map((reference,index)=>{
    const match=typeof reference==="string"?reference.match(IMAGE_DATA_URL):null;
    if(!match)throw new Error(`Reference ${index+1} must be a PNG, JPEG, or WebP image.`);
    const base64=match[2].replace(/[\r\n]/g,"");const padding=base64.endsWith("==")?2:base64.endsWith("=")?1:0;const bytes=Math.floor(base64.length*3/4)-padding;
    if(bytes<=0||bytes>MAX_REFERENCE_BYTES)throw new Error(`Reference ${index+1} must be smaller than 4 MB.`);
    total+=bytes;if(total>MAX_TOTAL_REFERENCE_BYTES)throw new Error("The combined reference images are too large.");
    return {data:Buffer.from(base64,"base64"),mediaType:match[1].toLowerCase()};
  });
}

function imagePayload(image){
  if(!image)return null;
  const base64=typeof image.base64==="string"?image.base64:Buffer.from(image.uint8Array||[]).toString("base64");
  if(!base64)return null;
  if(base64.startsWith("data:image/"))return {dataUrl:base64,mediaType:image.mediaType||base64.slice(5,base64.indexOf(";"))||"image/png"};
  return {dataUrl:`data:${image.mediaType||"image/png"};base64,${base64}`,mediaType:image.mediaType||"image/png"};
}

function errorMeta(error,model,references){
  return {
    model,
    status:Number(error?.statusCode||error?.status||0)||undefined,
    code:error?.data?.error?.code||error?.code||undefined,
    message:String(error?.message||"Unknown image generation error").slice(0,400),
    referenceCount:references.length,
  };
}

function xml(value){return String(value||"").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[character]));}
function wrapWords(value,max=42,lines=2){
  const words=String(value||"").replace(/\s+/g," ").trim().split(" ").filter(Boolean);const result=[];let line="";
  for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>max&&line){result.push(line);line=word;if(result.length===lines-1)break;}else line=next;}
  if(line&&result.length<lines)result.push(line);
  if(result.join(" ").length<String(value||"").trim().length&&result.length)result[result.length-1]=result[result.length-1].replace(/[.,;:!?]?$/,"…");
  return result;
}
function parseComicPanels(prompt){
  const panels=[];const pattern=/Panel\s+\d+\s*\nShot:\s*([^\n]*)\nAction and expression:\s*([^\n]*)(?:\nSpeech bubble \([^)]*\):\s*"([^"]*)"|\nNo speech bubble\.)?/gi;let match;
  while((match=pattern.exec(prompt))&&panels.length<4)panels.push({shot:match[1],action:match[2],dialogue:match[3]||""});
  return panels.length?panels:[{shot:"Establishing shot",action:"The scene begins with a clear emotional beat.",dialogue:""},{shot:"Medium shot",action:"The characters react and move the story forward.",dialogue:""},{shot:"Close-up",action:"A final expression lands the moment.",dialogue:""}];
}
function localComicPage(prompt){
  const panels=parseComicPanels(prompt);const title=(prompt.match(/^Title:\s*(.+)$/mi)?.[1]||"Original Comic").slice(0,72);const width=768,height=1152,margin=34,header=76,gap=16;const panelHeight=Math.floor((height-header-margin*2-gap*(panels.length-1))/panels.length);const colors=["#c7d2fe","#fbcfe8","#bfdbfe","#fde68a"];
  const panelSvg=panels.map((panel,index)=>{const y=margin+header+index*(panelHeight+gap);const bubble=panel.dialogue?`<path d="M${margin+330} ${y+18}h360a18 18 0 0 1 18 18v58a18 18 0 0 1-18 18H${margin+470}l-28 24 7-24H${margin+330}a18 18 0 0 1-18-18V${y+36}a18 18 0 0 1 18-18z" fill="#fff" stroke="#111827" stroke-width="4"/>${wrapWords(panel.dialogue,33,2).map((line,lineIndex)=>`<text x="${margin+510}" y="${y+55+lineIndex*25}" text-anchor="middle" font-size="19" font-weight="700" fill="#111827">${xml(line)}</text>`).join("")}`:"";const actionLines=wrapWords(panel.action,52,2);return `<g><rect x="${margin}" y="${y}" width="${width-margin*2}" height="${panelHeight}" rx="12" fill="${colors[index%colors.length]}" stroke="#111827" stroke-width="6"/><circle cx="${margin+170+index*22}" cy="${y+panelHeight*.42}" r="47" fill="#f8fafc" stroke="#111827" stroke-width="6"/><path d="M${margin+105+index*22} ${y+panelHeight-24}q18-114 65-114t67 114" fill="#334155" stroke="#111827" stroke-width="6"/><path d="M${margin+138+index*22} ${y+panelHeight*.39}q32 24 64 0" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/><circle cx="${margin+154+index*22}" cy="${y+panelHeight*.37}" r="5"/><circle cx="${margin+190+index*22}" cy="${y+panelHeight*.37}" r="5"/>${bubble}<rect x="${margin+16}" y="${y+panelHeight-66}" width="${width-margin*2-32}" height="50" rx="8" fill="rgba(15,23,42,.88)"/>${actionLines.map((line,lineIndex)=>`<text x="${margin+32}" y="${y+panelHeight-38+lineIndex*18}" font-size="14" fill="#f8fafc">${xml(line)}</text>`).join("")}<text x="${margin+16}" y="${y+24}" font-size="13" font-weight="800" fill="#111827">${xml(panel.shot||`Panel ${index+1}`)}</text></g>`;}).join("");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f8fafc"/><path d="M0 0h768v18H0z" fill="#ec4899"/><text x="${margin}" y="${margin+31}" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#111827">${xml(title)}</text><text x="${width-margin}" y="${margin+29}" text-anchor="end" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#64748b">GHOSTWRITERME STORYBOARD</text>${panelSvg}</svg>`;
  return {dataUrl:`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,mediaType:"image/svg+xml",fallback:true,warning:"A storyboard illustration was created locally because the full image model was unavailable. Redraw later for fully rendered art."};
}

async function generateGeminiPage(prompt,references){
  const content=[{type:"text",text:prompt},...references.map(reference=>({type:"image",image:reference.data,mediaType:reference.mediaType}))];
  const result=await generateText({
    model:PRIMARY_MODEL,
    messages:[{role:"user",content}],
    maxRetries:1,
    providerOptions:{gateway:{tags:["feature:manga-image","format:portrait-comic"]}},
  });
  return imagePayload((result?.files||[]).find(file=>file?.mediaType?.startsWith("image/")));
}

async function generateFallbackPage(prompt){
  const result=await generateImage({
    model:FALLBACK_MODEL,
    prompt,
    aspectRatio:"2:3",
    maxRetries:1,
    providerOptions:{gateway:{tags:["feature:manga-image","fallback:flux"]}},
  });
  return imagePayload(result?.image||result?.images?.[0]);
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Could not parse the request."});}}
  const prompt=typeof body?.prompt==="string"?body.prompt.trim():"";
  if(!prompt||prompt.length>12000)return res.status(400).json({error:"The manga page description is missing or too long."});
  let references;
  try{references=validateReferences(body.references);}catch(error){return res.status(400).json({error:error.message});}
  console.log("[manga-image] request",{referenceCount:references.length,promptLength:prompt.length});

  const artDirection=`Create one finished portrait comic page for GhostwriterMe. Use original characters and an original composition. Do not copy a copyrighted character, logo, signature, named artist, or existing comic panel. If the request mentions a franchise or artist, translate it into generic visual qualities instead. Keep all characters visually consistent with the supplied character bible and permitted reference images. Use clear panel gutters, expressive acting, deliberate camera angles, and strong visual hierarchy. Render speech bubbles only for the exact short dialogue supplied. Keep lettering large and high contrast. Do not add watermarks. No sexual content involving minors.\n\nPAGE BRIEF:\n${prompt}`;
  try{
    let image=null;let model=PRIMARY_MODEL;let primaryError=null;
    try{
      image=await generateGeminiPage(artDirection,references);
      if(!image)throw Object.assign(new Error("The primary image model returned no image file."),{statusCode:502});
    }catch(error){
      primaryError=error;
      console.error("Manga image primary model error",errorMeta(error,PRIMARY_MODEL,references));
      model=FALLBACK_MODEL;
      try{image=await generateFallbackPage(artDirection);}catch(fallbackError){
        console.error("Manga image fallback model error",errorMeta(fallbackError,FALLBACK_MODEL,references));
        image=localComicPage(prompt);model="local/storyboard-svg";
      }
    }
    if(!image){image=localComicPage(prompt);model="local/storyboard-svg";}
    console.log("[manga-image] success",{model,fallback:!!image.fallback,primaryStatus:Number(primaryError?.statusCode||primaryError?.status||0)||undefined});
    return res.status(200).json({image,model,fallback:!!image.fallback});
  }catch(error){
    console.error("Manga image generation error",errorMeta(error,"gateway",references));
    const status=Number(error?.statusCode||error?.status||0);
    if(status===401||status===403)return res.status(503).json({error:"Manga image generation is not authorized in the production AI Gateway. Check the project Gateway key and image-model access."});
    if(status===402)return res.status(402).json({error:"The AI Gateway image allowance has run out. Add Gateway credits before redrawing this page."});
    if(status===429)return res.status(429).json({error:"Manga Studio is busy. Wait a moment, then generate this page again."});
    return res.status(502).json({error:"The illustrated page could not be generated by either image model. Try a shorter scene or redraw one page."});
  }
}

export {validateReferences};
export {localComicPage};
