// Vercel executes this route as CommonJS, while AI SDK 7 is ESM-only, so the
// SDK stays behind a native dynamic import (same pattern as manga-image.js).
let aiSdkPromise;
const loadAiSdk=()=>aiSdkPromise||(aiSdkPromise=import("ai"));

// sharp arrives with @huggingface/transformers. It is only needed when a
// rendered slide visual would exceed the serverless response limit.
let sharpModule;
function loadSharp(){
  if(sharpModule!==undefined)return sharpModule;
  try{sharpModule=require("sharp");}catch{sharpModule=null;}
  return sharpModule;
}

const config={api:{bodyParser:{sizeLimit:"1mb"}},maxDuration:60};

// The same Gateway chain Manga Studio relies on in production. The Pro model
// leads because slide art is judged on finish: it holds inked linework and
// dense detail far better than the flash model, which stays as failover.
const MULTIMODAL_MODELS=["google/gemini-3-pro-image","google/gemini-3.1-flash-image"];
const IMAGE_MODELS=["bfl/flux-2-flex","openai/gpt-image-2"];

// Landscape 1K output through Google provider options; retried once without
// them if the provider rejects the shape.
const GOOGLE_IMAGE_OPTIONS={responseModalities:["TEXT","IMAGE"],imageConfig:{aspectRatio:"16:9",imageSize:"1K"}};

// Every attempt has to finish inside the 60 s function limit, and the JSON
// response must stay under Vercel's 4.5 MB cap or the browser receives an
// error page instead of a picture.
const TOTAL_BUDGET_MS=54000;
const ATTEMPT_MS=34000;
const MIN_ATTEMPT_MS=8000;
const MAX_RESPONSE_BASE64_CHARS=3600000;
const RECOMPRESS_MAX_WIDTH=1600;

const HEX=/^#[0-9a-f]{6}$/i;

function buildSlideImagePrompt({title="",direction="",theme="",layout="left-third",deckTitle="",palette={}}={}){
  const emptySpace=layout==="right-third"?"right side":layout==="top-third"?"upper third":layout==="full-bleed"?"left half":"left side";
  const accent=HEX.test(String(palette?.accent||""))?palette.accent:"";
  const background=HEX.test(String(palette?.bg||""))?palette.bg:"";
  const colourNote=accent||background?` Build the palette around ${background?`a ${background} slide background`:"a dark slide background"}${accent?` with ${accent} accents`:""}: pick two or three dominant hues that sit against it, push them to high saturation, and let stylised, heightened colour win over literal local colour as long as the subject stays instantly recognisable.`:" Choose two or three dominant hues, push them to high saturation, and let stylised, heightened colour win over literal local colour as long as the subject stays instantly recognisable.";
  const deckNote=String(deckTitle||"").trim()&&String(deckTitle).trim()!==String(title).trim()?` It belongs to a deck titled "${String(deckTitle).trim().slice(0,120)}".`:"";
  const themeNote=String(theme||"").trim()?`\n\nMOOD AND PALETTE REFERENCE (styling only, it never overrides the house style): ${String(theme).trim().slice(0,600)}`:"";
  return `Create one wide 16:9 landscape illustration for a presentation slide, drawn as bold modern graphic-novel artwork of poster quality.

HOUSE STYLE — follow every point
- Hand-inked comic rendering: confident black outlines with clearly varied line weight, heavy contours around the main forms and finer lines inside them.
- Cel shading in crisp flat colour blocks, reinforced with ink hatching, cross-hatching, and stippling that describe volume and material.
- Luminous, high-chroma colour: glowing cores, bright rim light along edges, radiant highlights, and deep saturated shadow pockets for punchy contrast.
- Dense, deliberate detail across the whole picture. No empty flat regions inside the artwork: fill space with texture, particles, filaments, cells, grain, atmosphere, or supporting environment.
- One dominant hero subject rendered large with real presence, surrounded by smaller supporting elements at varied scale and depth so the composition reads as a designed scene.
- The finish should look like a science-magazine or graphic-novel cover drawn by a professional comic illustrator: clean, printable, and intentional in every square inch.
${colourNote}${themeNote}

SUBJECT: ${String(title||"").trim()||"the slide's topic"}.${deckNote}
SCENE: ${String(direction||"").trim()||"A concrete, topic-specific scene that communicates the core idea instantly."}

COMPOSITION
Keep the hero subject away from the ${emptySpace}, leaving calmer space there for presentation text; calmer means simpler shapes and lower contrast, never a blank rectangle. Use a clear focal point, layered foreground, midground and background, and let organic elements such as foliage, terrain, membranes, clouds, or architecture form the edge where the picture meets the slide background. Depict the concrete subject named above accurately.

AVOID COMPLETELY
Photorealism, 3D renders, stock photography, clip art, vector icon packs, corporate flat-design mascots, faded pastel washes, muddy low-contrast colour, thin uniform outlines, empty background gradients, sketchy unfinished linework, and any words, letters, numbers, charts, UI, logos, watermarks, borders, slide frames, or signatures. Do not imitate a named artist or a copyrighted character.`;
}

