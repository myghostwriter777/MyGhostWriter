import {generateImage} from "ai";

export const config={api:{bodyParser:{sizeLimit:"12mb"}}};

const MODEL="openai/gpt-image-2";
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
    return Buffer.from(base64,"base64");
  });
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
    const result=await generateImage({
      model:MODEL,
      prompt:references.length?{text:artDirection,images:references}:artDirection,
      size:"1024x1536",
      providerOptions:{openai:{quality:"medium",outputFormat:"jpeg",outputCompression:86}},
      maxRetries:1,
    });
    const image=result?.image||result?.images?.[0];
    if(!image)return res.status(502).json({error:"The image service returned an empty page. Please try again."});
    const base64=typeof image.base64==="string"?image.base64:Buffer.from(image.uint8Array||[]).toString("base64");
    const mediaType=image.mediaType||"image/png";
    if(!base64)return res.status(502).json({error:"The generated page could not be read. Please try again."});
    return res.status(200).json({image:{dataUrl:`data:${mediaType};base64,${base64}`,mediaType},model:MODEL});
  }catch(error){
    const status=Number(error?.statusCode||error?.status||0);
    if(status===401||status===403)return res.status(503).json({error:"Manga image generation is not connected to the production AI Gateway yet."});
    if(status===402)return res.status(402).json({error:"The AI Gateway image allowance is currently unavailable."});
    if(status===429)return res.status(429).json({error:"Manga Studio is busy. Wait a moment, then generate this page again."});
    return res.status(502).json({error:"The illustrated page could not be generated. Try a shorter scene or generate one page at a time."});
  }
}

export {validateReferences};
