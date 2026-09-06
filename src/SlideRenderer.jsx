import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import GwmIcon from "./GwmIcon";
import { createTextMeasure, layoutSlide, organicClipPath, STAGE } from "./slideLayout";
import { SLIDE_GLYPHS } from "./slideGlyphs";
import { DEFAULT_SLIDE_FONT, slideFontStack, slidePalette } from "./slideTheme";
import { moveSlideElement, nudgeSlideElement, resizeSlideElement } from "./slideEditor";

const EDIT_BLUE="#79BAEC";
const sharedMeasure=createTextMeasure();

// Scales the fixed 1600×900 stage to whatever box it is shown in, so text and
// geometry stay identical between the studio preview, fullscreen and exports.
function useStageScale(presenting){
  const ref=useRef(null);
  const [scale,setScale]=useState(0.3);
  useLayoutEffect(()=>{
    const element=ref.current;if(!element)return undefined;
    const update=()=>{
      const rect=element.getBoundingClientRect();
      const width=rect.width||element.clientWidth;const height=rect.height||element.clientHeight;
      if(!width)return;
      setScale(presenting?Math.min(width/STAGE.width,(height||width*9/16)/STAGE.height):width/STAGE.width);
    };
    update();
    if(typeof ResizeObserver!=="undefined"){const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect();}
    window.addEventListener("resize",update);return()=>window.removeEventListener("resize",update);
  },[presenting]);
  return [ref,scale];
}

