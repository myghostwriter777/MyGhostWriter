// One layout engine for every slide surface. The live preview, fullscreen
// presentation, PDF, PNG/JPEG, PPTX and Word exports all render the block list
// produced here on a fixed 1600×900 stage, so what the user sees is what the
// file contains. Geometry follows an editorial deck: large accent headings,
// generous margins, image panels with organic edges, outlined cards and simple
// line glyphs.
import { defaultSlideElementPosition, normalizeSlideElementPosition, slideTitleScale } from "./slideEditor";
import { pickGlyph, pickGlyphSet } from "./slideGlyphs";
import { DEFAULT_SLIDE_FONT, slideFontStack, slidePointParts, slideSerifStack, withAlpha } from "./slideTheme";
import { slideSourceDomain } from "./slideSources";

export const STAGE={width:1600,height:900};
const W=STAGE.width,H=STAGE.height;
const MARGIN=96;

export const ILLUSTRATED_VISUALS=new Set(["hero-image","image-cards","image-detail","takeaway-grid"]);

const graphemes=value=>{
  try{if(typeof Intl!=="undefined"&&typeof Intl.Segmenter==="function")return Array.from(new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(String(value)),part=>part.segment);}catch{}
  return Array.from(String(value));
};

// Canvas-backed measurement in the browser; a width estimate in tests.
export function createTextMeasure(){
  let context=null;let resolved=false;
  const cache=new Map();
  return (text,size,weight=500,family=slideFontStack(DEFAULT_SLIDE_FONT),letterSpacing=0)=>{
    const value=String(text||"");
    if(!value)return 0;
    if(!resolved){resolved=true;try{context=typeof document!=="undefined"?document.createElement("canvas").getContext("2d"):null;}catch{context=null;}}
    const spacing=letterSpacing*Math.max(0,graphemes(value).length-1);
    if(!context?.measureText)return value.length*size*(weight>=700?0.6:0.55)+spacing;
    const key=`${weight}|${size}|${family}|${value}`;
    if(cache.has(key))return cache.get(key)+spacing;
    context.font=`${weight} ${size}px ${family}`;
    const width=context.measureText(value).width;
    if(cache.size>4000)cache.clear();
    cache.set(key,width);
    return width+spacing;
  };
}

// Wraps rich runs ([{text,weight,color,italic}]) into lines, breaking long
// unspaced words (URLs, Thai, CJK) by grapheme so nothing escapes its box.
export function wrapRuns(measure,runs,{width,size,family,letterSpacing=0,maxLines=Infinity}){
  const lines=[];let line=[];let lineWidth=0;
  const measureRun=(text,weight)=>measure(text,size,weight,family,letterSpacing);
  const pushLine=()=>{if(line.length){lines.push(line);line=[];lineWidth=0;}};
  const append=(text,run)=>{
    const last=line[line.length-1];
    if(last&&last.weight===run.weight&&last.color===run.color&&last.italic===run.italic)last.text+=text;
    else line.push({text,weight:run.weight,color:run.color,italic:run.italic});
    lineWidth+=measureRun(text,run.weight);
  };
  for(const run of runs){
    const weight=run.weight||500;
    const tokens=String(run.text||"").split(/(\s+)/).filter(Boolean);
    for(const token of tokens){
      if(/^\s+$/.test(token)){if(line.length)append(" ",{...run,weight});continue;}
      const tokenWidth=measureRun(token,weight);
      if(lineWidth+tokenWidth<=width||(!line.length&&tokenWidth<=width)){append(token,{...run,weight});continue;}
      if(line.length){pushLine();}
      if(tokenWidth<=width){append(token,{...run,weight});continue;}
      for(const character of graphemes(token)){
        const characterWidth=measureRun(character,weight);
        if(line.length&&lineWidth+characterWidth>width)pushLine();
        append(character,{...run,weight});
      }
    }
  }
  pushLine();
  const trimmed=lines.map(items=>{const copy=items.map(item=>({...item}));if(copy.length){copy[0].text=copy[0].text.replace(/^\s+/,"");copy[copy.length-1].text=copy[copy.length-1].text.replace(/\s+$/,"");}return copy.filter(item=>item.text.length);}).filter(items=>items.length);
  if(trimmed.length>maxLines){const kept=trimmed.slice(0,maxLines);const last=kept[kept.length-1];const end=last[last.length-1];end.text=end.text.replace(/[\s,.;:]+$/,"")+"…";return kept;}
  return trimmed;
}

