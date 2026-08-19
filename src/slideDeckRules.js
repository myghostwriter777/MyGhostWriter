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

export function buildZenBlueprint(topic,count){
  const subject=String(topic||"").trim()||"Your presentation";
  const total=Math.max(1,Number(count)||1);
  return Array.from({length:total},(_,index)=>{
    const progress=total===1?1:index/(total-1);
    if(index===0)return {label:"Hook",purpose:`Open ${subject} with one memorable idea.`};
    if(index===total-1)return {label:"Close",purpose:"End with one clear takeaway or next action."};
    if(progress<0.34)return {label:"Context",purpose:"Give only the context the audience needs."};
    if(progress<0.7)return {label:"Proof",purpose:"Show one example, contrast, or piece of evidence."};
    return {label:"Meaning",purpose:"Turn the evidence into a useful implication."};
  });
}
