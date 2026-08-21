// Vercel executes this route as CommonJS, while AI SDK 7 is ESM-only. A
// top-level `import from "ai"` is rewritten to require("ai") by the function
// bundler and crashes before the handler can run. Keep the SDK behind Node's
// native dynamic import so production can actually reach the image models.
let aiSdkPromise;
const loadAiSdk=()=>aiSdkPromise||(aiSdkPromise=import("ai"));

const config={api:{bodyParser:{sizeLimit:"12mb"}},maxDuration:60};

const PRIMARY_MODEL="google/gemini-3.1-flash-image";
const FALLBACK_MODELS=["bfl/flux-2-flex","openai/gpt-image-2"];
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

async function generateGeminiPage(prompt,references){
  const {generateText}=await loadAiSdk();
  const content=[{type:"text",text:prompt},...references.map(reference=>({type:"image",image:reference.data,mediaType:reference.mediaType}))];
  const result=await generateText({
    model:PRIMARY_MODEL,
    messages:[{role:"user",content}],
    maxRetries:1,
    providerOptions:{gateway:{tags:["feature:manga-image","format:portrait-comic"]}},
  });
  return imagePayload((result?.files||[]).find(file=>file?.mediaType?.startsWith("image/")));
}

async function generateFallbackPage(prompt,model){
  const {generateImage}=await loadAiSdk();
  const result=await generateImage({
    model,
    prompt,
    ...(model.startsWith("openai/")?{size:"1024x1536"}:{aspectRatio:"2:3"}),
    maxRetries:1,
    providerOptions:{gateway:{tags:["feature:manga-image",`fallback:${model.split("/")[0]}`]}},
  });
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
  try{
    let image=null;let model=PRIMARY_MODEL;let primaryError=null;const cloudErrors=[];
    try{
      image=await generateGeminiPage(artDirection,references);
      if(!image)throw Object.assign(new Error("The primary image model returned no image file."),{statusCode:502});
    }catch(error){
      primaryError=error;cloudErrors.push(error);
      console.error("Manga image primary model error",errorMeta(error,PRIMARY_MODEL,references));
      for(const fallbackModel of FALLBACK_MODELS){
        model=fallbackModel;
        try{
          image=await generateFallbackPage(artDirection,fallbackModel);
          if(image)break;
          throw Object.assign(new Error("The fallback image model returned no image file."),{statusCode:502});
        }catch(fallbackError){
          cloudErrors.push(fallbackError);
          console.error("Manga image fallback model error",errorMeta(fallbackError,fallbackModel,references));
        }
      }
      if(!image)throw preferredCloudError(cloudErrors);
    }
    console.log("[manga-image] success",{model,primaryStatus:Number(primaryError?.statusCode||primaryError?.status||0)||undefined});
    return res.status(200).json({image,model,fallback:false});
  }catch(error){
    console.error("Manga image generation error",errorMeta(error,"gateway",references));
    const status=Number(error?.statusCode||error?.status||0);
    if(status===401||status===403)return res.status(503).json({error:"The finished-art renderer is not enabled for this deployment. No placeholder page was saved. Please try again after illustration access is restored."});
    if(status===402)return res.status(402).json({error:"The AI Gateway image allowance has run out. Add Gateway credits before redrawing this page."});
    if(status===429)return res.status(429).json({error:"Manga Studio is busy. Wait a moment, then generate this page again."});
    return res.status(502).json({error:"The illustrated page could not be generated by either image model. Try a shorter scene or redraw one page."});
  }
}

module.exports=handler;
module.exports.config=config;
module.exports.validateReferences=validateReferences;
module.exports.buildArtDirection=buildArtDirection;
