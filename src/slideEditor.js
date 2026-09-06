const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

// Percentages of the 1600×900 stage. Text columns keep a 6% margin; image
// panels hug a slide edge so their organic curve can meet the background.
const LAYOUT_DEFAULTS={
  "left-third":{
    eyebrow:{x:6,y:30,width:47},
    title:{x:6,y:35,width:47},
    supportingText:{x:6,y:64,width:45},
    image:{x:57.5,y:0,width:42.5,height:100},
  },
  "right-third":{
    eyebrow:{x:42.75,y:9,width:51.25},
    title:{x:42.75,y:13.5,width:51.25},
    supportingText:{x:42.75,y:40,width:51.25},
    image:{x:0,y:0,width:37,height:100},
  },
  "top-third":{
    eyebrow:{x:6,y:8,width:88},
    title:{x:6,y:12.5,width:88},
    supportingText:{x:6,y:74,width:88},
    image:{x:30,y:30,width:40,height:40},
  },
  "full-bleed":{
    eyebrow:{x:6,y:34,width:52},
    title:{x:6,y:39,width:52},
    supportingText:{x:6,y:70,width:50},
    image:{x:0,y:0,width:100,height:100},
  },
};

const EDITORIAL_DEFAULTS={
  "hero-image":LAYOUT_DEFAULTS["left-third"],
  "image-cards":LAYOUT_DEFAULTS["right-third"],
  process:{
    eyebrow:{x:6,y:8,width:88},title:{x:6,y:12.5,width:88},supportingText:{x:6,y:76,width:88},image:{x:30,y:29,width:40,height:42},
  },
  "image-detail":{
    eyebrow:{x:65,y:9,width:29},title:{x:65,y:13.5,width:29},supportingText:{x:65,y:46,width:29},image:{x:5,y:24,width:55,height:62},
  },
  "icon-columns":{
    eyebrow:{x:6,y:21,width:88},title:{x:6,y:26,width:88},supportingText:{x:6,y:47,width:88},image:{x:6,y:44,width:88,height:42},
  },
  equation:{
    eyebrow:{x:6,y:19,width:88},title:{x:6,y:23.5,width:88},supportingText:{x:52.5,y:38,width:41.5},image:{x:6,y:37,width:43,height:38},
  },
  "takeaway-grid":LAYOUT_DEFAULTS["right-third"],
};

export const editableSlideSupportingText=slide=>String(slide?.supportingText??"");

export const slideTitleScale=value=>{
  const text=String(value||"").replace(/\s+/g," ").trim();
  const words=text?text.split(" ").length:0;
  if(text.length>100||words>18)return 0.58;
  if(text.length>78||words>14)return 0.68;
  if(text.length>55||words>10)return 0.78;
  if(text.length>38||words>7)return 0.88;
  return 1;
};

// Each visual type has a natural layout. When the slide keeps that layout the
// hand-tuned editorial positions apply; when the user picks another layout the
// generic geometry for that layout takes over so the choice is visible.
const NATURAL_LAYOUT={"hero-image":"left-third","image-cards":"right-third",process:"top-third","image-detail":"right-third","icon-columns":"top-third",equation:"top-third","takeaway-grid":"right-third"};

export const defaultSlideElementPosition=(layout,key,slide)=>{
  const visual=slide?.visualType;
  const resolvedLayout=LAYOUT_DEFAULTS[layout]?layout:(NATURAL_LAYOUT[visual]||"left-third");
  const editorial=EDITORIAL_DEFAULTS[visual]&&NATURAL_LAYOUT[visual]===resolvedLayout?EDITORIAL_DEFAULTS[visual]:null;
  const defaults=editorial||LAYOUT_DEFAULTS[resolvedLayout];
  const fallback={...(defaults[key]||defaults.image)};
  if(key!=="supportingText"||!slide?.title)return fallback;
  const title=defaults.title;const scale=slideTitleScale(slide.title);
  const charactersPerLine=Math.max(12,Math.round(title.width*(scale<.7?.78:.58)));
  const estimatedLines=Math.max(1,Math.min(5,Math.ceil(String(slide.title).length/charactersPerLine)));
  const safeTop=title.y+estimatedLines*(8.2*scale)+4;
  return {...fallback,y:Math.min(86,Math.max(fallback.y,safeTop))};
};

export const normalizeSlideElementPosition=(value,fallback,{image=false}={})=>{
  const base={...fallback,...(value||{})};
  const width=clamp(base.width,image?8:14,100);
  const height=image?clamp(base.height,8,100):undefined;
  const x=clamp(base.x,0,100-width);
  const y=clamp(base.y,0,image?100-height:94);
  return image?{x,y,width,height}:{x,y,width};
};

export const moveSlideElement=(position,{dx=0,dy=0,canvasWidth=1,canvasHeight=1,image=false}={})=>{
  const safeWidth=Math.max(1,Number(canvasWidth)||1);
  const safeHeight=Math.max(1,Number(canvasHeight)||1);
  return normalizeSlideElementPosition({
    ...position,
    x:Number(position?.x||0)+(Number(dx)||0)/safeWidth*100,
    y:Number(position?.y||0)+(Number(dy)||0)/safeHeight*100,
  },position||{}, {image});
};

export const resizeSlideElement=(position,{dx=0,dy=0,canvasWidth=1,canvasHeight=1,image=false}={})=>{
  const safeWidth=Math.max(1,Number(canvasWidth)||1);
  const safeHeight=Math.max(1,Number(canvasHeight)||1);
  return normalizeSlideElementPosition({
    ...position,
    width:Number(position?.width||0)+(Number(dx)||0)/safeWidth*100,
    ...(image?{height:Number(position?.height||0)+(Number(dy)||0)/safeHeight*100}:{}),
  },position||{}, {image});
};

export const nudgeSlideElement=(position,{dx=0,dy=0,image=false}={})=>normalizeSlideElementPosition({
  ...position,
  x:Number(position?.x||0)+(Number(dx)||0),
  y:Number(position?.y||0)+(Number(dy)||0),
},position||{}, {image});
