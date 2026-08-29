const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

const LAYOUT_DEFAULTS={
  "left-third":{
    eyebrow:{x:5,y:13,width:51},
    title:{x:5,y:36,width:52},
    supportingText:{x:5,y:64,width:52},
    image:{x:61,y:0,width:39,height:100},
  },
  "right-third":{
    eyebrow:{x:44,y:8,width:51},
    title:{x:44,y:17,width:51},
    supportingText:{x:44,y:39,width:51},
    image:{x:0,y:0,width:38,height:100},
  },
  "top-third":{
    eyebrow:{x:5,y:6,width:90},
    title:{x:5,y:14,width:90},
    supportingText:{x:5,y:72,width:90},
    image:{x:29,y:29,width:42,height:38},
  },
  "full-bleed":{
    eyebrow:{x:5,y:35,width:52},
    title:{x:5,y:46,width:52},
    supportingText:{x:5,y:76,width:52},
    image:{x:58,y:0,width:42,height:100},
  },
};

const EDITORIAL_DEFAULTS={
  "hero-image":LAYOUT_DEFAULTS["left-third"],
  "image-cards":LAYOUT_DEFAULTS["right-third"],
  process:{
    eyebrow:{x:5,y:6,width:90},title:{x:5,y:14,width:90},supportingText:{x:5,y:79,width:90},image:{x:29,y:28,width:42,height:43},
  },
  "image-detail":{
    eyebrow:{x:66,y:4,width:29},title:{x:66,y:10,width:29},supportingText:{x:66,y:47,width:29},image:{x:5,y:27,width:57,height:62},
  },
  "icon-columns":{
    eyebrow:{x:5,y:10,width:90},title:{x:5,y:19,width:90},supportingText:{x:5,y:43,width:90},image:{x:5,y:40,width:90,height:42},
  },
  equation:{
    eyebrow:{x:5,y:3,width:90},title:{x:5,y:8,width:90},supportingText:{x:52,y:39,width:43},image:{x:5,y:35,width:44,height:43},
  },
  "takeaway-grid":{
    eyebrow:{x:44,y:7,width:51},title:{x:44,y:15,width:51},supportingText:{x:44,y:35,width:51},image:{x:0,y:0,width:38,height:100},
  },
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

export const defaultSlideElementPosition=(layout,key,slide)=>{
  const defaults=EDITORIAL_DEFAULTS[slide?.visualType]||LAYOUT_DEFAULTS[layout]||LAYOUT_DEFAULTS["left-third"];
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
