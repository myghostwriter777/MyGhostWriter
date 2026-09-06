// Canvas export of exactly the same layout the on-screen SlideFrame shows.
// Used for PDF, PNG/JPEG, PPTX and Word. Plain JavaScript (no React) so it can
// also be exercised directly in a browser page.
import { createTextMeasure, layoutSlide, organicClipPath, STAGE } from "./slideLayout";
import { SLIDE_GLYPHS } from "./slideGlyphs";
import { slidePalette } from "./slideTheme";

const canvasFont=(block,weight,italic)=>`${italic?"italic ":""}${weight||block.weight||500} ${block.size}px ${block.family}`;

function drawText(ctx,block,ox,oy,measure){
  const spacing=block.letterSpacing||0;
  const supportsSpacing="letterSpacing" in ctx;
  if(supportsSpacing)ctx.letterSpacing=`${spacing}px`;
  ctx.textBaseline="alphabetic";
  const lineHeightPx=block.size*block.lineHeight;
  block.lines.forEach((line,lineIndex)=>{
    const widths=line.map(run=>{ctx.font=canvasFont(block,run.weight,run.italic||block.italic);const width=ctx.measureText(run.text).width+(supportsSpacing?0:spacing*Math.max(0,run.text.length-1));return width;});
    const lineWidth=widths.reduce((sum,value)=>sum+value,0);
    let x=ox+block.x+(block.align==="center"?(block.w-lineWidth)/2:block.align==="right"?block.w-lineWidth:0);
    const baseline=oy+block.y+lineIndex*lineHeightPx+(lineHeightPx-block.size)/2+block.size*0.82;
    line.forEach((run,runIndex)=>{
      ctx.font=canvasFont(block,run.weight,run.italic||block.italic);ctx.fillStyle=run.color||block.color;
      if(supportsSpacing||!spacing)ctx.fillText(run.text,x,baseline);
      else{let cursor=x;for(const character of run.text){ctx.fillText(character,cursor,baseline);cursor+=ctx.measureText(character).width+spacing;}}
      x+=widths[runIndex];
    });
    if(block.underline){ctx.strokeStyle=block.color;ctx.lineWidth=2;ctx.beginPath();const start=ox+block.x+(block.align==="center"?(block.w-lineWidth)/2:block.align==="right"?block.w-lineWidth:0);ctx.moveTo(start,baseline+6);ctx.lineTo(start+lineWidth,baseline+6);ctx.stroke();}
  });
  if(supportsSpacing)ctx.letterSpacing="0px";
}

