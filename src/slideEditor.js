const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

const LAYOUT_DEFAULTS={
  "left-third":{
    eyebrow:{x:6,y:12,width:48},
    title:{x:6,y:25,width:52},
    supportingText:{x:6,y:74,width:43},
    image:{x:58,y:16,width:34,height:64},
  },
  "right-third":{
    eyebrow:{x:54,y:12,width:40},
    title:{x:48,y:25,width:46},
    supportingText:{x:54,y:74,width:40},
    image:{x:7,y:16,width:34,height:64},
  },
  "top-third":{
    eyebrow:{x:8,y:8,width:70},
    title:{x:8,y:18,width:76},
    supportingText:{x:8,y:58,width:48},
    image:{x:57,y:38,width:36,height:52},
  },
  "full-bleed":{
    eyebrow:{x:7,y:55,width:44},
    title:{x:7,y:64,width:50},
    supportingText:{x:7,y:83,width:44},
    image:{x:57,y:12,width:36,height:72},
  },
};

export const editableSlideSupportingText=slide=>String(slide?.supportingText??slide?.bullets?.[0]??"");

export const slideTitleScale=value=>{
  const text=String(value||"").replace(/\s+/g," ").trim();
  const words=text?text.split(" ").length:0;
  if(text.length>100||words>18)return 0.58;
  if(text.length>78||words>14)return 0.68;
  if(text.length>55||words>10)return 0.78;
  if(text.length>38||words>7)return 0.88;
  return 1;
};

export const defaultSlideElementPosition=(layout,key)=>{
  const defaults=LAYOUT_DEFAULTS[layout]||LAYOUT_DEFAULTS["left-third"];
  return {...(defaults[key]||defaults.image)};
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
