const NUMBER_WORDS={
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,
};

const REQUESTED_SLIDES=/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty)\s+(?:slides?|pages?)\b/i;

export function requestedSlideCount(details){
  const match=String(details||"").match(REQUESTED_SLIDES);
  if(!match)return null;
  const parsed=/^\d+$/.test(match[1])?Number(match[1]):NUMBER_WORDS[match[1].toLowerCase()];
  return Number.isInteger(parsed)&&parsed>=1&&parsed<=30?parsed:null;
}

export function resolveSlideCount(details,selected){
  const requested=requestedSlideCount(details);
  const fallback=Math.max(1,Math.min(30,Number(selected)||8));
  return {count:requested||fallback,overridden:requested!==null};
}

export const EDITORIAL_VISUALS=["hero-image","image-cards","process","image-detail","icon-columns","equation","takeaway-grid"];
const EDITORIAL_LAYOUTS=["left-third","right-third","top-third","full-bleed"];
const LEGACY_VISUAL_MAP={
  fullbleed:"hero-image",
  gallery:"image-detail",
  comparison:"image-cards",
  metaphor:"process",
  constellation:"process",
  steps:"process",
  "big-number":"equation",
  "simple-chart":"equation",
  signal:"takeaway-grid",
  spotlight:"takeaway-grid",
};

const EDITORIAL_SEQUENCE=[
  {label:"Why it matters",role:"context",purpose:"Explain why the topic matters with an illustrated scene and two clear evidence cards.",visualType:"image-cards",layout:"right-third"},
  {label:"Core process",role:"process",purpose:"Reduce the central mechanism to two or three linked stages with simple symbols.",visualType:"process",layout:"top-third"},
  {label:"Inside the idea",role:"detail",purpose:"Use one close-up illustration and concise explanatory copy to make the idea concrete.",visualType:"image-detail",layout:"right-third"},
  {label:"Key components",role:"components",purpose:"Organize three important details into evenly spaced icon-led columns.",visualType:"icon-columns",layout:"top-third"},
  {label:"Evidence",role:"evidence",purpose:"Feature one equation, number, quotation, or compact proof card with a plain-language breakdown.",visualType:"equation",layout:"top-third"},
];

const clipWords=(value,limit)=>{
  const words=String(value||"").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  return words.length<=limit?words.join(" "):`${words.slice(0,limit).join(" ")}…`;
};

export function buildEditorialBlueprint(topic,count){
  const subject=String(topic||"").trim()||"Your presentation";
  const total=Math.max(1,Number(count)||1);
  if(total===1)return [{label:"Cover",role:"hook",purpose:`Introduce ${subject} with a memorable headline and one topic-specific illustration.`,visualType:"hero-image",layout:"left-third"}];
  const middleCount=Math.max(0,total-2);const occurrences={};
  const middle=Array.from({length:middleCount},(_,index)=>{
    const template=EDITORIAL_SEQUENCE[index%EDITORIAL_SEQUENCE.length];
    const occurrence=occurrences[template.role]||0;occurrences[template.role]=occurrence+1;
    return {...template,label:occurrence?`${template.label} ${occurrence+1}`:template.label};
  });
  return [
    {label:"Cover",role:"hook",purpose:`Introduce ${subject} with a memorable headline and one topic-specific illustration.`,visualType:"hero-image",layout:"left-third"},
    ...middle,
    {label:"Takeaway",role:"close",purpose:"Resolve the deck with one memorable takeaway and a compact recap of the most important ideas.",visualType:"takeaway-grid",layout:"right-third"},
  ];
}

export function normalizeEditorialDeck(deck,blueprint){
  const guides=Array.isArray(blueprint)?blueprint:[];
  return {
    ...deck,
    title:clipWords(deck?.title||"Slide Deck",12),
    subtitle:clipWords(deck?.subtitle||"",24),
    slides:(deck?.slides||[]).slice(0,guides.length||undefined).map((slide,index)=>{
      const guide=guides[index]||{};
      const requestedVisual=LEGACY_VISUAL_MAP[slide?.visualType]||slide?.visualType;
      const visualType=EDITORIAL_VISUALS.includes(requestedVisual)?requestedVisual:(guide.visualType||"image-detail");
      const layout=EDITORIAL_LAYOUTS.includes(slide?.layout)?slide.layout:(guide.layout||"left-third");
      return {
        ...slide,
        eyebrow:clipWords(slide?.eyebrow||guide.label||"Key idea",5),
        title:clipWords(slide?.title||guide.purpose||"One clear idea",12),
        supportingText:clipWords(slide?.supportingText||"",34),
        bullets:(slide?.bullets||[]).map(item=>clipWords(item,24)).filter(Boolean).slice(0,3),
        narrativeRole:guide.role||slide?.narrativeRole||"detail",
        isHumorBeat:false,
        visualType,
        layout,
        visualLabel:clipWords(slide?.visualLabel||slide?.dataValue||"",8),
        dataValue:clipWords(slide?.dataValue||"",12),
        dataLabel:clipWords(slide?.dataLabel||"",14),
        sourceUrls:(slide?.sourceUrls||[]).map(value=>String(value||"").trim()).filter(value=>/^https?:\/\//i.test(value)).slice(0,4),
      };
    }),
  };
}

export const slideNeedsIllustration=slide=>["hero-image","image-cards","image-detail","takeaway-grid"].includes(slide?.visualType);
