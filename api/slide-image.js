// Vercel executes this route as CommonJS, while AI SDK 7 is ESM-only, so the
// SDK stays behind a native dynamic import (same pattern as manga-image.js).
let aiSdkPromise;
const loadAiSdk=()=>aiSdkPromise||(aiSdkPromise=import("ai"));

const config={api:{bodyParser:{sizeLimit:"1mb"}},maxDuration:60};

// The same Gateway chain Manga Studio relies on in production: Nano Banana
// multimodal models first (fast, strong at illustrated scenes), then the
// dedicated image models as failover.
const MULTIMODAL_MODELS=["google/gemini-3.1-flash-image","google/gemini-3-pro-image"];
const IMAGE_MODELS=["bfl/flux-2-flex","openai/gpt-image-2"];

const HEX=/^#[0-9a-f]{6}$/i;

function buildSlideImagePrompt({title="",direction="",theme="",layout="left-third",deckTitle="",palette={}}={}){
  const emptySpace=layout==="right-third"?"right side":layout==="top-third"?"upper third":layout==="full-bleed"?"left half":"left side";
  const accent=HEX.test(String(palette?.accent||""))?palette.accent:"";
  const background=HEX.test(String(palette?.bg||""))?palette.bg:"";
  const colourNote=accent||background?` The slide uses ${background?`a ${background} background`:"a dark background"}${accent?` with ${accent} accents`:""}; choose an illustration palette that harmonises with it while keeping natural, believable colours for the subject.`:"";
  const deckNote=String(deckTitle||"").trim()&&String(deckTitle).trim()!==String(title).trim()?` It belongs to a deck titled "${String(deckTitle).trim().slice(0,120)}".`:"";
  return `Create one wide 16:9 landscape editorial illustration for a presentation slide in a refined ${theme||"editorial"} art direction. The finish should resemble a premium hand-drawn educational illustration: confident clean ink linework, flat colour with soft dimensional shading, rich topic-specific detail, warm cinematic light, and a cohesive limited palette. It must feel authored and illustrative, never like stock photography, clip art, a 3D icon pack, or an abstract placeholder.${colourNote}

SUBJECT: ${String(title||"").trim()||"the slide's topic"}.${deckNote}
SCENE: ${String(direction||"").trim()||"A concrete, topic-specific scene that communicates the core idea instantly."}

Compose with the main subject away from the ${emptySpace}, leaving calm negative space there for presentation text. Use a clear focal point, layered foreground and background, controlled contrast, and let foliage, architecture, clouds, terrain, or another scene element form an organic edge where the picture can meet the slide background. Depict the concrete subject named above accurately.

Do not include words, letters, numbers, charts, UI, logos, watermarks, borders, slide frames, or signatures. Do not imitate a named artist or copyrighted character.`;
}

function imagePayload(image){
  if(!image)return null;
  const base64=typeof image.base64==="string"?image.base64:Buffer.from(image.uint8Array||[]).toString("base64");
  if(!base64)return null;
  if(base64.startsWith("data:image/"))return {dataUrl:base64,mediaType:image.mediaType||base64.slice(5,base64.indexOf(";"))||"image/png"};
  return {dataUrl:`data:${image.mediaType||"image/png"};base64,${base64}`,mediaType:image.mediaType||"image/png"};
}

function isGatewayAccountBlock(error){
  const status=Number(error?.statusCode||error?.status||0);
  const message=String(error?.message||"");
  return status===401||status===402||(status===403&&/AI Gateway|credit card|billing|fund|authentication|API key/i.test(message));
}

async function generateMultimodal(model,prompt){
  const {generateText}=await loadAiSdk();
  const result=await generateText({model,prompt,maxRetries:1,providerOptions:{gateway:{tags:["feature:slide-image",`model:${model}`]}}});
  return imagePayload((result?.files||[]).find(file=>file?.mediaType?.startsWith("image/")));
}

async function generateDedicated(model,prompt){
  const {generateImage}=await loadAiSdk();
  const result=await generateImage({model,prompt,...(model.startsWith("openai/")?{size:"1536x1024"}:{aspectRatio:"16:9"}),maxRetries:1,providerOptions:{gateway:{tags:["feature:slide-image",`model:${model}`]}}});
  return imagePayload(result?.image||result?.images?.[0]);
}

async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Could not parse the request."});}}
  const prompt=buildSlideImagePrompt(body||{});
  if(prompt.length>8000)return res.status(400).json({error:"The slide visual description is too long."});
  const errors=[];
  try{
    for(const model of MULTIMODAL_MODELS){
      try{
        const image=await generateMultimodal(model,prompt);
        if(image)return res.status(200).json({image,model});
        throw Object.assign(new Error("The multimodal image model returned no image file."),{statusCode:502});
      }catch(error){
        errors.push(error);console.error("Slide image multimodal model error",{model,status:Number(error?.statusCode||error?.status||0)||undefined,message:String(error?.message||"").slice(0,300)});
        if(isGatewayAccountBlock(error))throw error;
      }
    }
    for(const model of IMAGE_MODELS){
      try{
        const image=await generateDedicated(model,prompt);
        if(image)return res.status(200).json({image,model});
        throw Object.assign(new Error("The image model returned no file."),{statusCode:502});
      }catch(error){
        errors.push(error);console.error("Slide image model error",{model,status:Number(error?.statusCode||error?.status||0)||undefined,message:String(error?.message||"").slice(0,300)});
        if(isGatewayAccountBlock(error))throw error;
      }
    }
    throw errors.find(item=>[401,402,403,429].includes(Number(item?.statusCode||item?.status||0)))||errors[0]||new Error("No image model returned an illustration.");
  }catch(error){
    const status=Number(error?.statusCode||error?.status||0);
    if(status===401||status===403)return res.status(503).json({error:"AI image generation is not enabled for this deployment yet. Upload your own image or try again later.",code:"IMAGE_GATEWAY_ACCESS_REQUIRED"});
    if(status===402)return res.status(402).json({error:"The AI image allowance has run out. You can still upload your own image."});
    if(status===429)return res.status(429).json({error:"The image studio is busy. Wait a moment and try again."});
    return res.status(502).json({error:"The AI visual could not be created. Try a shorter visual direction or upload an image."});
  }
}

module.exports=handler;
module.exports.config=config;
module.exports.buildSlideImagePrompt=buildSlideImagePrompt;
