// Finds a real, topic-related web photo for one slide and returns it together
// with where it came from, so the deck can cite the picture like any other
// source.
//
// Providers, in order:
//   1. Google Programmable Search (Custom Search JSON API, image search) when
//      GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID are configured.
//   2. Wikimedia Commons (no key required; every result carries a licence and
//      an author), used when Google is not configured, over quota, or empty.
//
// The chosen image is downloaded here rather than in the browser: hotlinked
// cross-origin pictures taint the slide canvas and would break the PDF, PNG,
// Word and PPTX exports, and many hosts refuse browser hotlinks anyway. The
// bytes are resized with sharp (bundled with @huggingface/transformers) so the
// JSON response stays far below Vercel's 4.5 MB response cap.

const config={api:{bodyParser:{sizeLimit:"64kb"}},maxDuration:30};

const USER_AGENT="GhostwriterMe/1.0 (slide image sourcing; https://ghostwriterme.app)";
const GOOGLE_ENDPOINT="https://www.googleapis.com/customsearch/v1";
const COMMONS_ENDPOINT="https://commons.wikimedia.org/w/api.php";
const TOTAL_BUDGET_MS=24000;
const SEARCH_TIMEOUT_MS=8000;
const DOWNLOAD_TIMEOUT_MS=7000;
const MAX_CANDIDATE_ATTEMPTS=4;
const MAX_DOWNLOAD_BYTES=8*1024*1024;
const MAX_RESPONSE_BASE64_CHARS=3200000;
const OUTPUT_MAX_WIDTH=1600;
const MIN_WIDTH=640;
const MIN_HEIGHT=360;
const ALLOWED_MIME=/^image\/(jpeg|png|webp)$/i;

let sharpModule;
function loadSharp(){
  if(sharpModule!==undefined)return sharpModule;
  try{sharpModule=require("sharp");}catch{sharpModule=null;}
  return sharpModule;
}

