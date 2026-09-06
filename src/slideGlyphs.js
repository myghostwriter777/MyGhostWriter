// Outlined line glyphs used inside process circles, icon columns and image
// placeholders. Paths live in a 48×48 box so the DOM (SVG) and canvas (Path2D)
// renderers draw exactly the same shapes.
export const SLIDE_GLYPHS={
  sun:"M24 16a8 8 0 1 0 0 16 8 8 0 1 0 0-16ZM24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.3 4.3M33.2 33.2l4.3 4.3M37.5 10.5l-4.3 4.3M14.8 33.2l-4.3 4.3",
  leaf:"M39 7C22 8 11 17 11 29c0 7 5 12 12 12 13 0 18-14 16-34ZM12 39c6-9 13-16 25-27",
  bolt:"m28 4-15 23h11l-4 17 15-24H24l4-16Z",
  cube:"M10 15 24 7l14 8v18l-14 8-14-8V15ZM10 15l14 8 14-8M24 23v18",
  pin:"M24 43s-13-12-13-22a13 13 0 0 1 26 0c0 10-13 22-13 22ZM24 27a6 6 0 1 0 0-12 6 6 0 1 0 0 12Z",
  bag:"M12 16h24l2 26H10l2-26ZM17 16v-3a7 7 0 0 1 14 0v3M19 30l5 5 6-8",
  drop:"M24 5s13 14 13 24a13 13 0 0 1-26 0C11 19 24 5 24 5ZM18 30a6 6 0 0 0 6 6",
  gear:"M24 31a7 7 0 1 0 0-14 7 7 0 1 0 0 14ZM24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M38.1 9.9l-4.2 4.2M14.1 33.9l-4.2 4.2",
  flask:"M18 5h12M20 5v13L9 38a3 3 0 0 0 2.6 4.5h24.8A3 3 0 0 0 39 38L28 18V5M14 30h20",
  globe:"M24 5a19 19 0 1 0 0 38 19 19 0 1 0 0-38ZM5 24h38M24 5c-6 6-9 12-9 19s3 13 9 19c6-6 9-12 9-19S30 11 24 5Z",
  heart:"M24 41S7 31 7 18a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 13-17 23-17 23Z",
  star:"m24 5 5.8 12.4L43 19.4l-9.6 9L35.7 42 24 35.4 12.3 42l2.3-13.6-9.6-9 13.2-2Z",
  people:"M18 22a6 6 0 1 0 0-12 6 6 0 1 0 0 12ZM32 24a5 5 0 1 0 0-10 5 5 0 1 0 0 10ZM6 40c0-8 5-13 12-13s12 5 12 13M30 40c0-6 3-10 9-10s7 4 7 10",
  chart:"M6 42h36M12 36V22M22 36V12M32 36V26M42 36V16",
  book:"M6 9h13c2 0 4 1.5 4 3.5V41c0-2-2-3.5-4-3.5H6ZM42 9H29c-2 0-4 1.5-4 3.5V41c0-2 2-3.5 4-3.5h13Z",
  clock:"M24 43a19 19 0 1 0 0-38 19 19 0 1 0 0 38ZM24 13v11l7 5",
  shield:"M24 5 39 10v12c0 9-6 16-15 21-9-5-15-12-15-21V10ZM17 24l5 5 9-10",
  atom:"M24 27a3 3 0 1 0 0-6 3 3 0 1 0 0 6ZM24 5c5 0 9 8.5 9 19s-4 19-9 19-9-8.5-9-19 4-19 9-19ZM7.5 14.5c2.5-4.3 12-3 21.2 2.3s15.3 12.6 12.8 17-12 3-21.2-2.3S5 18.8 7.5 14.5ZM40.5 14.5c-2.5-4.3-12-3-21.2 2.3S4 29.4 6.5 33.8s12 3 21.2-2.3 15.3-12.6 12.8-17Z",
  home:"M6 22 24 7l18 15M11 19v22h26V19M20 41V29h8v12",
  target:"M24 43a19 19 0 1 0 0-38 19 19 0 1 0 0 38ZM24 35a11 11 0 1 0 0-22 11 11 0 1 0 0 22ZM24 27a3 3 0 1 0 0-6 3 3 0 1 0 0 6Z",
  arrow:"M6 24h34M28 12l12 12-12 12",
  spark:"M24 6v10M24 32v10M6 24h10M32 24h10M12 12l6 6M30 30l6 6M36 12l-6 6M18 30l-6 6",
  money:"M6 12h36v24H6ZM24 31a7 7 0 1 0 0-14 7 7 0 1 0 0 14ZM12 18h.1M36 30h.1",
  brain:"M19 6a7 7 0 0 0-7 7 7 7 0 0 0-4 12 7 7 0 0 0 6 11c1 4 5 6 9 6V6ZM29 6a7 7 0 0 1 7 7 7 7 0 0 1 4 12 7 7 0 0 1-6 11c-1 4-5 6-9 6V6ZM18 22h6M24 32h6",
  wave:"M4 16c6-6 10-6 16 0s10 6 16 0 8-4 8-4M4 30c6-6 10-6 16 0s10 6 16 0 8-4 8-4",
  plant:"M24 43V22M24 30c-9 0-14-6-14-14 8 0 14 5 14 14ZM24 26c9 0 14-6 14-14-8 0-14 5-14 14Z",
  cell:"M24 43a19 19 0 1 0 0-38 19 19 0 1 0 0 38ZM22 27a5 5 0 1 0 0-10 5 5 0 1 0 0 10ZM33 32a2 2 0 1 0 0-4 2 2 0 1 0 0 4ZM14 33a2 2 0 1 0 0-4 2 2 0 1 0 0 4Z",
  rocket:"M24 4c6 5 9 13 9 22l5 6-6 1c-2 5-5 8-8 10-3-2-6-5-8-10l-6-1 5-6c0-9 3-17 9-22ZM24 25a4 4 0 1 0 0-8 4 4 0 1 0 0 8Z",
  camera:"M6 15h9l3-5h12l3 5h9v24H6ZM24 33a7 7 0 1 0 0-14 7 7 0 1 0 0 14Z",
  building:"M9 43V8h20v35M29 20h10v23M14 14h4M14 21h4M14 28h4M21 14h3M21 21h3M21 28h3M33 26h2M33 33h2",
  question:"M24 43a19 19 0 1 0 0-38 19 19 0 1 0 0 38ZM18 19a6 6 0 1 1 8 5.5c-1.5.7-2 1.5-2 3.5M24 34h.1",
};