function imagePayload(image){
  if(!image)return null;
  const base64=typeof image.base64==="string"?image.base64:Buffer.from(image.uint8Array||[]).toString("base64");
  if(!base64)return null;
  if(base64.startsWith("data:image/"))return {dataUrl:base64,mediaType:image.mediaType||base64.slice(5,base64.indexOf(";"))||"image/png"};
  return {dataUrl:`data:${image.mediaType||"image/png"};base64,${base64}`,mediaType:image.mediaType||"image/png"};
}

// Shrinks a visual that would not fit in the serverless response. Quality is
// kept high because slide art is scaled up to a 1600x900 stage.
async function fitResponseImage(image){
  if(!image?.dataUrl)return image;
  const base64=image.dataUrl.slice(image.dataUrl.indexOf(",")+1);
  if(base64.length<=MAX_RESPONSE_BASE64_CHARS)return image;
  const sharp=loadSharp();
  if(!sharp)return {...image,oversized:true};
  let buffer=Buffer.from(base64,"base64");
  for(const quality of [90,82,72]){
    try{
      const shrunk=await sharp(buffer).rotate().resize({width:RECOMPRESS_MAX_WIDTH,height:RECOMPRESS_MAX_WIDTH,fit:"inside",withoutEnlargement:true}).jpeg({quality,mozjpeg:true}).toBuffer();
      const encoded=shrunk.toString("base64");
      if(encoded.length<=MAX_RESPONSE_BASE64_CHARS)return {dataUrl:`data:image/jpeg;base64,${encoded}`,mediaType:"image/jpeg",recompressed:true};
      buffer=shrunk;
    }catch(error){
      console.error("Slide image recompression failed",{message:String(error?.message||error).slice(0,200)});
      return {...image,oversized:true};
    }
  }
  return {...image,oversized:true};
}

function isGatewayAccountBlock(error){
  const status=Number(error?.statusCode||error?.status||0);
  const message=String(error?.message||"");
  return status===401||status===402||(status===403&&/AI Gateway|credit card|billing|fund|authentication|API key/i.test(message));
}

function isBadRequest(error){
  return Number(error?.statusCode||error?.status||0)===400;
}

function isTimeout(error){
  return error?.name==="AbortError"||error?.name==="TimeoutError"||/abort|timeout|timed out/i.test(String(error?.message||""));
}

function attemptSignal(ms){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1000,Math.floor(ms)));
  if(typeof timer?.unref==="function")timer.unref();
  return {signal:controller.signal,clear:()=>clearTimeout(timer)};
}

