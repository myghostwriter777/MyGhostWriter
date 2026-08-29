const {buildSlideImagePrompt}=require("../api/slide-image");

describe("slide image API",()=>{
  test("builds a widescreen, text-free visual brief with layout-aware space",()=>{
    const prompt=buildSlideImagePrompt({title:"Photosynthesis",direction:"Sunlight passing through a leaf canopy",theme:"classroom",layout:"right-third"});
    expect(prompt).toContain("16:9");
    expect(prompt).toContain("right side");
    expect(prompt).toContain("Photosynthesis");
    expect(prompt).toContain("Do not include words");
  });
});
