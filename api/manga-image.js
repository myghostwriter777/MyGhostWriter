import {generateImage,generateText} from "ai";

export const config={api:{bodyParser:{sizeLimit:"12mb"}},maxDuration:60};

const PRIMARY_MODEL="google/gemini-3.1-flash-image-preview";
const FALLBACK_MODEL="openai/gpt-image-2";
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

async function generateOpenAiPage(prompt,references){
  const result=await generateImage({
    model:FALLBACK_MODEL,
    prompt:references.length?{text:prompt,images:references.map(reference=>reference.data)}:prompt,
    size:"1024x1536",
    maxRetries:1,
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

  const artDirection=`Create one finished portrait comic page for GhostwriterMe. Use original characters and an original composition. Do not copy a copyrighted character, logo, signature, named artist, or existing comic panel. If the request mentions a franchise or artist, translate it into generic visual qualities instead. Keep all characters visually consistent with the supplied character bible and permitted reference images. Use clear panel gutters, expressive acting, deliberate camera angles, and strong visual hierarchy. Render speech bubbles only for the exact short dialogue supplied. Keep lettering large and high contrast. Do not add watermarks. No sexual content involving minors.\n\nPAGE BRIEF:\n${prompt}`;
  try{
    let image=null;let model=PRIMARY_MODEL;
    try{
      image=await generateGeminiPage(artDirection,references);
      if(!image)throw Object.assign(new Error("The primary image model returned no image file."),{statusCode:502});
    }catch(primaryError){
      console.error("Manga image primary model error",errorMeta(primaryError,PRIMARY_MODEL,references));
      const status=Number(primaryError?.statusCode||primaryError?.status||0);
      if([401,402,403,429].includes(status))throw primaryError;
      model=FALLBACK_MODEL;
      image=await generateOpenAiPage(artDirection,references);
    }
    if(!image)return res.status(502).json({error:"The image service returned an empty page. Please try again."});
    return res.status(200).json({image,model});
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
