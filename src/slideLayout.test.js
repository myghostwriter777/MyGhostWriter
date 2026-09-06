import { createTextMeasure, imageClipKind, layoutSlide, lineText, organicClipPath, STAGE, wrapRuns } from "./slideLayout";
import { slidePalette } from "./slideTheme";
import { buildEditorialBlueprint, normalizeEditorialDeck } from "./slideDeckRules";
import { withSourcesSlide } from "./slideSources";

// jsdom has no canvas; the layout falls back to width estimates.
HTMLCanvasElement.prototype.getContext=()=>null;
const palette=slidePalette("#0f1140","editorial","#f8fbff");
const measure=createTextMeasure();
const options={palette,font:"Poppins",titleSize:34,bodySize:18,measure};

const blueprint=buildEditorialBlueprint("Photosynthesis",8);
const deck=withSourcesSlide(normalizeEditorialDeck({
  title:"Photosynthesis: Converting Sunlight into Life",
  subtitle:"A college-level exploration",
  slides:blueprint.map((guide,index)=>({
    eyebrow:guide.label,
    title:index===0?"Photosynthesis: Converting Sunlight into Life":`${guide.label} of photosynthesis explained clearly`,
    supportingText:"Energy from sunlight is harvested and converted into usable chemical potential energy that sustains almost every food web on Earth.",
    bullets:["Location: Occurs in the stroma, the fluid surrounding the thylakoid membranes inside the chloroplast.","Energy input: Consumes ATP and NADPH produced during the light reactions.","Output: Fixes carbon dioxide into glucose and other organic compounds."],
    visualType:guide.visualType,layout:guide.layout,dataValue:"6CO2 + 6H2O + light → C6H12O6 + 6O2",dataLabel:"Six molecules of carbon dioxide and six of water yield one glucose molecule.",visualLabel:"The reaction",sourceUrls:["https://www.ncbi.nlm.nih.gov/books/NBK9861/"],
  })),
},blueprint),[{title:"Photosynthesis - The Cell - NCBI Bookshelf",url:"https://www.ncbi.nlm.nih.gov/books/NBK9861/"}]);

const allBlocks=layout=>[...layout.decor,...layout.footer,...Object.values(layout.groups).flatMap(group=>group.blocks.map(block=>({...block,x:block.x+group.box.x,y:block.y+group.box.y})))];
const bounds=block=>{
  if(block.kind==="circle")return {left:block.cx-block.r,top:block.cy-block.r,right:block.cx+block.r,bottom:block.cy+block.r};
  if(block.kind==="arrow")return {left:Math.min(block.x1,block.x2),top:Math.min(block.y1,block.y2)-20,right:Math.max(block.x1,block.x2),bottom:Math.max(block.y1,block.y2)+20};
  if(block.kind==="glyph")return {left:block.x,top:block.y,right:block.x+block.size,bottom:block.y+block.size};
  return {left:block.x,top:block.y,right:block.x+(block.w||0),bottom:block.y+(block.h||0)};
};

