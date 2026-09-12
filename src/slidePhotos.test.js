import { attachSlidePhoto, buildSlidePhotoQuery, detachSlidePhotoSource, photoCreditLine, photoSourceEntry, usedPhotoUrls } from "./slidePhotos";
import { layoutSlide, createTextMeasure } from "./slideLayout";
import { slidePalette } from "./slideTheme";
import { withSourcesSlide } from "./slideSources";

const credit={provider:"google",title:"Chloroplast structure – Biology LibreTexts",pageUrl:"https://bio.libretexts.org/chloroplast",imageUrl:"https://bio.libretexts.org/img/chloroplast.jpg",domain:"bio.libretexts.org",license:"",author:""};
const photo={id:"slide-photo-1",name:"Photo · Chloroplast",dataUrl:"data:image/jpeg;base64,/9j/",historyDataUrl:"data:image/jpeg;base64,/9j/",fit:"cover",photo:true,credit,x:50,y:0,width:50,height:100};

const baseDeck=()=>withSourcesSlide({
  title:"Photosynthesis",
  sources:[{id:"s1",title:"Khan Academy",url:"https://www.khanacademy.org/photosynthesis"}],
  slides:[
    {title:"Photosynthesis",visualType:"hero-image",layout:"left-third",sourceUrls:[],customImages:[]},
    {title:"Inside the chloroplast",visualType:"image-detail",layout:"right-third",sourceUrls:["https://www.khanacademy.org/photosynthesis"],customImages:[],visualDirection:"A cross-section of a leaf cell"},
  ],
},[{title:"Khan Academy",url:"https://www.khanacademy.org/photosynthesis"}]);

describe("slide photo queries",()=>{
  test("combines the specific slide words with the deck topic",()=>{
    const query=buildSlidePhotoQuery({title:"Inside the chloroplast"},{topic:"Photosynthesis in plants",index:1});
    expect(query).toBe("inside chloroplast photosynthesis plants");
  });

  test("leans on the topic for the cover and on the visual direction for generic titles",()=>{
    expect(buildSlidePhotoQuery({title:"Key Takeaways"},{topic:"Photosynthesis in plants",index:0})).toBe("photosynthesis plants");
    expect(buildSlidePhotoQuery({title:"Why It Matters",visualDirection:"Sunlight passing through a leaf canopy"},{topic:"",index:3})).toBe("sunlight passing leaf canopy");
  });

  test("never returns an empty query for a usable slide",()=>{
    expect(buildSlidePhotoQuery({title:"The"},{topic:"",deckTitle:"Volcanoes",index:2})).toBe("volcanoes");
  });
});

describe("photo credits and citations",()=>{
  test("formats the credit line and the source entry",()=>{
    expect(photoCreditLine(credit)).toBe("Photo: bio.libretexts.org");
    expect(photoCreditLine({...credit,author:"Jane Doe",license:"CC BY-SA 4.0",domain:"commons.wikimedia.org"})).toBe("Photo: Jane Doe · CC BY-SA 4.0 · commons.wikimedia.org");
    const entry=photoSourceEntry({...credit,author:"Jane Doe",license:"CC BY-SA 4.0"});
    expect(entry.title).toBe("Image: Chloroplast structure – Biology LibreTexts (by Jane Doe, CC BY-SA 4.0)");
    expect(entry.url).toBe(credit.pageUrl);
    expect(entry.id).toMatch(/^slide-photo-/);
  });

  test("attaching a photo cites its page on the slide and the Sources card",()=>{
    const deck=attachSlidePhoto(baseDeck(),1,photo,{replace:true});
    expect(deck.slides[1].customImages).toEqual([photo]);
    expect(deck.slides[1].sourceUrls).toEqual(["https://www.khanacademy.org/photosynthesis",credit.pageUrl]);
    expect(deck.sources.map(source=>source.url)).toEqual(["https://www.khanacademy.org/photosynthesis",credit.pageUrl]);
    expect(deck.slides[2].isSources).toBe(true);
    expect(deck.slides[2].supportingText).toBe("2 sources used in this deck");
    expect(usedPhotoUrls(deck)).toEqual([credit.imageUrl,credit.pageUrl]);
    // The same page is never listed twice.
    const again=attachSlidePhoto(deck,0,{...photo,id:"slide-photo-2"});
    expect(again.sources).toHaveLength(2);
    expect(again.slides[0].sourceUrls).toEqual([credit.pageUrl]);
  });

  test("removing the only slide that used a photo removes its citation",()=>{
    const deck=attachSlidePhoto(baseDeck(),1,photo,{replace:true});
    const without={...deck,slides:deck.slides.map((slide,index)=>index===1?{...slide,customImages:[]}:slide)};
    const cleaned=detachSlidePhotoSource(without,photo);
    expect(cleaned.sources.map(source=>source.url)).toEqual(["https://www.khanacademy.org/photosynthesis"]);
    expect(cleaned.slides[1].sourceUrls).toEqual(["https://www.khanacademy.org/photosynthesis"]);
    expect(cleaned.slides[2].supportingText).toBe("1 source used in this deck");
  });

  test("the slide layout draws a credit pill inside the photo and cites it in the footer",()=>{
    const deck=attachSlidePhoto(baseDeck(),1,photo,{replace:true});
    const palette=slidePalette("#0f1140","editorial","#f8fbff");
    const layout=layoutSlide(deck,deck.slides[1],1,{palette,measure:createTextMeasure(),total:3});
    const image=layout.images[0];
    expect(image.photo).toBe(true);
    expect(image.clip).not.toBe("round");
    const creditText=layout.footer.find(block=>block.kind==="text"&&block.credit);
    const creditPill=layout.footer.find(block=>block.kind==="rect"&&block.credit);
    expect(creditText.text).toBe("Photo: bio.libretexts.org");
    expect(creditText.href).toBe(credit.pageUrl);
    expect(creditPill.x).toBeGreaterThanOrEqual(image.x);
    expect(creditPill.x+creditPill.w).toBeLessThanOrEqual(image.x+image.w);
    expect(creditPill.y+creditPill.h).toBeLessThanOrEqual(image.y+image.h);
    const footerRight=layout.footer.find(block=>block.kind==="text"&&block.align==="right");
    expect(footerRight.text).toContain("Sources 1, 2");
    // Uploaded images keep clean corners and no credit.
    const uploaded={...deck,slides:deck.slides.map((slide,index)=>index===1?{...slide,customImages:[{...photo,photo:false,credit:null}]}:slide)};
    const plain=layoutSlide(uploaded,uploaded.slides[1],1,{palette,measure:createTextMeasure(),total:3});
    expect(plain.images[0].clip).toBe("round");
    expect(plain.footer.some(block=>block.credit)).toBe(false);
  });

  test("the Sources card lists up to 16 references including photo pages",()=>{
    const many=Array.from({length:14},(_,index)=>({id:`s${index}`,title:`Source ${index}`,url:`https://example.org/${index}`}));
    const deck=withSourcesSlide({title:"Deck",slides:[{title:"One",visualType:"hero-image",layout:"left-third"}]},many);
    const palette=slidePalette("#0f1140","editorial","#f8fbff");
    const layout=layoutSlide(deck,deck.slides[1],1,{palette,measure:createTextMeasure(),total:2});
    const links=layout.groups.body.blocks.filter(block=>block.kind==="text"&&block.href);
    expect(links).toHaveLength(14);
    const bottom=Math.max(...links.map(block=>layout.groups.body.box.y+block.y+block.h));
    expect(bottom).toBeLessThanOrEqual(900-54);
  });
});