export function DraggableSlideElement({position,image=false,editing=false,selected=false,label,onSelect,onChange,onDelete,children,zIndex}){
  const elementRef=useRef(null);const actionRef=useRef(null);
  const startAction=(mode,event)=>{
    if(!editing)return;if(event.target?.closest?.('[contenteditable="true"]')){event.stopPropagation();onSelect?.();return;}event.preventDefault();event.stopPropagation();onSelect?.();const shell=elementRef.current?.parentElement;if(!shell)return;
    const bounds=shell.getBoundingClientRect();actionRef.current={mode,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,position:{...position},width:bounds.width,height:bounds.height};event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveAction=event=>{
    const action=actionRef.current;if(!action||action.pointerId!==event.pointerId)return;event.preventDefault();const delta={dx:event.clientX-action.startX,dy:event.clientY-action.startY,canvasWidth:action.width,canvasHeight:action.height,image};
    onChange?.(action.mode==="resize"?resizeSlideElement(action.position,delta):moveSlideElement(action.position,delta));
  };
  const finishAction=event=>{if(actionRef.current?.pointerId===event.pointerId)actionRef.current=null;};
  const onKeyDown=event=>{
    if(!editing||event.target?.closest?.('[contenteditable="true"]'))return;const amount=event.shiftKey?5:1;const direction={ArrowLeft:[-amount,0],ArrowRight:[amount,0],ArrowUp:[0,-amount],ArrowDown:[0,amount]}[event.key];
    if(direction){event.preventDefault();onSelect?.();onChange?.(nudgeSlideElement(position,{dx:direction[0],dy:direction[1],image}));}
    if(image&&(event.key==="Delete"||event.key==="Backspace")){event.preventDefault();onDelete?.();}
  };
  return <div ref={elementRef} role={editing?"group":undefined} tabIndex={editing?0:undefined} aria-label={editing?`${label}. Drag to move. Use arrow keys for precise movement.`:undefined} onPointerDown={event=>startAction("move",event)} onPointerMove={moveAction} onPointerUp={finishAction} onPointerCancel={finishAction} onKeyDown={onKeyDown} onClick={event=>{if(editing){event.stopPropagation();onSelect?.();}}} style={{position:"absolute",left:`${position.x}%`,top:`${position.y}%`,width:`${position.width}%`,...(image?{height:`${position.height}%`}:{}),zIndex:zIndex??(image?2:3),touchAction:"none",cursor:editing?"move":"default",outline:selected?`4px solid ${EDIT_BLUE}`:"none",outlineOffset:8,borderRadius:image?8:4}}>
    {children}
    {editing&&selected&&<><span aria-hidden="true" style={{position:"absolute",left:0,top:-46,padding:"8px 14px",borderRadius:10,background:EDIT_BLUE,color:"#06101a",fontSize:18,fontWeight:900,letterSpacing:".06em",textTransform:"uppercase",whiteSpace:"nowrap",pointerEvents:"none"}}>{label}</span><button type="button" aria-label={`Resize ${label}`} onPointerDown={event=>startAction("resize",event)} onPointerMove={moveAction} onPointerUp={finishAction} onPointerCancel={finishAction} style={{position:"absolute",right:-30,bottom:-30,width:60,height:60,borderRadius:"50%",border:"4px solid #fff",background:EDIT_BLUE,color:"#06101a",display:"grid",placeItems:"center",cursor:"nwse-resize",touchAction:"none",boxShadow:"0 8px 24px rgba(0,0,0,.35)"}}><GwmIcon name="expand" size={26}/></button></>}
  </div>;
}

function GlyphSvg({name,size,color,strokeWidth=2.4,style}){
  const path=SLIDE_GLYPHS[name]||SLIDE_GLYPHS.sun;
  return <svg viewBox="0 0 48 48" width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={path}/></svg>;
}

function TextBlock({block,editing,onUpdateSlideField,onUpdateSlideBullet}){
  const editable=editing&&!!block.field;
  const commit=event=>{
    if(!editable)return;const value=event.currentTarget.textContent||"";
    if(block.field==="bullet")onUpdateSlideBullet?.(block.bulletIndex,value);else onUpdateSlideField?.(block.field,value);
  };
  const style={position:"absolute",left:block.x,top:block.y,width:block.w,minHeight:block.h,margin:0,fontSize:block.size,fontWeight:block.weight,color:block.color,lineHeight:block.lineHeight,textAlign:block.align,letterSpacing:block.letterSpacing?`${block.letterSpacing}px`:undefined,fontFamily:block.family,fontStyle:block.italic?"italic":"normal",textDecoration:block.underline?"underline":"none",textDecorationThickness:block.underline?2:undefined,textUnderlineOffset:block.underline?5:undefined,whiteSpace:"pre-wrap",overflowWrap:"anywhere",wordBreak:"break-word",...(editable?{}:{display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:block.maxLines||12,overflow:"hidden"})};
  const content=editable?block.text:block.runs.map((run,runIndex)=><span key={runIndex} style={{fontWeight:run.weight,color:run.color||block.color,fontStyle:run.italic?"italic":undefined}}>{run.text}</span>);
  if(block.href&&!editing)return <a href={block.href} target="_blank" rel="noreferrer" style={{...style,color:block.color}} onClick={event=>event.stopPropagation()}>{content}</a>;
  return <div className={editable?"slide-inline-copy":undefined} contentEditable={editable||undefined} suppressContentEditableWarning={editable||undefined} onClick={event=>editable&&event.stopPropagation()} onBlur={commit} style={style}>{content}</div>;
}

function Block({block,editing,onUpdateSlideField,onUpdateSlideBullet}){
  if(block.kind==="text")return <TextBlock block={block} editing={editing} onUpdateSlideField={onUpdateSlideField} onUpdateSlideBullet={onUpdateSlideBullet}/>;
  if(block.kind==="rect")return <div aria-hidden="true" style={{position:"absolute",left:block.x,top:block.y,width:block.w,height:block.h,background:block.fill,border:block.stroke?`1px solid ${block.stroke}`:"none",borderRadius:block.radius||0,boxSizing:"border-box",overflow:"hidden"}}>{block.bar&&<span style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:block.bar}}/>}</div>;
  if(block.kind==="circle")return <div aria-hidden="true" style={{position:"absolute",left:block.cx-block.r,top:block.cy-block.r,width:block.r*2,height:block.r*2,borderRadius:"50%",border:block.stroke?`${block.strokeWidth||2}px solid ${block.stroke}`:"none",background:block.fill||"transparent",boxSizing:"border-box"}}/>;
  if(block.kind==="glyph")return <GlyphSvg name={block.name} size={block.size} color={block.color} strokeWidth={block.strokeWidth} style={{position:"absolute",left:block.x,top:block.y}}/>;
  if(block.kind==="arrow"){
    const width=Math.max(4,block.x2-block.x1);const stroke=block.width||8;const head=stroke*2.2;const height=head*2+stroke;
    return <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position:"absolute",left:block.x1,top:block.y1-height/2}}><path d={`M0 ${height/2} H ${width-head}`} stroke={block.color} strokeWidth={stroke} strokeLinecap="round"/><path d={`M${width-head*1.4} ${height/2-head} L ${width} ${height/2} L ${width-head*1.4} ${height/2+head} Z`} fill={block.color}/></svg>;
  }
  if(block.kind==="scrim")return <div aria-hidden="true" style={{position:"absolute",left:block.x,top:block.y,width:block.w,height:block.h,background:`linear-gradient(90deg,${block.from} 0%,${block.from} 42%,${block.to} 100%)`,pointerEvents:"none"}}/>;
  return null;
}