async function generateMultimodal(model,prompt,timeoutMs=ATTEMPT_MS){
  const {generateText}=await loadAiSdk();
  const request=async options=>{
    const attempt=attemptSignal(timeoutMs);
    try{
      return await generateText({model,prompt,maxRetries:1,abortSignal:attempt.signal,providerOptions:{gateway:{tags:["feature:slide-image",`model:${model}`]},...(options?{google:options}:{})}});
    }finally{attempt.clear();}
  };
  let result;
  try{result=await request(GOOGLE_IMAGE_OPTIONS);}
  catch(error){
    if(!isBadRequest(error))throw error;
    console.warn("Slide image provider rejected the Google image options; retrying without them",{model,message:String(error?.message||"").slice(0,200)});
    result=await request(null);
  }
  return imagePayload((result?.files||[]).find(file=>file?.mediaType?.startsWith("image/")));
}

async function generateDedicated(model,prompt,timeoutMs=ATTEMPT_MS){
  const {generateImage}=await loadAiSdk();
  const attempt=attemptSignal(timeoutMs);
  let result;
  try{
    result=await generateImage({model,prompt,...(model.startsWith("openai/")?{size:"1536x1024"}:{aspectRatio:"16:9"}),maxRetries:1,abortSignal:attempt.signal,providerOptions:{gateway:{tags:["feature:slide-image",`model:${model}`]}}});
  }finally{attempt.clear();}
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
  const startedAt=Date.now();
  const remaining=()=>TOTAL_BUDGET_MS-(Date.now()-startedAt);
  let timedOut=false;
  try{
    let image=null;let usedModel="";
    for(const model of [...MULTIMODAL_MODELS,...IMAGE_MODELS]){
      const budget=Math.min(ATTEMPT_MS,remaining());
      if(budget<MIN_ATTEMPT_MS){timedOut=true;break;}
      const multimodal=MULTIMODAL_MODELS.includes(model);
      try{
        image=multimodal?await generateMultimodal(model,prompt,budget):await generateDedicated(model,prompt,budget);
        if(image){usedModel=model;break;}
        throw Object.assign(new Error("The image model returned no file."),{statusCode:502});
      }catch(error){
        errors.push(error);console.error("Slide image model error",{model,status:Number(error?.statusCode||error?.status||0)||undefined,message:String(error?.message||"").slice(0,300)});
        if(isGatewayAccountBlock(error))throw error;
      }
    }
    if(!image){
      if(timedOut||errors.every(isTimeout))throw Object.assign(new Error("Every image model ran out of time."),{statusCode:504});
      throw errors.find(item=>[401,402,403,429].includes(Number(item?.statusCode||item?.status||0)))||errors[0]||new Error("No image model returned an illustration.");
    }
    const fitted=await fitResponseImage(image);
    if(fitted.oversized)throw Object.assign(new Error("The rendered visual is too large to return."),{statusCode:413});
    return res.status(200).json({image:{dataUrl:fitted.dataUrl,mediaType:fitted.mediaType},model:usedModel});
  }catch(error){
    const status=Number(error?.statusCode||error?.status||0);
    if(status===401||status===403)return res.status(503).json({error:"AI image generation is not enabled for this deployment yet. Upload your own image or try again later.",code:"IMAGE_GATEWAY_ACCESS_REQUIRED"});
    if(status===402)return res.status(402).json({error:"The AI image allowance has run out. You can still upload your own image."});
    if(status===429)return res.status(429).json({error:"The image studio is busy. Wait a moment and try again."});
    if(status===504)return res.status(504).json({error:"This visual took too long to draw. Retry the slide, or upload your own image."});
    if(status===413)return res.status(502).json({error:"The illustrator returned a visual that was too large to deliver. Retry the slide."});
    return res.status(502).json({error:"The AI visual could not be created. Try a shorter visual direction or upload an image."});
  }
}

module.exports=handler;
module.exports.config=config;
module.exports.buildSlideImagePrompt=buildSlideImagePrompt;
module.exports.fitResponseImage=fitResponseImage;
module.exports.GOOGLE_IMAGE_OPTIONS=GOOGLE_IMAGE_OPTIONS;
