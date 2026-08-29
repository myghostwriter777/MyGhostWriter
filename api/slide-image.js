let aiSdkPromise;
const loadAiSdk=()=>aiSdkPromise||(aiSdkPromise=import("ai"));

const config={api:{bodyParser:{sizeLimit:"1mb"}},maxDuration:60};
const MODELS=["bfl/flux-2-flex","openai/gpt-image-2"];

function buildSlideImagePrompt({title="",direction="",theme="",layout="left-third"}={}){
  const emptySpace=layout==="right-third"?"right side":layout==="top-third"?"upper third":"left side";
  return `Create one publication-quality widescreen editorial illustration in a refined ${theme||"editorial"} art direction. The finish should resemble a premium educational magazine: confident hand-drawn linework, carefully painted color, dimensional lighting, rich topic-specific detail, and a clean contemporary composition. It must feel authored and illustrative, never like generic stock photography, clip art, a 3D icon pack, or an abstract placeholder.

SUBJECT: ${title}
VISUAL BRIEF: ${direction||"A topic-specific scene that communicates the core idea instantly."}

Compose for a 16:9 slide with the main subject away from the ${emptySpace}, leaving calm negative space there for editable presentation text. Use a clear focal point, layered foreground and background, controlled contrast, and a cohesive limited palette. Where appropriate, let foliage, architecture, clouds, terrain, or another scene element create an organic curved edge that can meet the slide background gracefully. Depict the concrete subject named in the brief accurately.

Do not include words, letters, numbers, charts, UI, logos, watermarks, borders, slide frames, or signatures. Do not imitate a named artist or copyrighted character.`;
}

function imagePayload(image){
  if(!image)return null;
  const base64=typeof image.base64==="string"?image.base64:Buffer.from(image.uint8Array||[]).toString("base64");
  if(!base64)return null;
  return {dataUrl:base64.startsWith("data:image/")?base64:`data:${image.mediaType||"image/png"};base64,${base64}`,mediaType:image.mediaType||"image/png"};
}

async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const prompt=buildSlideImagePrompt(req.body||{});
  if(prompt.length>8000)return res.status(400).json({error:"The slide visual description is too long."});
  const {generateImage}=await loadAiSdk();const errors=[];
  for(const model of MODELS){
    try{
      const result=await generateImage({model,prompt,...(model.startsWith("openai/")?{size:"1536x1024"}:{aspectRatio:"16:9"}),maxRetries:1,providerOptions:{gateway:{tags:["feature:slide-image",`model:${model}`]}}});
      const image=imagePayload(result?.image||result?.images?.[0]);
      if(image)return res.status(200).json({image,model});
      errors.push(new Error("The image model returned no file."));
    }catch(error){errors.push(error);}
  }
  const error=errors.find(item=>[401,402,403,429].includes(Number(item?.statusCode||item?.status||0)))||errors[0];const status=Number(error?.statusCode||error?.status||0);
  if(status===402)return res.status(402).json({error:"The AI image allowance has run out. You can still upload your own image."});
  if(status===429)return res.status(429).json({error:"The image studio is busy. Wait a moment and try again."});
  return res.status(502).json({error:"The AI visual could not be created. Try a shorter visual direction or upload an image."});
}

module.exports=handler;
module.exports.config=config;
module.exports.buildSlideImagePrompt=buildSlideImagePrompt;