describe("slide layout engine",()=>{
  test("wraps rich runs by words and breaks unspaced strings",()=>{
    const lines=wrapRuns(measure,[{text:"Label: ",weight:700},{text:"a fairly long explanation that must wrap onto more than one line",weight:500}],{width:260,size:24});
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0][0].weight).toBe(700);
    const long=wrapRuns(measure,[{text:"https://example.com/a/very/long/path/without/spaces/that/never/ends",weight:500}],{width:200,size:20});
    expect(long.length).toBeGreaterThan(1);
    expect(lineText(long[0]).length).toBeGreaterThan(0);
    const clamped=wrapRuns(measure,[{text:"one two three four five six seven eight nine ten",weight:500}],{width:120,size:20,maxLines:2});
    expect(clamped).toHaveLength(2);
    expect(lineText(clamped[1])).toMatch(/…$/);
  });

  test("keeps every block inside the stage for the whole deck",()=>{
    deck.slides.forEach((slide,index)=>{
      const layout=layoutSlide(deck,slide,index,{...options,total:deck.slides.length});
      for(const block of allBlocks(layout)){
        const box=bounds(block);
        expect(box.left).toBeGreaterThanOrEqual(-1);
        expect(box.top).toBeGreaterThanOrEqual(-1);
        expect(box.right).toBeLessThanOrEqual(STAGE.width+1);
        expect(box.bottom).toBeLessThanOrEqual(STAGE.height+1);
      }
    });
  });

  test("places the body below the measured title so text never overlaps",()=>{
    deck.slides.filter(slide=>!slide.isSources).forEach((slide,index)=>{
      const layout=layoutSlide(deck,slide,index,options);
      const title=layout.groups.title;const body=layout.groups.body;
      if(!body)return;
      const titleBottom=title.box.y+title.blocks[0].h;
      if(slide.visualType!=="process")expect(body.box.y).toBeGreaterThanOrEqual(titleBottom);
    });
  });

  test("gives illustrated slides an image panel that faces the text",()=>{
    const cover=layoutSlide(deck,deck.slides[0],0,options);
    expect(cover.panels).toHaveLength(1);
    expect(cover.panels[0].clip).toBe("curve-left");
    expect(cover.panels[0].x).toBeGreaterThan(STAGE.width/2);
    expect(cover.footer).toHaveLength(0);
    const cards=layoutSlide(deck,deck.slides[1],1,options);
    expect(cards.panels[0].clip).toBe("curve-right");
    expect(cards.groups.body.blocks.filter(block=>block.kind==="rect")).toHaveLength(3);
    expect(cards.footer).toHaveLength(2);
    expect(imageClipKind({visualType:"hero-image"},{generated:false},{x:900,y:0,w:700,h:900})).toBe("round");
    expect(imageClipKind({visualType:"hero-image",layout:"full-bleed"},{generated:true},{x:0,y:0,w:1600,h:900})).toBe("none");
  });

  test("uses a real image instead of the placeholder panel when one exists",()=>{
    const slide={...deck.slides[0],customImages:[{id:"img",dataUrl:"data:image/png;base64,AAAA",generated:true,x:57.5,y:0,width:42.5,height:100}]};
    const layout=layoutSlide(deck,slide,0,options);
    expect(layout.panels).toHaveLength(0);
    expect(layout.images).toHaveLength(1);
    expect(layout.images[0].clip).toBe("curve-left");
  });

  test("draws process stages, icon columns, and the equation card from slide content",()=>{
    const process=deck.slides.find(slide=>slide.visualType==="process");
    const processLayout=layoutSlide(deck,process,2,options);
    expect(processLayout.decor.filter(block=>block.kind==="circle")).toHaveLength(3);
    expect(processLayout.decor.filter(block=>block.kind==="arrow")).toHaveLength(2);
    const columns=deck.slides.find(slide=>slide.visualType==="icon-columns");
    const columnLayout=layoutSlide(deck,columns,4,options);
    const glyphs=columnLayout.groups.body.blocks.filter(block=>block.kind==="glyph");
    expect(glyphs).toHaveLength(3);
    expect(new Set(glyphs.map(glyph=>glyph.name)).size).toBe(3);
    const equation=deck.slides.find(slide=>slide.visualType==="equation");
    const equationLayout=layoutSlide(deck,equation,5,options);
    expect(equationLayout.decor.some(block=>block.kind==="rect"&&block.fill===palette.proof)).toBe(true);
    expect(equationLayout.decor.some(block=>block.kind==="text"&&block.italic&&block.text.includes("C6H12O6"))).toBe(true);
  });

  test("renders the sources card as underlined links",()=>{
    const sources=deck.slides[deck.slides.length-1];
    const layout=layoutSlide(deck,sources,deck.slides.length-1,{...options,total:deck.slides.length});
    const links=layout.groups.body.blocks.filter(block=>block.kind==="text");
    expect(links).toHaveLength(1);
    expect(links[0].underline).toBe(true);
    expect(links[0].href).toBe("https://www.ncbi.nlm.nih.gov/books/NBK9861/");
  });

  test("respects user-moved element positions",()=>{
    const slide={...deck.slides[3],elementPositions:{title:{x:10,y:50,width:40},supportingText:{x:10,y:80,width:40}}};
    const layout=layoutSlide(deck,slide,3,options);
    expect(layout.groups.title.box).toMatchObject({x:160,y:450,w:640});
    expect(layout.groups.body.box.y).toBe(720);
    expect(organicClipPath("round",100,50,10)).toMatch(/^M 10 0 H 90 A 10 10/);
    expect(organicClipPath("curve-left",100,100)).toMatch(/^M 17 0 H 100 V 100/);
  });
});