function roundedRectPath(ctx,x,y,w,h,radius){
  const r=Math.min(radius||0,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

function drawGlyph(ctx,name,x,y,size,color,strokeWidth=2.4){
  const path=SLIDE_GLYPHS[name]||SLIDE_GLYPHS.sun;
  ctx.save();ctx.translate(x,y);ctx.scale(size/48,size/48);ctx.strokeStyle=color;ctx.lineWidth=strokeWidth;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke(new Path2D(path));ctx.restore();
}

function drawBlock(ctx,block,ox,oy,measure){
  if(block.kind==="text"){drawText(ctx,block,ox,oy,measure);return;}
  if(block.kind==="rect"){
    roundedRectPath(ctx,ox+block.x,oy+block.y,block.w,block.h,block.radius);
    if(block.fill){ctx.fillStyle=block.fill;ctx.fill();}
    if(block.stroke){ctx.strokeStyle=block.stroke;ctx.lineWidth=1.5;ctx.stroke();}
    if(block.bar){ctx.save();roundedRectPath(ctx,ox+block.x,oy+block.y,block.w,block.h,block.radius);ctx.clip();ctx.fillStyle=block.bar;ctx.fillRect(ox+block.x,oy+block.y,4,block.h);ctx.restore();}
    return;
  }
  if(block.kind==="circle"){
    ctx.beginPath();ctx.arc(ox+block.cx,oy+block.cy,block.r,0,Math.PI*2);
    if(block.fill){ctx.fillStyle=block.fill;ctx.fill();}
    if(block.stroke){ctx.strokeStyle=block.stroke;ctx.lineWidth=block.strokeWidth||2;ctx.stroke();}
    return;
  }
  if(block.kind==="glyph"){drawGlyph(ctx,block.name,ox+block.x,oy+block.y,block.size,block.color,block.strokeWidth);return;}
  if(block.kind==="arrow"){
    const stroke=block.width||8;const head=stroke*2.2;
    ctx.strokeStyle=block.color;ctx.lineWidth=stroke;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(ox+block.x1,oy+block.y1);ctx.lineTo(ox+block.x2-head,oy+block.y2);ctx.stroke();
    ctx.fillStyle=block.color;ctx.beginPath();ctx.moveTo(ox+block.x2-head*1.4,oy+block.y2-head);ctx.lineTo(ox+block.x2,oy+block.y2);ctx.lineTo(ox+block.x2-head*1.4,oy+block.y2+head);ctx.closePath();ctx.fill();
    return;
  }
  if(block.kind==="scrim"){
    const gradient=ctx.createLinearGradient(ox+block.x,0,ox+block.x+block.w,0);gradient.addColorStop(0,block.from);gradient.addColorStop(0.42,block.from);gradient.addColorStop(1,block.to);
    ctx.fillStyle=gradient;ctx.fillRect(ox+block.x,oy+block.y,block.w,block.h);
  }
}

export function drawSlideCanvas(deck,slide,index,options){
  const {width,height}=STAGE;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d");
  const palette=options.palette||slidePalette(options.background,options.theme,options.textColor);
  const measure=options.measure||createTextMeasure();
  const layout=layoutSlide(deck,slide,index,{palette,font:options.font,titleSize:options.titleSize,bodySize:options.bodySize,total:deck?.slides?.length||1,measure});
  ctx.fillStyle=layout.background.color;ctx.fillRect(0,0,width,height);
  const glow=layout.background.glow;const radial=ctx.createRadialGradient(glow.cx,glow.cy,0,glow.cx,glow.cy,glow.r);radial.addColorStop(0,glow.color);radial.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=radial;ctx.fillRect(0,0,width,height);
  for(const panel of layout.panels){
    ctx.save();ctx.translate(panel.x,panel.y);ctx.clip(new Path2D(organicClipPath(panel.clip,panel.w,panel.h)));
    const gradient=ctx.createLinearGradient(0,0,panel.w,panel.h);gradient.addColorStop(0,panel.fill[0]);gradient.addColorStop(1,panel.fill[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,panel.w,panel.h);
    ctx.strokeStyle=panel.rings;ctx.lineWidth=3;ctx.beginPath();ctx.arc(panel.w/2,panel.h/2,panel.glyph.size*0.95,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.globalAlpha=0.6;ctx.beginPath();ctx.arc(panel.w/2,panel.h/2,panel.glyph.size*1.35,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    drawGlyph(ctx,panel.glyph.name,panel.w/2-panel.glyph.size/2,panel.h/2-panel.glyph.size/2,panel.glyph.size,panel.glyph.color,1.7);
    ctx.restore();
  }
  for(const image of layout.images){
    const bitmap=options.imageMap?.get(image.id);if(!bitmap)continue;
    const ratio=(image.fit==="contain"?Math.min:Math.max)(image.w/bitmap.naturalWidth,image.h/bitmap.naturalHeight);
    const drawWidth=bitmap.naturalWidth*ratio,drawHeight=bitmap.naturalHeight*ratio;
    ctx.save();ctx.translate(image.x,image.y);ctx.clip(new Path2D(organicClipPath(image.clip,image.w,image.h)));
    if(image.fit!=="contain"){ctx.fillStyle=palette.bg2;ctx.fillRect(0,0,image.w,image.h);}
    ctx.drawImage(bitmap,(image.w-drawWidth)/2,(image.h-drawHeight)/2,drawWidth,drawHeight);ctx.restore();
  }
  for(const block of layout.decor)drawBlock(ctx,block,0,0,measure);
  for(const group of Object.values(layout.groups))for(const block of group.blocks)drawBlock(ctx,block,group.box.x,group.box.y,measure);
  for(const block of layout.footer)drawBlock(ctx,block,0,0,measure);
  return canvas;
}