export const lineText=line=>line.map(item=>item.text).join("");

// Organic panel edges in local coordinates. `curve-left` puts the wavy edge on
// the panel's left side (image on the right of the slide) and vice versa.
export function organicClipPath(kind,w,h,radius=18){
  const n=value=>Math.round(value*10)/10;
  if(kind==="curve-left")return `M ${n(w*0.17)} 0 H ${n(w)} V ${n(h)} H ${n(w*0.06)} C ${n(w*0.2)} ${n(h*0.8)}, ${n(-w*0.01)} ${n(h*0.63)}, ${n(w*0.07)} ${n(h*0.5)} C ${n(w*0.14)} ${n(h*0.37)}, ${n(w*0.03)} ${n(h*0.19)}, ${n(w*0.17)} 0 Z`;
  if(kind==="curve-right")return `M 0 0 H ${n(w*0.83)} C ${n(w*0.97)} ${n(h*0.19)}, ${n(w*0.86)} ${n(h*0.37)}, ${n(w*0.93)} ${n(h*0.5)} C ${n(w*1.01)} ${n(h*0.63)}, ${n(w*0.8)} ${n(h*0.8)}, ${n(w*0.94)} ${n(h)} H 0 Z`;
  if(kind==="none")return `M 0 0 H ${n(w)} V ${n(h)} H 0 Z`;
  const r=Math.min(radius,w/2,h/2);
  return `M ${r} 0 H ${n(w-r)} A ${r} ${r} 0 0 1 ${n(w)} ${r} V ${n(h-r)} A ${r} ${r} 0 0 1 ${n(w-r)} ${n(h)} H ${r} A ${r} ${r} 0 0 1 0 ${n(h-r)} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

// The wavy edge always faces the slide's text: an image parked on the right
// curves on its left side and vice versa. Uploaded photos keep clean corners.
export const imageClipKind=(slide,image,box)=>{
  const visual=slide?.visualType||"";
  if(slide?.layout==="full-bleed"||(box&&box.w>=W*0.98&&box.h>=H*0.98))return "none";
  if(image&&!image.generated)return "round";
  if(!ILLUSTRATED_VISUALS.has(visual))return "round";
  if(box&&box.h<H*0.9)return "round";
  const centre=box?box.x+box.w/2:W*0.75;
  return centre>W/2?"curve-left":"curve-right";
};

const pct=(value,axis)=>value/100*(axis==="x"?W:H);
const toStage=position=>({x:pct(position.x,"x"),y:pct(position.y,"y"),w:pct(position.width,"x"),h:position.height!=null?pct(position.height,"y"):undefined});

export function layoutSlide(deck,slide,index,options={}){
  const palette=options.palette;
  if(!palette)throw new Error("layoutSlide needs a palette.");
  const measure=options.measure||createTextMeasure();
  const family=slideFontStack(options.font||DEFAULT_SLIDE_FONT);
  const total=Math.max(1,Number(options.total)||(deck?.slides?.length||1));
  const titleSetting=Math.max(26,Math.min(48,Number(options.titleSize)||34));
  const bodySetting=Math.max(14,Math.min(28,Number(options.bodySize)||18));
  const bodyBase=Math.round(bodySetting*1.45);
  const layoutId=slide?.layout||"left-third";
  const visual=slide?.isSources?"sources":(slide?.visualType||"image-detail");
  const fullBleed=layoutId==="full-bleed";
  const positions=slide?.elementPositions||{};
  const cover=index===0&&visual==="hero-image";

  const text=(value,spec)=>{
    const content=spec.uppercase?String(value||"").toUpperCase():String(value||"");
    const runs=spec.runs||[{text:content,weight:spec.weight||500,color:spec.color,italic:spec.italic}];
    const lines=wrapRuns(measure,runs,{width:spec.w,size:spec.size,family:spec.family||family,letterSpacing:spec.letterSpacing||0,maxLines:spec.maxLines||12});
    const lineHeight=spec.lineHeight||1.3;
    return {kind:"text",x:spec.x,y:spec.y,w:spec.w,size:spec.size,weight:spec.weight||500,color:spec.color,lineHeight,maxLines:spec.maxLines||12,align:spec.align||"left",letterSpacing:spec.letterSpacing||0,family:spec.family||family,italic:!!spec.italic,underline:!!spec.underline,href:spec.href,field:spec.field,bulletIndex:spec.bulletIndex,text:content,runs,lines,h:Math.max(1,lines.length)*spec.size*lineHeight};
  };
  const labelRuns=(point,labelColor,detailColor,labelWeight=700)=>{
    const part=slidePointParts(point);
    return part.detail?[{text:part.label+": ",weight:labelWeight,color:labelColor},{text:part.detail,weight:500,color:detailColor}]:[{text:part.label,weight:600,color:labelColor}];
  };

  const layout={stage:{...STAGE},background:{color:palette.bg,glow:{cx:W*0.9,cy:H*0.12,r:W*0.42,color:withAlpha(palette.accent,palette.dark?0.16:0.12)}},panels:[],images:[],decor:[],groups:{},footer:[]};
  const bullets=(slide?.bullets||[]).map(item=>String(item||"").trim()).filter(Boolean).slice(0,3);
  const supporting=String(slide?.supportingText||"").trim();

  // Sources card: heading plus an underlined reference list.
  if(visual==="sources"){
    const body=bodyBase;
    const sources=(deck?.sources||[]).slice(0,10);
    const titleBox=toStage(normalizeSlideElementPosition(positions.title,{x:6,y:36,width:88}));
    const titleBlock=text(slide?.title||"Sources",{x:0,y:0,w:titleBox.w,size:Math.round(titleSetting*2.4),weight:800,color:palette.heading,lineHeight:1.05,maxLines:2,field:"title"});
    layout.groups.title={key:"title",box:titleBox,percent:normalizeSlideElementPosition(positions.title,{x:6,y:36,width:88}),blocks:[titleBlock]};
    const listBox=toStage(normalizeSlideElementPosition(positions.supportingText,{x:6,y:Math.min(60,36+(titleBlock.h/H*100)+5),width:88}));
    const columns=sources.length>5?2:1;const columnGap=64;const columnWidth=(listBox.w-(columns-1)*columnGap)/columns;const rows=Math.ceil(sources.length/columns);
    const blocks=[];let rowHeights=[];
    sources.forEach((source,sourceIndex)=>{
      const column=Math.floor(sourceIndex/rows),row=sourceIndex%rows;
      const y=rowHeights.slice(0,row).reduce((sum,value)=>sum+value,0);
      const bullet={kind:"circle",cx:column*(columnWidth+columnGap)+8,cy:y+body*0.72,r:5,fill:palette.text};
      const link=text(source.title||slideSourceDomain(source.url),{x:column*(columnWidth+columnGap)+30,y,w:columnWidth-30,size:body,weight:700,color:palette.accent,underline:true,href:source.url,maxLines:1,lineHeight:1.3});
      if(column===0)rowHeights.push(link.h+18);
      blocks.push(bullet,link);
    });
    if(!sources.length)blocks.push({kind:"rect",x:0,y:0,w:3,h:body*2.8,fill:palette.accent},text("Open Edit deck to add a source title and URL.",{x:24,y:body*0.4,w:listBox.w-24,size:body,weight:500,color:palette.muted}));
    layout.groups.body={key:"supportingText",box:listBox,percent:normalizeSlideElementPosition(positions.supportingText,{x:6,y:60,width:88}),blocks,noDrag:false};
    layout.footer=footerBlocks(deck,slide,index,total,palette,family,[]);
    return layout;
  }

  // Image or decorative panel.
  const images=(slide?.customImages||[]);
  const imageDefault=defaultSlideElementPosition(layoutId,"image",slide);
  if(images.length){
    images.forEach(image=>{
      const position=normalizeSlideElementPosition(image,imageDefault,{image:true});const box=toStage(position);
      layout.images.push({kind:"image",id:image.id,name:image.name,src:image.dataUrl,fit:image.fit==="contain"?"contain":"cover",generated:!!image.generated,clip:imageClipKind(slide,image,box),percent:position,...box});
    });
  }else if(ILLUSTRATED_VISUALS.has(visual)||fullBleed){
    const box=toStage(normalizeSlideElementPosition(null,imageDefault,{image:true}));
    layout.panels.push({kind:"panel",...box,clip:imageClipKind(slide,{generated:true},box),fill:[withAlpha(palette.accent,palette.dark?0.55:0.35),palette.bg2],glyph:{name:pickGlyph(`${slide?.title||""} ${slide?.visualDirection||""} ${deck?.title||""}`,index),color:withAlpha(palette.text,0.82),size:Math.min(box.w,box.h)*0.34},rings:withAlpha(palette.text,0.12)});
  }
  if(fullBleed)layout.decor.push({kind:"scrim",x:0,y:0,w:W*0.68,h:H,from:withAlpha(palette.bg,0.9),to:withAlpha(palette.bg,0)});

  // Eyebrow and title groups.
  const eyebrowPercent=normalizeSlideElementPosition(positions.eyebrow,defaultSlideElementPosition(layoutId,"eyebrow",slide));
  const eyebrowBox=toStage(eyebrowPercent);
  const eyebrowText=String(slide?.eyebrow||deck?.title||"").trim();
  if(eyebrowText){
    layout.groups.eyebrow={key:"eyebrow",box:eyebrowBox,percent:eyebrowPercent,blocks:[text(eyebrowText,{x:0,y:0,w:eyebrowBox.w,size:20,weight:800,color:palette.accent,letterSpacing:2.4,uppercase:true,maxLines:2,lineHeight:1.3,field:"eyebrow"})]};
  }
  const titlePercent=normalizeSlideElementPosition(positions.title,defaultSlideElementPosition(layoutId,"title",slide));
  const titleBox=toStage(titlePercent);
  const titleScale=slideTitleScale(slide?.title)*(visual==="image-detail"?0.84:1)*(visual==="hero-image"?1.08:1);
  const titleSize=Math.max(34,Math.round(titleSetting*2.05*titleScale));
  const titleBlock=text(slide?.title||"",{x:0,y:0,w:titleBox.w,size:titleSize,weight:800,color:palette.heading,lineHeight:1.1,maxLines:5,field:"title"});
  layout.groups.title={key:"title",box:titleBox,percent:titlePercent,blocks:[titleBlock]};

  // Body group starts below the measured title unless the user moved it.
  const bodyDefault=defaultSlideElementPosition(layoutId,"supportingText",slide);
  const bodyPercent=normalizeSlideElementPosition(positions.supportingText,bodyDefault);
  const bodyBox=toStage(bodyPercent);
  if(!positions.supportingText&&visual!=="process"){
    const naturalTop=titleBox.y+titleBlock.h+(visual==="hero-image"?34:28);
    const floor=(visual==="icon-columns"||visual==="equation")?bodyBox.y:0;
    bodyBox.y=Math.min(H*0.86,Math.max(floor,naturalTop));
  }
  const glyphStroke=2.4;
  const buildBody=fit=>{
    const bodyBlocks=[];
    const body=Math.max(16,Math.round(bodyBase*fit));

    const listBlocks=(startY,width,{dotColor=palette.accent,size=body}={})=>{
      let y=startY;
      bullets.forEach((point,bulletIndex)=>{
        const block=text(point,{x:30,y,w:width-30,size,weight:500,color:palette.text,lineHeight:1.42,maxLines:4,runs:labelRuns(point,palette.text,withAlpha(palette.text,0.82)),field:"bullet",bulletIndex});
        bodyBlocks.push({kind:"circle",cx:9,cy:y+size*0.72,r:5.5,fill:dotColor},block);
        y+=block.h+size*0.55;
      });
      return y;
    };
  
    if(visual==="image-cards"){
      let y=0;
      if(supporting){const block=text(supporting,{x:0,y,w:bodyBox.w,size:body,weight:500,color:withAlpha(palette.text,0.86),lineHeight:1.45,maxLines:3,field:"supportingText"});bodyBlocks.push(block);y+=block.h+26;}
      bullets.forEach((point,bulletIndex)=>{
        const part=slidePointParts(point);const pad=28;
        const label=text(part.label,{x:pad+6,y:y+pad,w:bodyBox.w-pad*2-6,size:Math.round(body*1.12),weight:700,color:palette.text,lineHeight:1.25,maxLines:2,field:part.detail?undefined:"bullet",bulletIndex});
        const detail=part.detail?text(part.detail,{x:pad+6,y:y+pad+label.h+10,w:bodyBox.w-pad*2-6,size:Math.round(body*0.94),weight:500,color:withAlpha(palette.text,0.82),lineHeight:1.45,maxLines:4}):null;
        const height=pad*2+label.h+(detail?detail.h+10:0);
        bodyBlocks.push({kind:"rect",x:0,y,w:bodyBox.w,h:height,fill:palette.card,stroke:palette.cardBorder,radius:14,bar:palette.accent,editable:{field:"bullet",bulletIndex}},label);
        if(detail)bodyBlocks.push(detail);
        y+=height+20;
      });
    }else if(visual==="takeaway-grid"){
      let y=0;
      if(supporting){
        const quote=text(supporting,{x:26,y,w:bodyBox.w-26,size:Math.round(body*1.08),weight:500,color:palette.text,lineHeight:1.42,maxLines:4,field:"supportingText"});
        bodyBlocks.push({kind:"rect",x:0,y:0,w:3,h:quote.h,fill:palette.accent},quote);y+=quote.h+30;
      }
      const gap=22;const halfWidth=(bodyBox.w-gap)/2;const pad=26;
      const cards=bullets.map((point,bulletIndex)=>{
        const part=slidePointParts(point);const full=bulletIndex===2||bullets.length===1;const width=full?bodyBox.w:halfWidth;
        const label=text(part.label,{x:0,y:0,w:width-pad*2,size:Math.round(body*1.08),weight:700,color:palette.text,lineHeight:1.25,maxLines:2});
        const detail=part.detail?text(part.detail,{x:0,y:0,w:width-pad*2,size:Math.round(body*0.9),weight:500,color:withAlpha(palette.text,0.8),lineHeight:1.42,maxLines:4}):null;
        return {part,full,width,label,detail,height:pad*2+label.h+(detail?detail.h+8:0),bulletIndex};
      });
      const rowHeight=Math.max(0,...cards.filter(card=>!card.full).map(card=>card.height));
      cards.forEach((card,position)=>{
        const x=card.full?0:(position%2)*(halfWidth+gap);
        const cardY=card.full&&position===2?y+rowHeight+gap:y;
        const height=card.full?card.height:rowHeight;
        bodyBlocks.push({kind:"rect",x,y:cardY,w:card.width,h:height,fill:palette.card,stroke:palette.cardBorder,radius:14,editable:{field:"bullet",bulletIndex:card.bulletIndex}});
        bodyBlocks.push({...card.label,x:x+pad,y:cardY+pad,field:card.detail?undefined:"bullet",bulletIndex:card.bulletIndex});
        if(card.detail)bodyBlocks.push({...card.detail,x:x+pad,y:cardY+pad+card.label.h+8});
      });
    }else if(visual==="icon-columns"){
      let y=0;
      if(supporting){const block=text(supporting,{x:0,y,w:bodyBox.w*0.72,size:body,weight:500,color:withAlpha(palette.text,0.84),lineHeight:1.45,maxLines:2,field:"supportingText"});bodyBlocks.push(block);y+=block.h+34;}
      const points=bullets.length?bullets:[];
      const columns=Math.max(1,Math.min(3,points.length||3));const gap=56;const columnWidth=(bodyBox.w-gap*(columns-1))/columns;
      const glyphs=pickGlyphSet(points.map(point=>slidePointParts(point).label+" "+slidePointParts(point).detail));
      points.forEach((point,bulletIndex)=>{
        const part=slidePointParts(point);const x=bulletIndex*(columnWidth+gap);
        bodyBlocks.push({kind:"glyph",name:glyphs[bulletIndex],x,y,size:54,color:palette.accent,strokeWidth:glyphStroke});
        const label=text(part.label,{x,y:y+54+22,w:columnWidth,size:Math.round(body*1.15),weight:700,color:palette.text,lineHeight:1.25,maxLines:2,field:part.detail?undefined:"bullet",bulletIndex});
        bodyBlocks.push(label);
        if(part.detail)bodyBlocks.push(text(part.detail,{x,y:y+54+22+label.h+10,w:columnWidth,size:Math.round(body*0.94),weight:500,color:withAlpha(palette.text,0.8),lineHeight:1.45,maxLines:5}));
      });
    }else if(visual==="process"){
      if(supporting)bodyBlocks.push(text(supporting,{x:0,y:0,w:bodyBox.w,size:body,weight:500,color:withAlpha(palette.text,0.84),lineHeight:1.45,maxLines:3,field:"supportingText"}));
      const stages=(bullets.length>=2?bullets:[...bullets,"Stage one","Stage two"].slice(0,2)).slice(0,3);
      const diameter=stages.length===3?226:268;const gap=stages.length===3?96:150;const totalWidth=stages.length*diameter+(stages.length-1)*gap;const startX=(W-totalWidth)/2;
      const cy=Math.round(H*0.485);
      const glyphs=pickGlyphSet(stages);
      stages.forEach((stage,stageIndex)=>{
        const cx=startX+stageIndex*(diameter+gap)+diameter/2;
        layout.decor.push({kind:"circle",cx,cy,r:diameter/2,stroke:palette.accent,strokeWidth:11,bodyDecor:true});
        layout.decor.push({kind:"glyph",name:glyphs[stageIndex],x:cx-diameter*0.19,y:cy-diameter*0.19,size:diameter*0.38,color:withAlpha(palette.text,0.92),strokeWidth:1.9,bodyDecor:true});
        layout.decor.push({...text(slidePointParts(stage).label,{x:cx-(diameter+gap)/2,y:cy+diameter/2+30,w:diameter+gap,size:Math.round(body*1.15),weight:700,color:palette.text,align:"center",lineHeight:1.25,maxLines:2}),bodyDecor:true});
        if(stageIndex<stages.length-1){const from=cx+diameter/2+14;layout.decor.push({kind:"arrow",x1:from,y1:cy,x2:from+gap-28,y2:cy,color:palette.accent,width:9,bodyDecor:true});}
      });
    }else if(visual==="equation"){
      const cardX=MARGIN,cardY=Math.round(H*0.37),cardW=Math.round(W*0.43),pad=32;
      const cardLabel=text(slide?.visualLabel||slide?.eyebrow||"",{x:cardX+pad,y:cardY+pad,w:cardW-pad*2,size:Math.round(body*1.05),weight:700,color:palette.heading,lineHeight:1.25,maxLines:1});
      const formula=text(slide?.dataValue||String(index+1).padStart(2,"0"),{x:cardX+pad,y:0,w:cardW-pad*2,size:Math.round(body*1.7),weight:500,color:palette.text,italic:true,family:slideSerifStack,align:"center",lineHeight:1.3,maxLines:3});
      const dataLabel=slide?.dataLabel?text(slide.dataLabel,{x:cardX+pad,y:0,w:cardW-pad*2,size:Math.round(body*0.9),weight:500,color:withAlpha(palette.text,0.82),lineHeight:1.45,maxLines:3}):null;
      const labelHeight=String(slide?.visualLabel||slide?.eyebrow||"").trim()?cardLabel.h+22:0;
      formula.y=cardY+pad+labelHeight;
      if(dataLabel)dataLabel.y=formula.y+formula.h+22;
      const cardH=Math.max(300,pad*2+labelHeight+formula.h+(dataLabel?dataLabel.h+22:0));
      layout.decor.push({kind:"rect",x:cardX,y:cardY,w:cardW,h:cardH,fill:palette.proof,radius:18,bodyDecor:true});
      if(labelHeight)layout.decor.push({...cardLabel,bodyDecor:true});
      layout.decor.push({...formula,bodyDecor:true});if(dataLabel)layout.decor.push({...dataLabel,bodyDecor:true});
      let y=0;
      if(supporting){const block=text(supporting,{x:0,y,w:bodyBox.w,size:body,weight:500,color:withAlpha(palette.text,0.86),lineHeight:1.45,maxLines:3,field:"supportingText"});bodyBlocks.push(block);y+=block.h+22;}
      listBlocks(y,bodyBox.w);
    }else{
      let y=0;
      if(supporting){const narrow=bodyBox.w<620;const block=text(supporting,{x:0,y,w:bodyBox.w,size:Math.round(body*(cover?1.08:narrow?0.94:1)),weight:500,color:withAlpha(palette.text,0.86),lineHeight:1.5,maxLines:cover?4:narrow?7:3,field:"supportingText"});bodyBlocks.push(block);y+=block.h+(bullets.length?22:0);}
      listBlocks(y,bodyBox.w);
    }
  
    return bodyBlocks;
  };
  let bodyFit=1;let bodyBlocks=buildBody(bodyFit);
  const bodyBottom=blocks=>bodyBox.y+Math.max(0,...blocks.map(block=>block.kind==="circle"?block.cy+block.r:block.kind==="glyph"?block.y+block.size:(block.y||0)+(block.h||0)));
  while(bodyBottom(bodyBlocks)>H-54&&bodyFit>0.66){bodyFit-=0.08;layout.decor=layout.decor.filter(block=>!block.bodyDecor);bodyBlocks=buildBody(bodyFit);}
  if(bodyBlocks.length||supporting||bullets.length)layout.groups.body={key:"supportingText",box:bodyBox,percent:{...bodyPercent,y:bodyBox.y/H*100},blocks:bodyBlocks};

  layout.footer=cover?[]:footerBlocks(deck,slide,index,total,palette,family,[...layout.panels,...layout.images]);
  return layout;
}

function footerBlocks(deck,slide,index,total,palette,family,occupied=[]){
  // A panel hugging the bottom-left corner would sit under the deck title, so
  // the title shifts to the text column (or disappears when no room is left).
  const blocker=occupied.find(box=>box.x<=MARGIN&&box.x+box.w>MARGIN&&box.y+box.h>=H-60);
  const leftX=blocker?blocker.x+blocker.w+MARGIN*0.96:MARGIN;
  const leftWidth=Math.max(0,Math.min(W*0.55,W-MARGIN-W*0.22-leftX-40));
  const cited=(slide?.sourceUrls||[]).map(url=>(deck?.sources||[]).findIndex(source=>source.url===url)+1).filter(value=>value>0);
  const right=`${cited.length?`Sources ${cited.join(", ")}  ·  `:""}${String(index+1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;
  const color=withAlpha(palette.text,0.55);
  return [
    ...(leftWidth>=260?[{kind:"text",x:leftX,y:H-52,w:leftWidth,size:17,weight:600,color,lineHeight:1.3,align:"left",letterSpacing:0.6,family,italic:false,text:String(deck?.title||""),runs:[{text:String(deck?.title||""),weight:600,color}],lines:[[{text:String(deck?.title||"").slice(0,90),weight:600,color}]],h:22,maxLines:1}]:[]),
    {kind:"text",x:W-MARGIN-W*0.22,y:H-52,w:W*0.22,size:17,weight:700,color,lineHeight:1.3,align:"right",letterSpacing:1.2,family,italic:false,text:right,runs:[{text:right,weight:700,color}],lines:[[{text:right,weight:700,color}]],h:22},
  ];
}
