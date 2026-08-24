import {clampGenerationCount} from "./generationControls";

describe("custom generation counts",()=>{
  test("accepts typed counts and rounds them to whole items",()=>{
    expect(clampGenerationCount("17",{min:1,max:30,fallback:8})).toBe(17);
    expect(clampGenerationCount("6.6",{min:1,max:30,fallback:8})).toBe(7);
  });

  test("keeps custom counts inside each mode's supported range",()=>{
    expect(clampGenerationCount("0",{min:1,max:30,fallback:8})).toBe(1);
    expect(clampGenerationCount("91",{min:1,max:30,fallback:8})).toBe(30);
    expect(clampGenerationCount("",{min:2,max:20,fallback:6})).toBe(6);
  });
});
