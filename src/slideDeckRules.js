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

const ZEN_VISUALS=["fullbleed","big-number","simple-chart","comparison","signal"];
const ZEN_LAYOUTS=["left-third","right-third","top-third","full-bleed"];
const ZEN_LABEL_VARIANTS={
  context:["Context","Stakes","Frame"],
  tension:["Tension","Contrast","Friction"],
  proof:["Proof","Evidence","Example"],
  insight:["Meaning","Implication","Takeaway"],
};

const ZEN_PREVIEW_HEADINGS={
  hook:"Start with the tension",
  context:"Only the context that matters",
  tension:"Bring the gap into focus",
  proof:"One signal changes the picture",
  unexpected:"See it from a surprising angle",
  insight:"What the evidence really means",
  close:"Make the next move clear",
};

const clipWords=(value,limit)=>{
  const words=String(value||"").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  return words.length<=limit?words.join(" "):`${words.slice(0,limit).join(" ")}…`;
};

export function zenHumorIndex(count){
  const total=Math.max(1,Number(count)||1);
  return total<3?-1:Math.min(total-2,Math.max(1,Math.round((total-1)*0.62)));
}

export function buildZenBlueprint(topic,count){
  const subject=String(topic||"").trim()||"Your presentation";
  const total=Math.max(1,Number(count)||1);
  const humorIndex=zenHumorIndex(total);
  const blueprint=Array.from({length:total},(_,index)=>{
    const progress=total===1?1:index/(total-1);
    if(index===0)return {label:"Hook",role:"hook",purpose:`Open ${subject} with one memorable tension or promise.`,visualType:"fullbleed",layout:"right-third",isHumorBeat:false};
    if(index===total-1)return {label:"Close",role:"close",purpose:"Resolve the story with one clear takeaway or next action.",visualType:"spotlight",layout:"left-third",isHumorBeat:false};
    if(index===humorIndex)return {label:"Unexpected",role:"unexpected",purpose:"Wake up the audience with one surprising, business-appropriate visual analogy that reinforces the core message.",visualType:"metaphor",layout:"full-bleed",isHumorBeat:true};
    if(progress<0.27)return {label:"Context",role:"context",purpose:"Give only the context the audience needs to understand the stakes.",visualType:"signal",layout:index%2?"left-third":"right-third",isHumorBeat:false};
    if(progress<0.48)return {label:"Tension",role:"tension",purpose:"Make the cost, conflict, or gap concrete with one focused contrast.",visualType:"comparison",layout:index%2?"right-third":"left-third",isHumorBeat:false};
    if(progress<0.7)return {label:"Proof",role:"proof",purpose:"Show one example, simple data point, or piece of evidence without chart junk.",visualType:index%2?"big-number":"simple-chart",layout:index%2?"left-third":"right-third",isHumorBeat:false};
    return {label:"Meaning",role:"insight",purpose:"Turn the evidence into one useful implication and move toward resolution.",visualType:"signal",layout:index%2?"right-third":"left-third",isHumorBeat:false};
  });
  const seen={};
  return blueprint.map(item=>{
    const occurrence=seen[item.role]||0;seen[item.role]=occurrence+1;
    const variants=ZEN_LABEL_VARIANTS[item.role];
    const label=variants?(variants[occurrence]||`${variants[variants.length-1]} ${occurrence+1}`):item.label;
    return {...item,label,heading:ZEN_PREVIEW_HEADINGS[item.role]||"One clear idea at a time"};
  });
}

export function normalizeZenDeck(deck,blueprint){
  const guides=Array.isArray(blueprint)?blueprint:[];
  return {
    ...deck,
    title:clipWords(deck?.title||"Slide Deck",10),
    subtitle:clipWords(deck?.subtitle||"",18),
    slides:(deck?.slides||[]).slice(0,guides.length||undefined).map((slide,index)=>{
      const guide=guides[index]||{};
      const visualType=guide.isHumorBeat?"metaphor":(ZEN_VISUALS.includes(slide?.visualType)||slide?.visualType==="spotlight"||slide?.visualType==="metaphor"?slide.visualType:guide.visualType||"signal");
      const layout=ZEN_LAYOUTS.includes(slide?.layout)?slide.layout:guide.layout||"left-third";
      return {
        ...slide,
        eyebrow:clipWords(slide?.eyebrow||guide.label||"Key idea",4),
        title:clipWords(slide?.title||guide.purpose||"One clear idea",12),
        supportingText:clipWords(slide?.supportingText||(slide?.bullets||[])[0]||"",22),
        bullets:[],
        narrativeRole:guide.role||slide?.narrativeRole||"insight",
        isHumorBeat:!!guide.isHumorBeat,
        visualType,
        layout,
        visualLabel:clipWords(slide?.visualLabel||slide?.dataValue||"",5),
        dataValue:clipWords(slide?.dataValue||"",4),
        dataLabel:clipWords(slide?.dataLabel||"",8),
      };
    }),
  };
}