function cleanQuery(value){
  return String(value||"").replace(/[\x00-\x1f<>"{}|\\^`]/g," ").replace(/\s+/g," ").trim().slice(0,160);
}

function stripHtml(value){
  return String(value||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\s+/g," ").trim();
}

function domainOf(url){
  try{return new URL(url).hostname.replace(/^www\./,"");}catch{return "";}
}

function isHttpUrl(url){
  return /^https?:\/\//i.test(String(url||""));
}

function timeoutSignal(ms){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(500,ms));
  if(typeof timer?.unref==="function")timer.unref();
  return {signal:controller.signal,clear:()=>clearTimeout(timer)};
}

async function fetchJson(url,{headers={},timeoutMs=SEARCH_TIMEOUT_MS}={}){
  const attempt=timeoutSignal(timeoutMs);
  try{
    const response=await fetch(url,{headers:{"User-Agent":USER_AGENT,Accept:"application/json",...headers},signal:attempt.signal});
    const data=await response.json().catch(()=>null);
    return {ok:response.ok,status:response.status,data};
  }finally{attempt.clear();}
}

function googleConfig(env=process.env){
  const key=String(env.GOOGLE_SEARCH_API_KEY||env.GOOGLE_CSE_API_KEY||"").trim();
  const cx=String(env.GOOGLE_SEARCH_ENGINE_ID||env.GOOGLE_CSE_ID||"").trim();
  return key&&cx?{key,cx}:null;
}

// Google Custom Search JSON API, image mode. Each item is one picture with the
// page it was found on (contextLink), which is what the deck cites.
async function searchGoogle(query,{key,cx}){
  const params=new URLSearchParams({key,cx,q:query,searchType:"image",num:"10",safe:"active",imgType:"photo",filter:"1"});
  const {ok,status,data}=await fetchJson(`${GOOGLE_ENDPOINT}?${params.toString()}`);
  if(!ok){
    const message=String(data?.error?.message||`Google image search failed (${status}).`);
    throw Object.assign(new Error(message),{statusCode:status,provider:"google"});
  }
  return (Array.isArray(data?.items)?data.items:[]).map(item=>({
    provider:"google",
    imageUrl:String(item?.link||""),
    pageUrl:String(item?.image?.contextLink||""),
    title:stripHtml(item?.title||"").slice(0,180),
    domain:String(item?.displayLink||domainOf(item?.image?.contextLink||item?.link||"")).replace(/^www\./,""),
    mime:String(item?.mime||"").toLowerCase(),
    width:Number(item?.image?.width)||0,
    height:Number(item?.image?.height)||0,
    byteSize:Number(item?.image?.byteSize)||0,
    license:"",
    author:"",
  })).filter(item=>isHttpUrl(item.imageUrl)&&isHttpUrl(item.pageUrl));
}

// Wikimedia Commons search over file pages. iiurlwidth asks Commons for a
// pre-scaled copy so large originals never have to be downloaded.
async function searchWikimedia(query){
  const params=new URLSearchParams({
    action:"query",format:"json",formatversion:"2",origin:"*",
    generator:"search",gsrsearch:`${query} filetype:bitmap`,gsrnamespace:"6",gsrlimit:"12",
    prop:"imageinfo",iiprop:"url|size|mime|extmetadata",iiurlwidth:String(OUTPUT_MAX_WIDTH),
    iiextmetadatafilter:"Artist|LicenseShortName|ObjectName|ImageDescription",
  });
  const {ok,status,data}=await fetchJson(`${COMMONS_ENDPOINT}?${params.toString()}`);
  if(!ok)throw Object.assign(new Error(`Wikimedia Commons search failed (${status}).`),{statusCode:status,provider:"wikimedia"});
  const pages=Array.isArray(data?.query?.pages)?data.query.pages:Object.values(data?.query?.pages||{});
  return pages.map(page=>{
    const info=Array.isArray(page?.imageinfo)?page.imageinfo[0]:null;if(!info)return null;
    const meta=info.extmetadata||{};
    const name=String(page?.title||"").replace(/^File:/i,"").replace(/\.[a-z0-9]+$/i,"").replace(/_/g," ");
    return {
      provider:"wikimedia",
      imageUrl:String(info.thumburl||info.url||""),
      pageUrl:String(info.descriptionurl||`https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page?.title||""))}`),
      title:(stripHtml(meta.ObjectName?.value||"")||name).slice(0,180),
      domain:"commons.wikimedia.org",
      mime:String(info.mime||"").toLowerCase(),
      width:Number(info.thumbwidth||info.width)||0,
      height:Number(info.thumbheight||info.height)||0,
      byteSize:0,
      license:stripHtml(meta.LicenseShortName?.value||"").slice(0,60),
      author:stripHtml(meta.Artist?.value||"").slice(0,80),
    };
  }).filter(item=>item&&isHttpUrl(item.imageUrl)&&isHttpUrl(item.pageUrl));
}

function rankCandidates(candidates,exclude){
  const excluded=new Set(exclude.map(url=>String(url).trim().toLowerCase()));
  const seen=new Set();
  return candidates.filter(item=>{
    if(!ALLOWED_MIME.test(item.mime||"image/jpeg"))return false;
    if(item.width&&item.width<MIN_WIDTH)return false;
    if(item.height&&item.height<MIN_HEIGHT)return false;
    if(item.byteSize&&item.byteSize>MAX_DOWNLOAD_BYTES)return false;
    const key=item.imageUrl.toLowerCase();
    if(excluded.has(key)||excluded.has(item.pageUrl.toLowerCase())||seen.has(key))return false;
    seen.add(key);return true;
  }).sort((a,b)=>{
    // Prefer landscape pictures wide enough to fill a slide panel.
    const score=item=>{const ratio=item.width&&item.height?item.width/item.height:1.5;return (ratio>=1.15&&ratio<=2.2?2:ratio>=0.9?1:0)+(item.width>=1200?1:0);};
    return score(b)-score(a);
  });
}

async function downloadCandidate(candidate,timeoutMs){
  const attempt=timeoutSignal(timeoutMs);
  try{
    const response=await fetch(candidate.imageUrl,{headers:{"User-Agent":USER_AGENT,Accept:"image/jpeg,image/png,image/webp,image/*;q=0.8",Referer:candidate.pageUrl},signal:attempt.signal,redirect:"follow"});
    if(!response.ok)throw new Error(`Image download failed (${response.status}).`);
    const type=String(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
    if(!type.startsWith("image/"))throw new Error(`Not an image (${type||"unknown type"}).`);
    const length=Number(response.headers.get("content-length")||0);
    if(length>MAX_DOWNLOAD_BYTES)throw new Error("Image is too large.");
    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length)throw new Error("Empty image.");
    if(buffer.length>MAX_DOWNLOAD_BYTES)throw new Error("Image is too large.");
    return {buffer,mediaType:type};
  }finally{attempt.clear();}
}

async function encodeForSlide({buffer,mediaType}){
  const sharp=loadSharp();
  if(sharp){
    const pipeline=sharp(buffer,{failOn:"none"}).rotate().resize({width:OUTPUT_MAX_WIDTH,height:OUTPUT_MAX_WIDTH,fit:"inside",withoutEnlargement:true});
    const output=await pipeline.jpeg({quality:84,mozjpeg:true}).toBuffer({resolveWithObject:true});
    const base64=output.data.toString("base64");
    if(base64.length>MAX_RESPONSE_BASE64_CHARS)throw new Error("Image is too large after resizing.");
    return {dataUrl:`data:image/jpeg;base64,${base64}`,mediaType:"image/jpeg",width:output.info.width,height:output.info.height};
  }
  if(!ALLOWED_MIME.test(mediaType))throw new Error("Unsupported image format without sharp.");
  const base64=buffer.toString("base64");
  if(base64.length>MAX_RESPONSE_BASE64_CHARS)throw new Error("Image is too large to return without resizing.");
  return {dataUrl:`data:${mediaType};base64,${base64}`,mediaType,width:0,height:0};
}

async function findSlidePhoto({query,exclude=[],env=process.env,log=console}){
  const startedAt=Date.now();
  const remaining=()=>TOTAL_BUDGET_MS-(Date.now()-startedAt);
  const providersTried=[];
  const failures=[];
  let candidates=[];
  const google=googleConfig(env);
  if(google){
    providersTried.push("google");
    try{candidates=await searchGoogle(query,google);}
    catch(error){failures.push(error);log.warn?.("[slide-photo] Google search failed",{status:error?.statusCode,message:String(error?.message||"").slice(0,200)});}
  }
  candidates=rankCandidates(candidates,exclude);
  if(!candidates.length&&remaining()>SEARCH_TIMEOUT_MS){
    providersTried.push("wikimedia");
    try{candidates=rankCandidates(await searchWikimedia(query),exclude);}
    catch(error){failures.push(error);log.warn?.("[slide-photo] Wikimedia search failed",{status:error?.statusCode,message:String(error?.message||"").slice(0,200)});}
  }
  if(!candidates.length){
    if(!providersTried.length)throw Object.assign(new Error("No image search provider is configured."),{statusCode:503});
    if(failures.length===providersTried.length)throw Object.assign(new Error("The image search providers could not be reached."),{statusCode:502});
    throw Object.assign(new Error("No suitable web photo was found for this slide."),{statusCode:404});
  }
  let lastError=null;
  for(const candidate of candidates.slice(0,MAX_CANDIDATE_ATTEMPTS)){
    const budget=Math.min(DOWNLOAD_TIMEOUT_MS,remaining()-1500);
    if(budget<1500)break;
    try{
      const image=await encodeForSlide(await downloadCandidate(candidate,budget));
      return {
        image,
        source:{provider:candidate.provider,title:candidate.title||candidate.domain,pageUrl:candidate.pageUrl,imageUrl:candidate.imageUrl,domain:candidate.domain||domainOf(candidate.pageUrl),license:candidate.license||"",author:candidate.author||""},
        candidates:candidates.length,
        providers:providersTried,
      };
    }catch(error){lastError=error;log.warn?.("[slide-photo] candidate rejected",{imageUrl:candidate.imageUrl.slice(0,160),message:String(error?.message||"").slice(0,160)});}
  }
  throw Object.assign(new Error(lastError?"None of the matching photos could be downloaded.":"The photo search ran out of time."),{statusCode:lastError?502:504});
}

async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Could not parse the request."});}}
  const query=cleanQuery(body?.query);
  if(query.length<2)return res.status(400).json({error:"Describe the slide so a matching photo can be found."});
  const exclude=(Array.isArray(body?.exclude)?body.exclude:[]).filter(isHttpUrl).slice(0,60);
  try{
    const result=await findSlidePhoto({query,exclude});
    console.log("[slide-photo] success",{provider:result.source.provider,domain:result.source.domain,candidates:result.candidates});
    return res.status(200).json(result);
  }catch(error){
    const status=Number(error?.statusCode||0);
    console.error("[slide-photo] failed",{status,message:String(error?.message||"").slice(0,200),query});
    if(status===404)return res.status(404).json({error:"No suitable web photo was found for this slide. Try the AI visual or upload your own image.",code:"PHOTO_NOT_FOUND"});
    if(status===503)return res.status(503).json({error:"Web photo search is not configured for this deployment yet.",code:"PHOTO_SEARCH_UNAVAILABLE"});
    if(status===504)return res.status(504).json({error:"The photo search took too long. Try again or use the AI visual."});
    return res.status(502).json({error:"The web photo could not be fetched right now. Try again or use the AI visual."});
  }
}

module.exports=handler;
module.exports.config=config;
module.exports.findSlidePhoto=findSlidePhoto;
module.exports.rankCandidates=rankCandidates;
module.exports.searchGoogle=searchGoogle;
module.exports.searchWikimedia=searchWikimedia;
module.exports.googleConfig=googleConfig;
