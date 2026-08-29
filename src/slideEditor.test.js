import {defaultSlideElementPosition,editableSlideSupportingText,moveSlideElement,normalizeSlideElementPosition,nudgeSlideElement,resizeSlideElement,slideTitleScale} from "./slideEditor";

describe("slide editor geometry",()=>{
  test("uses layout-aware defaults",()=>{
    expect(defaultSlideElementPosition("right-third","title")).toEqual({x:48,y:25,width:46});
    expect(defaultSlideElementPosition("missing","image")).toEqual({x:58,y:16,width:34,height:64});
    expect(defaultSlideElementPosition("left-third","supportingText").y).toBeGreaterThan(55);
  });

  test("normalizes images inside the canvas",()=>{
    expect(normalizeSlideElementPosition({x:98,y:98,width:40,height:30},{},{image:true})).toEqual({x:60,y:70,width:40,height:30});
  });

  test("moves pointer deltas as percentages and clamps them",()=>{
    expect(moveSlideElement({x:10,y:20,width:30},{dx:100,dy:-50,canvasWidth:1000,canvasHeight:500})).toEqual({x:20,y:10,width:30});
    expect(nudgeSlideElement({x:0,y:0,width:30},{dx:-5,dy:-5})).toEqual({x:0,y:0,width:30});
  });

  test("resizes images without overflowing",()=>{
    expect(resizeSlideElement({x:70,y:60,width:20,height:20},{dx:300,dy:300,canvasWidth:1000,canvasHeight:1000,image:true})).toEqual({x:50,y:50,width:50,height:50});
  });

  test("preserves spaces while supporting text is being edited",()=>{
    expect(editableSlideSupportingText({supportingText:"Hello, "})).toBe("Hello, ");
    expect(editableSlideSupportingText({bullets:["Fallback line"]})).toBe("Fallback line");
  });

  test("scales long headings down without shrinking short headings",()=>{
    expect(slideTitleScale("A clear idea")).toBe(1);
    expect(slideTitleScale("Give only the context the audience needs to understand the stakes")).toBeLessThan(0.9);
    expect(slideTitleScale("A very long exact heading that contains far more words than a presentation slide should normally contain but must still fit because the user explicitly requested it")).toBe(0.58);
  });
});