export const GLYPH_NAMES=Object.keys(SLIDE_GLYPHS);

const KEYWORDS=[
  ["sun",/\b(sun|sunlight|light|solar|photon|radiation|shine|daylight)\b/i],
  ["leaf",/\b(leaf|leaves|plant|green|photosynth|chlorophyll|nature|eco|organic|forest|garden|botany|tree)\b/i],
  ["drop",/\b(water|rain|liquid|ocean|sea|river|hydro|fluid|blood|oil)\b/i],
  ["plant",/\b(seed|grow|growth|root|crop|agricultur|farm|sprout|cultivat|harvest)\b/i],
  ["cell",/\b(cell|biolog|dna|gene|organism|bacteria|virus|tissue|membrane|chloroplast|stroma|thylakoid)\b/i],
  ["atom",/\b(atom|physics|quantum|particle|nuclear|electron|element)\b/i],
  ["flask",/\b(chem|lab|experiment|reaction|equation|formula|compound|acid|molecule|glucose|carbon)\b/i],
  ["bolt",/\b(energy|power|electric|input|charge|speed|fast|voltage|fuel|force|atp)\b/i],
  ["pin",/\b(location|where|place|site|region|geograph|map|address|venue|habitat|country|city)\b/i],
  ["bag",/\b(output|result|product|deliver|yield|outcome|package|goods|export|supply)\b/i],
  ["globe",/\b(global|world|earth|international|planet|climate|atmosphere|environment|oxygen)\b/i],
  ["gear",/\b(process|mechanism|machine|engine|system|operation|workflow|method|stage|cycle)\b/i],
  ["people",/\b(people|team|customer|user|community|audience|society|human|staff|student|family)\b/i],
  ["chart",/\b(growth|market|revenue|data|statistic|trend|rate|percent|metric|analysis|sales)\b/i],
  ["money",/\b(cost|price|money|budget|finance|profit|fund|invest|econom|pay)\b/i],
  ["heart",/\b(health|heart|care|love|wellbeing|medical|patient|emotion)\b/i],
  ["shield",/\b(safety|secure|protect|risk|defen|privacy|immune|trust|guard)\b/i],
  ["brain",/\b(brain|mind|think|cognit|intelligen|memory|psycholog|neural)\b/i],
  ["rocket",/\b(launch|mission|space|innovation|startup|accelerat)\b/i],
  ["home",/\b(home|house|housing|shelter|domestic|architecture)\b/i],
  ["building",/\b(company|business|office|industry|factory|organisation|organization|institution|urban)\b/i],
  ["wave",/\b(sound|wave|signal|frequency|music|vibration|communication|radio)\b/i],
  ["camera",/\b(photo|image|visual|film|video|picture|camera|media|art|design)\b/i],
  ["book",/\b(history|story|learn|study|research|knowledge|theory|literature|education|curriculum)\b/i],
  ["clock",/\b(time|schedule|timeline|duration|period|era|deadline|century)\b/i],
  ["target",/\b(goal|target|aim|objective|focus|strategy|priority|purpose)\b/i],
  ["star",/\b(quality|best|excellen|award|highlight|premium|success|win|takeaway|summary)\b/i],
  ["spark",/\b(insight|spark|creativ|inspir|discover|breakthrough|idea)\b/i],
  ["question",/\b(question|problem|challenge|issue|debate|unknown|mystery)\b/i],
];

const ROTATION=["sun","leaf","bolt","cube","pin","bag","gear","globe","star","chart","people","flask"];

// Picks a topical glyph from the text when a keyword matches, otherwise walks
// a fixed rotation so neighbouring items never repeat the same shape.
export const pickGlyph=(text,index=0,avoid=[])=>{
  const source=String(text||"");
  const matched=KEYWORDS.find(([,pattern])=>pattern.test(source))?.[0];
  if(matched&&!avoid.includes(matched))return matched;
  for(let step=0;step<ROTATION.length;step+=1){
    const candidate=ROTATION[(index+step)%ROTATION.length];
    if(!avoid.includes(candidate))return candidate;
  }
  return ROTATION[index%ROTATION.length];
};

export const pickGlyphSet=(labels=[])=>{
  const chosen=[];
  labels.forEach((label,index)=>{chosen.push(pickGlyph(label,index,chosen));});
  return chosen;
};
