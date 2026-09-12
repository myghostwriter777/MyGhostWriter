// Vercel executes this route as CommonJS, while AI SDK 7 is ESM-only. A
// top-level `import from "ai"` is rewritten to require("ai") by the function
// bundler and crashes before the handler can run. Keep the SDK behind Node's
// native dynamic import so production can actually reach the image models.
let aiSdkPromise;
const loadAiSdk=()=>aiSdkPromise||(aiSdkPromise=import("ai"));

// sharp ships with @huggingface/transformers, so it is normally present, but
// the route must keep working (just without recompression) if it is not.
let sharpModule;
function loadSharp(){
  if(sharpModule!==undefined)return sharpModule;
  try{sharpModule=require("sharp");}catch{sharpModule=null;}
  return sharpModule;
}

const config={api:{bodyParser:{sizeLimit:"12mb"}},maxDuration:60};

// Nano Banana models use generateText and return the rendered image in
// result.files. Keep the documented Pro model first, with a faster generally
// available Nano Banana model behind it for provider-level failover.
const MULTIMODAL_MODELS=["google/gemini-3-pro-image","google/gemini-3.1-flash-image"];
const PRIMARY_MODEL=MULTIMODAL_MODELS[0];
const FALLBACK_MODELS=["bfl/flux-2-flex","openai/gpt-image-2"];
const MAX_REFERENCES=3;
const MAX_REFERENCE_BYTES=4*1024*1024;
const MAX_TOTAL_REFERENCE_BYTES=9*1024*1024;
const IMAGE_DATA_URL=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i;

// The whole route has to finish inside Vercel's 60 s function limit, and the
// JSON response must stay under the 4.5 MB serverless response cap, or the
// browser receives an HTML error page instead of a page image. Every model
// attempt therefore gets an explicit deadline and every result is measured.
const TOTAL_BUDGET_MS=54000;
const PRIMARY_ATTEMPT_MS=38000;
const MIN_ATTEMPT_MS=9000;
const MAX_RESPONSE_BASE64_CHARS=3600000; // ~2.7 MB of image data
const RECOMPRESS_MAX_WIDTH=1536;

// Gemini image models accept output sizing through provider options. A 1K
// portrait keeps the PNG comfortably under the response cap; if the provider
// rejects the options (400) the attempt is repeated once without them.
const GOOGLE_IMAGE_OPTIONS={responseModalities:["TEXT","IMAGE"],imageConfig:{aspectRatio:"2:3",imageSize:"1K"}};

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

