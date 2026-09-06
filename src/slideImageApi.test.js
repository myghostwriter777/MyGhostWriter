const {buildSlideImagePrompt}=require("../api/slide-image");

describe("slide image API",()=>{
  test("builds a widescreen, text-free visual brief with layout-aware space",()=>{
    const prompt=buildSlideImagePrompt({title:"Photosynthesis",direction:"Sunlight passing through a leaf canopy",theme:"classroom",layout:"right-third"});
    expect(prompt).toContain("16:9");
    expect(prompt).toContain("right side");
    expect(prompt).toContain("Photosynthesis");
    expect(prompt).toContain("Do not include words");
  });

  test("harmonises the illustration with the deck palette and title",()=>{
    const prompt=buildSlideImagePrompt({title:"Why Photosynthesis Matters",deckTitle:"Photosynthesis: Converting Sunlight into Life",direction:"A sunlit meadow",theme:"editorial",layout:"left-third",palette:{bg:"#0f1140",accent:"#efa9f3"}});
    expect(prompt).toContain("#0f1140");
    expect(prompt).toContain("#efa9f3");
    expect(prompt).toContain('deck titled "Photosynthesis: Converting Sunlight into Life"');
    expect(prompt).toContain("left side");
    const unsafe=buildSlideImagePrompt({title:"X",palette:{bg:"javascript:alert(1)",accent:"red"}});
    expect(unsafe).not.toContain("javascript");
  });
});
