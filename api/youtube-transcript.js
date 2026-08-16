export const config={api:{bodyParser:{sizeLimit:"64kb"}}};

const YOUTUBE_HOSTS=new Set(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtu.be"]);

function videoIdFromUrl(value){
  let url;
  try{url=new URL(String(value||"").trim());}catch{return"";}
  if(!YOUTUBE_HOSTS.has(url.hostname.toLowerCase()))return"";
  const id=url.hostname.toLowerCase()==="youtu.be"?url.pathname.split("/").filter(Boolean)[0]:url.searchParams.get("v")||url.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1];
  return /^[A-Za-z0-9_-]{11}$/.test(id||"")?id:"";
}

function extractCaptionTracks(html){
  const match=String(html||"").match(/"captionTracks":(\[.*?\])(?=,"audioTracks")/s);
  if(!match)return[];
  try{return JSON.parse(match[1]);}catch{return[];}
}

function transcriptFromJson3(data){
  return (data?.events||[]).map(event=>(event?.segs||[]).map(segment=>segment?.utf8||"").join("")).join(" ").replace(/\s+/g," ").trim();
}

function decodeXml(value){
  return String(value||"")
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16)))
    .replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}

function transcriptFromXml(xml){
  return [...String(xml||"").matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)].map(match=>decodeXml(match[1]).replace(/<[^>]+>/g,"")).join(" ").replace(/\s+/g," ").trim();
}

async function fetchText(url,signal){
  const response=await fetch(url,{signal,headers:{"User-Agent":"Mozilla/5.0 (compatible; GhostwriterMe/1.0)","Accept-Language":"en-US,en;q=0.8"}});
  if(!response.ok)throw new Error("source");
  return response.text();
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const id=videoIdFromUrl(req.body?.url);
  if(!id)return res.status(400).json({error:"Enter a valid YouTube video link."});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const watchUrl=`https://www.youtube.com/watch?v=${id}&hl=en`;
    const html=await fetchText(watchUrl,controller.signal);
    const tracks=extractCaptionTracks(html);
    if(!tracks.length)return res.status(422).json({error:"This video has no captions available. Choose a captioned public video or paste its transcript into the notes field."});
    const preferred=tracks.find(track=>track.kind!=="asr"&&String(track.languageCode||"").toLowerCase().startsWith("en"))||tracks.find(track=>String(track.languageCode||"").toLowerCase().startsWith("en"))||tracks.find(track=>track.kind!=="asr")||tracks[0];
    const baseUrl=String(preferred.baseUrl||"").replace(/\\u0026/g,"&");
    if(!baseUrl)throw new Error("captions");

    let transcript="";
    try{
      const jsonResponse=await fetch(baseUrl+(baseUrl.includes("?")?"&":"?")+"fmt=json3",{signal:controller.signal,headers:{"User-Agent":"Mozilla/5.0 (compatible; GhostwriterMe/1.0)"}});
      if(jsonResponse.ok)transcript=transcriptFromJson3(await jsonResponse.json());
    }catch{}
    if(!transcript){
      const xml=await fetchText(baseUrl,controller.signal);
      transcript=transcriptFromXml(xml);
    }
    transcript=transcript.slice(0,60000).trim();
    if(!transcript)return res.status(422).json({error:"The captions were found but could not be read. Try another caption track or paste the transcript into the notes field."});

    let title=`YouTube video ${id}`;let author="";
    try{
      const metadataResponse=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,{signal:controller.signal});
      if(metadataResponse.ok){const metadata=await metadataResponse.json();title=String(metadata.title||title).slice(0,240);author=String(metadata.author_name||"").slice(0,160);}
    }catch{}
    return res.status(200).json({id,title,author,language:String(preferred.languageCode||""),transcript});
  }catch(error){
    if(error?.name==="AbortError")return res.status(504).json({error:"YouTube took too long to answer. Please try again."});
    return res.status(502).json({error:"Ghosty could not read this video's captions. Check that the video is public and has captions, then try again."});
  }finally{clearTimeout(timeout);}
}

export {extractCaptionTracks,transcriptFromJson3,transcriptFromXml,videoIdFromUrl};