// Shrinks a page that would not fit in the serverless response. Returns the
// original payload untouched when it already fits or sharp is unavailable.
async function fitResponseImage(image){
  if(!image?.dataUrl)return image;
  const comma=image.dataUrl.indexOf(",");
  const base64=image.dataUrl.slice(comma+1);
  if(base64.length<=MAX_RESPONSE_BASE64_CHARS)return image;
  const sharp=loadSharp();
  if(!sharp)return {...image,oversized:true};
  let buffer=Buffer.from(base64,"base64");
  for(const quality of [88,80,70]){
    try{
      const shrunk=await sharp(buffer).rotate().resize({width:RECOMPRESS_MAX_WIDTH,height:RECOMPRESS_MAX_WIDTH*2,fit:"inside",withoutEnlargement:true}).jpeg({quality,mozjpeg:true}).toBuffer();
      const encoded=shrunk.toString("base64");
      if(encoded.length<=MAX_RESPONSE_BASE64_CHARS)return {dataUrl:`data:image/jpeg;base64,${encoded}`,mediaType:"image/jpeg",recompressed:true};
      buffer=shrunk;
    }catch(error){
      console.error("Manga image recompression failed",{message:String(error?.message||error).slice(0,200)});
      return {...image,oversized:true};
    }
  }
  return {...image,oversized:true};
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

function buildArtDirection(prompt){
  return `Create one publication-quality portrait comic page for GhostwriterMe as finished 2D anime/manhwa artwork, never as a storyboard sketch or placeholder graphic.

ART QUALITY
- Draw attractive, original adult characters with coherent anatomy, elegant facial proportions, expressive luminous eyes, natural hands, and clearly differentiated silhouettes.
- Use clean tapered linework, detailed hair clumps and flyaway strands, believable fabric folds, polished cel shading, subtle gradients, cinematic rim light, and a layered environment with real depth.
- Make every panel feel deliberately composed: varied close-ups and medium shots, emotionally readable acting, purposeful negative space, clean gutters, and a strong top-to-bottom rhythm.
- For color manhwa or romance, favor a refined modern webtoon finish with soft atmospheric color, flattering skin tones, and controlled highlights. For black-and-white manga, use confident ink, screentone, cross-hatching, and dramatic value grouping instead of flat gray boxes.
- Preserve each character's face, hair, clothing, proportions, and palette across every panel and permitted reference image.

LETTERING AND SAFETY
- Render only the exact short dialogue supplied, in large high-contrast speech bubbles that stay inside their panels. If lettering would be unreliable, leave the bubble clean rather than inventing text.
- Use original characters and an original composition. Do not copy a copyrighted character, logo, signature, named artist, franchise, or existing comic panel. Translate named references into generic visual qualities only.
- No watermarks. No sexual content involving minors.

AVOID COMPLETELY
Stick figures, smiley faces, geometric mannequin heads, clip art, infographic layouts, flat colored rectangles, vector storyboards, rough thumbnails, placeholder art, childish doodles, malformed anatomy, extra fingers, duplicate characters, blank backgrounds, muddy contrast, photorealism, 3D renders, and tiny overflowing text.

PAGE BRIEF:
${prompt}`;
}

function preferredCloudError(errors){
  return errors.find(error=>[402,401,403,429].includes(Number(error?.statusCode||error?.status||0)))||errors[0]||new Error("No image renderer returned a page.");
}

function isGatewayAccountBlock(error){
  const status=Number(error?.statusCode||error?.status||0);
  const message=String(error?.message||"");
  return status===401||status===402||(status===403&&/AI Gateway|credit card|billing|fund|authentication|API key/i.test(message));
}

function isTimeout(error){
  return error?.name==="AbortError"||error?.name==="TimeoutError"||/abort|timeout|timed out/i.test(String(error?.message||""));
}

function isBadRequest(error){
  return Number(error?.statusCode||error?.status||0)===400;
}

// Manual controller rather than AbortSignal.timeout so the timer can be
// cleared as soon as the attempt settles (and never keeps the function alive).
function attemptSignal(ms){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1000,Math.floor(ms)));
  if(typeof timer?.unref==="function")timer.unref();
  return {signal:controller.signal,clear:()=>clearTimeout(timer)};
}

async function generateGeminiPage(prompt,references,model=PRIMARY_MODEL,{timeoutMs=PRIMARY_ATTEMPT_MS,imageOptions=GOOGLE_IMAGE_OPTIONS}={}){
  const {generateText}=await loadAiSdk();
  const input=references.length
    ?{messages:[{role:"user",content:[{type:"text",text:prompt},...references.map(reference=>({type:"image",image:reference.data,mediaType:reference.mediaType}))]}]}
    :{prompt};
  const request=async options=>{
    const attempt=attemptSignal(timeoutMs);
    try{
      return await generateText({
        model,
        ...input,
        maxRetries:1,
        abortSignal:attempt.signal,
        providerOptions:{gateway:{tags:["feature:manga-image","format:portrait-comic",`model:${model}`]},...(options?{google:options}:{})},
      });
    }finally{attempt.clear();}
  };
  let result;
  try{result=await request(imageOptions);}
  catch(error){
    if(!imageOptions||!isBadRequest(error))throw error;
    console.warn("Manga image provider rejected the Google image options; retrying without them",errorMeta(error,model,references));
    result=await request(null);
  }
  return imagePayload((result?.files||[]).find(file=>file?.mediaType?.startsWith("image/")));
}