function Panel({panel}){
  const clip=organicClipPath(panel.clip,panel.w,panel.h);
  return <div aria-hidden="true" style={{position:"absolute",left:panel.x,top:panel.y,width:panel.w,height:panel.h,clipPath:`path("${clip}")`,background:`linear-gradient(160deg,${panel.fill[0]} 0%,${panel.fill[1]} 100%)`,zIndex:1}}>
    <span style={{position:"absolute",left:"50%",top:"50%",width:panel.glyph.size*1.9,height:panel.glyph.size*1.9,marginLeft:-panel.glyph.size*0.95,marginTop:-panel.glyph.size*0.95,borderRadius:"50%",border:`3px solid ${panel.rings}`}}/>
    <span style={{position:"absolute",left:"50%",top:"50%",width:panel.glyph.size*2.7,height:panel.glyph.size*2.7,marginLeft:-panel.glyph.size*1.35,marginTop:-panel.glyph.size*1.35,borderRadius:"50%",border:`2px solid ${panel.rings}`,opacity:.6}}/>
    <GlyphSvg name={panel.glyph.name} size={panel.glyph.size} color={panel.glyph.color} strokeWidth={1.7} style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)"}}/>
  </div>;
}

const groupHeight=blocks=>Math.max(1,...blocks.map(block=>block.kind==="circle"?block.cy+block.r:block.kind==="glyph"?block.y+block.size:(block.y||0)+(block.h||0)));

