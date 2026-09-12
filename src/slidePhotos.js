// Helpers for sourcing real web photos for slides and citing them.
//
// A photo attached through /api/slide-photo carries a `credit` object
// ({title, pageUrl, imageUrl, domain, provider, license, author}). These
// helpers turn a slide into a search query, register the photo's page as a
// deck source (so it appears on the Sources card and in the slide footer
// citation), and produce the short credit line drawn under the picture.

const GENERIC_WORDS=new Set(["introduction","overview","conclusion","summary","summarize","agenda","takeaways","takeaway","key","matters","matter","why","how","what","when","where","which","who","the","and","for","with","from","into","your","our","this","that","these","those","about","of","to","in","on","at","by","a","an","is","are","was","were","be","it","its","as","or","vs","versus","next","steps","step","final","thoughts","thought","closing","opening","welcome","thank","thanks","questions","question","recap","points","point","insights","insight","lessons","lesson","learned","future","today","now","new","big","picture","deep","dive","look","looking","understanding","understand","explained","guide","basics","things","know","need","should","can","will","more","less","most","best","top","ways","way","tips","tip","you","we","they","their","them","one","two","three","four","five","first","second","third","through","across","over","under","between","against","during","before","after","above","below","toward","towards","around","along","among","within","without","via","per","some","any","all","each","every","very","just","also","than","then","there","here","has","have","had","does","did","not"]);

const words=value=>String(value||"").toLowerCase().replace(/[“”"'’`´]/g,"").replace(/[^\p{L}\p{N}\s-]+/gu," ").split(/\s+/).filter(Boolean);
const meaningful=value=>words(value).filter(word=>word.length>1&&!GENERIC_WORDS.has(word));
const unique=list=>{const seen=new Set();return list.filter(word=>{if(seen.has(word))return false;seen.add(word);return true;});};

// Builds the query sent to the image search: specific words from the slide
// title, anchored by the deck topic so "Process" on a photosynthesis deck
// finds leaves rather than flowcharts. Falls back to the visual direction
// when the title is generic.
export function buildSlidePhotoQuery(slide,{topic="",deckTitle="",index=0}={}){
  const topicWords=unique(meaningful(topic||deckTitle)).slice(0,5);
  const titleWords=unique(meaningful(slide?.title)).filter(word=>!topicWords.includes(word)).slice(0,5);
  const cover=index===0||(/hero-image/.test(String(slide?.visualType||""))&&!titleWords.length);
  let parts=cover?[...topicWords,...titleWords.slice(0,2)]:[...titleWords,...topicWords.slice(0,3)];
  if(parts.length<2){
    const direction=unique(meaningful(slide?.visualDirection)).filter(word=>!parts.includes(word)).slice(0,4);
    parts=[...parts,...direction];
  }
  if(!parts.length)parts=unique(meaningful(`${slide?.title||""} ${topic||""} ${deckTitle||""}`)).slice(0,6);
  return parts.join(" ").trim().slice(0,120);
}

export function isSlidePhoto(image){
  return Boolean(image?.photo&&image?.credit&&/^https?:\/\//i.test(String(image.credit.pageUrl||"")));
}

export function photoSourceId(credit){
  let hash=2166136261;
  for(const character of String(credit?.pageUrl||"")){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return `slide-photo-${(hash>>>0).toString(36)}`;
}

export function photoSourceEntry(credit){
  const title=String(credit?.title||"").trim()||String(credit?.domain||"").trim()||"Image source";
  const detail=[credit?.author?`by ${String(credit.author).trim()}`:"",credit?.license?String(credit.license).trim():""].filter(Boolean).join(", ");
  return {id:photoSourceId(credit),title:`Image: ${title}${detail?` (${detail})`:""}`.slice(0,180),url:String(credit?.pageUrl||"").trim()};
}

// Short attribution drawn on the slide beneath the picture.
export function photoCreditLine(credit){
  if(!credit)return "";
  const domain=String(credit.domain||"").trim();
  const author=String(credit.author||"").trim();
  const license=String(credit.license||"").trim();
  const parts=[author?author:"",license?license:"",domain];
  const line=`Photo: ${parts.filter(Boolean).join(" · ")}`;
  return line.length>96?`${line.slice(0,93).trimEnd()}…`:line;
}

// Every image and page URL already used in the deck, so the next search can
// skip them and the deck does not repeat one picture.
export function usedPhotoUrls(deck){
  const urls=[];
  (deck?.slides||[]).forEach(slide=>(slide?.customImages||[]).forEach(image=>{
    if(!isSlidePhoto(image))return;
    if(image.credit.imageUrl)urls.push(image.credit.imageUrl);
    if(image.credit.pageUrl)urls.push(image.credit.pageUrl);
  }));
  return urls;
}

const sourcesSlideText=count=>`${count} source${count===1?"":"s"} used in this deck`;

// Adds a sourced photo to one slide: the picture joins customImages, the page
// it came from joins deck.sources (once) and the slide's sourceUrls, and the
// Sources card count is refreshed.
export function attachSlidePhoto(deck,slideIndex,image,{replace=false}={}){
  if(!deck||!image)return deck;
  const credit=image.credit||{};
  const source=photoSourceEntry(credit);
  const existingSources=Array.isArray(deck.sources)?deck.sources:[];
  const hasSource=source.url&&existingSources.some(item=>String(item?.url||"").replace(/\/$/,"").toLowerCase()===source.url.replace(/\/$/,"").toLowerCase());
  const sources=source.url&&!hasSource?[...existingSources,source]:existingSources;
  const slides=(deck.slides||[]).map((slide,index)=>{
    if(index===slideIndex){
      const customImages=replace?[image]:[...(slide.customImages||[]).slice(0,4),image];
      const sourceUrls=source.url&&!(slide.sourceUrls||[]).includes(source.url)?[...(slide.sourceUrls||[]),source.url]:(slide.sourceUrls||[]);
      return {...slide,customImages,sourceUrls};
    }
    if(slide?.isSources)return {...slide,supportingText:sourcesSlideText(sources.length)};
    return slide;
  });
  return {...deck,sources,slides};
}

// Removing a photo also drops its citation when no other slide still uses it.
export function detachSlidePhotoSource(deck,removedImage){
  if(!deck||!isSlidePhoto(removedImage))return deck;
  const url=String(removedImage.credit.pageUrl||"").trim();
  const stillUsed=(deck.slides||[]).some(slide=>(slide.customImages||[]).some(image=>image!==removedImage&&isSlidePhoto(image)&&String(image.credit.pageUrl||"").trim()===url));
  if(stillUsed)return deck;
  const sources=(deck.sources||[]).filter(source=>String(source?.url||"").trim()!==url);
  return {...deck,sources,slides:(deck.slides||[]).map(slide=>slide?.isSources?{...slide,supportingText:sourcesSlideText(sources.length)}:{...slide,sourceUrls:(slide.sourceUrls||[]).filter(item=>item!==url)})};
}