async function generateFallbackPage(prompt,model,{timeoutMs=PRIMARY_ATTEMPT_MS}={}){
  const {generateImage}=await loadAiSdk();
  const attempt=attemptSignal(timeoutMs);
  let result;
  try{
    result=await generateImage({
      model,
      prompt,
      ...(model.startsWith("openai/")?{size:"1024x1536"}:{aspectRatio:"2:3"}),
      maxRetries:1,
      abortSignal:attempt.signal,
      providerOptions:{gateway:{tags:["feature:manga-image",`fallback:${model.split("/")[0]}`]}},
    });
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
  const prompt=typeof body?.prompt==="string"?body.prompt.trim():"";
  if(!prompt||prompt.length>12000)return res.status(400).json({error:"The manga page description is missing or too long."});
  let references;
  try{references=validateReferences(body.references);}catch(error){return res.status(400).json({error:error.message});}
  console.log("[manga-image] request",{referenceCount:references.length,promptLength:prompt.length});

  const artDirection=buildArtDirection(prompt);
  const startedAt=Date.now();
  const remaining=()=>TOTAL_BUDGET_MS-(Date.now()-startedAt);
  let timedOut=false;
  try{
    let image=null;let model=PRIMARY_MODEL;let primaryError=null;const cloudErrors=[];
    for(const multimodalModel of MULTIMODAL_MODELS){
      const budget=Math.min(PRIMARY_ATTEMPT_MS,remaining());
      if(budget<MIN_ATTEMPT_MS){timedOut=true;break;}
      model=multimodalModel;
      try{
        image=await generateGeminiPage(artDirection,references,multimodalModel,{timeoutMs:budget});
        if(!image)throw Object.assign(new Error("The multimodal image model returned no image file."),{statusCode:502});
        break;
      }catch(error){
        primaryError||=error;cloudErrors.push(error);
        console.error("Manga image multimodal model error",errorMeta(error,multimodalModel,references));
        if(isGatewayAccountBlock(error))throw error;
      }
    }
    if(!image){
      for(const fallbackModel of FALLBACK_MODELS){
        const budget=Math.min(PRIMARY_ATTEMPT_MS,remaining());
        if(budget<MIN_ATTEMPT_MS){timedOut=true;break;}
        model=fallbackModel;
        try{
          image=await generateFallbackPage(artDirection,fallbackModel,{timeoutMs:budget});
          if(image)break;
          throw Object.assign(new Error("The fallback image model returned no image file."),{statusCode:502});
        }catch(fallbackError){
          cloudErrors.push(fallbackError);
          console.error("Manga image fallback model error",errorMeta(fallbackError,fallbackModel,references));
          if(isGatewayAccountBlock(fallbackError))throw fallbackError;
        }
      }
      if(!image){
        if(timedOut||cloudErrors.every(isTimeout))throw Object.assign(new Error("Every illustrator ran out of time."),{statusCode:504});
        throw preferredCloudError(cloudErrors);
      }
    }
    const fitted=await fitResponseImage(image);
    if(fitted.oversized)throw Object.assign(new Error("The rendered page is too large to return."),{statusCode:413});
    console.log("[manga-image] success",{model,recompressed:!!fitted.recompressed,elapsedMs:Date.now()-startedAt,primaryStatus:Number(primaryError?.statusCode||primaryError?.status||0)||undefined});
    return res.status(200).json({image:{dataUrl:fitted.dataUrl,mediaType:fitted.mediaType},model,fallback:false});
  }catch(error){
    console.error("Manga image generation error",errorMeta(error,"gateway",references));
    const status=Number(error?.statusCode||error?.status||0);
    if(status===401||status===403)return res.status(503).json({error:"Vercel AI Gateway received the illustration request but this team does not currently have image-generation access. Add an eligible provider integration or complete the Gateway billing requirement, then press Redraw. No placeholder page was saved.",code:"IMAGE_GATEWAY_ACCESS_REQUIRED"});
    if(status===402)return res.status(402).json({error:"The AI Gateway image allowance has run out. Add Gateway credits before redrawing this page."});
    if(status===429)return res.status(429).json({error:"Manga Studio is busy. Wait a moment, then generate this page again."});
    if(status===504)return res.status(504).json({error:"This page took too long to illustrate. Press Redraw to try again, or reduce the panel count for a faster render."});
    if(status===413)return res.status(502).json({error:"The illustrator returned a page that was too large to deliver. Press Redraw to render it again."});
    return res.status(502).json({error:"The illustrated page could not be generated by either image model. Try a shorter scene or redraw one page."});
  }
}

module.exports=handler;
module.exports.config=config;
module.exports.validateReferences=validateReferences;
module.exports.buildArtDirection=buildArtDirection;
module.exports.fitResponseImage=fitResponseImage;
module.exports.GOOGLE_IMAGE_OPTIONS=GOOGLE_IMAGE_OPTIONS;