export function SlideFrame({deck,slide,index,palette:paletteProp,theme,background,textColor,font=DEFAULT_SLIDE_FONT,titleSize=34,bodySize=18,presenting=false,onFullscreen,editing=false,selectedElement="",onSelectElement,onUpdateElementPosition,onRemoveImage,onUpdateSlideField,onUpdateSlideBullet,onAddImages,fixedScale}){
  const palette=paletteProp||slidePalette(background,theme,textColor);
  const [shellRef,measuredScale]=useStageScale(presenting);
  const scale=fixedScale||measuredScale;
  const layout=useMemo(()=>layoutSlide(deck,slide,index,{palette,font,titleSize,bodySize,total:deck?.slides?.length||1,measure:sharedMeasure}),[deck,slide,index,palette,font,titleSize,bodySize]);
  const shellStyle=fixedScale
    ?{position:"relative",width:STAGE.width*fixedScale,height:STAGE.height*fixedScale,overflow:"hidden",background:palette.bg,color:palette.text}
    :presenting
    ?{position:"relative",width:"min(100vw, calc(100vh * 16 / 9))",height:"min(100vh, calc(100vw * 9 / 16))",overflow:"hidden",background:palette.bg,color:palette.text}
    :{position:"relative",width:"100%",aspectRatio:"16 / 9",overflow:"hidden",borderRadius:12,background:palette.bg,color:palette.text,boxShadow:"0 16px 36px rgba(0,0,0,0.28)",isolation:"isolate"};
  const stageStyle={position:"absolute",left:0,top:0,width:STAGE.width,height:STAGE.height,transform:`scale(${scale})`,transformOrigin:"0 0",fontFamily:slideFontStack(font),color:palette.text,background:`radial-gradient(circle at ${layout.background.glow.cx}px ${layout.background.glow.cy}px,${layout.background.glow.color} 0,transparent ${layout.background.glow.r}px),${layout.background.color}`,overflow:"hidden"};
  const groups=Object.values(layout.groups);
  const labelFor={eyebrow:"Eyebrow",title:"Title",supportingText:"Body content"};
  return <div ref={shellRef} className="studio-slide-shell" onClick={()=>editing&&onSelectElement?.("")} onDragOver={event=>editing&&onAddImages&&event.preventDefault()} onDrop={event=>{if(!editing||!onAddImages)return;event.preventDefault();onAddImages([...(event.dataTransfer?.files||[])]);}} style={shellStyle}>
    <div data-slide-stage="true" style={stageStyle}>
      {layout.panels.map((panel,panelIndex)=><Panel key={panelIndex} panel={panel}/>)}
      {layout.images.map(image=>{const key=`image:${image.id}`;const clip=organicClipPath(image.clip,image.w,image.h);return <DraggableSlideElement key={image.id} position={image.percent} image editing={editing} selected={selectedElement===key} label={image.name||"Slide image"} onSelect={()=>onSelectElement?.(key)} onChange={value=>onUpdateElementPosition?.(image.id,value,true)} onDelete={()=>onRemoveImage?.(image.id)} zIndex={2}><div style={{width:"100%",height:"100%",clipPath:`path("${clip}")`,background:image.fit==="contain"?"transparent":palette.bg2}}><img src={image.src} alt={image.name||"Slide visual"} draggable="false" style={{width:"100%",height:"100%",display:"block",objectFit:image.fit,userSelect:"none",pointerEvents:"none"}}/></div></DraggableSlideElement>;})}
      {layout.decor.map((block,blockIndex)=><Block key={`decor-${blockIndex}`} block={block} editing={editing} onUpdateSlideField={onUpdateSlideField} onUpdateSlideBullet={onUpdateSlideBullet}/>)}
      {groups.map(group=>{const key=`text:${group.key}`;return <DraggableSlideElement key={group.key} position={group.percent} editing={editing} selected={selectedElement===key} label={labelFor[group.key]||group.key} onSelect={()=>onSelectElement?.(key)} onChange={value=>onUpdateElementPosition?.(group.key,value,false)} zIndex={3}><div style={{position:"relative",width:"100%",height:groupHeight(group.blocks)}}>{group.blocks.map((block,blockIndex)=><Block key={blockIndex} block={block} editing={editing} onUpdateSlideField={onUpdateSlideField} onUpdateSlideBullet={onUpdateSlideBullet}/>)}</div></DraggableSlideElement>;})}
      {layout.footer.map((block,blockIndex)=><Block key={`footer-${blockIndex}`} block={block}/>)}
    </div>
    {editing&&<div aria-hidden="true" style={{position:"absolute",left:10,bottom:9,zIndex:7,padding:"5px 7px",borderRadius:7,background:"rgba(3,8,14,.78)",color:"#dceeff",fontSize:9,fontWeight:800,pointerEvents:"none",backdropFilter:"blur(8px)"}}>Click text to type · drag elements · drop images here</div>}
    {onFullscreen&&<button type="button" aria-label="Present slides in fullscreen" title="Present fullscreen" onClick={event=>{event.stopPropagation();onFullscreen();}} style={{position:"absolute",top:12,right:12,zIndex:8,width:44,height:44,borderRadius:11,border:"1px solid rgba(255,255,255,0.22)",background:"rgba(3,8,14,0.74)",color:"#fff",display:"grid",placeItems:"center",cursor:"pointer",backdropFilter:"blur(10px)"}}><GwmIcon name="expand" size={19}/></button>}
  </div>;
}

export { drawSlideCanvas } from "./slideCanvas";
