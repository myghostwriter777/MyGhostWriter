import {buildZenBlueprint,requestedSlideCount,resolveSlideCount} from "./slideDeckRules";

describe("slide deck rules",()=>{
  test("details override the selector when a slide count is requested",()=>{
    expect(resolveSlideCount("Please make 3 slides with a strong ending.","12")).toEqual({count:3,overridden:true});
    expect(resolveSlideCount("I need twelve pages for class.","5")).toEqual({count:12,overridden:true});
  });

  test("uses the selector when details contain no slide count",()=>{
    expect(requestedSlideCount("Include three examples.")).toBeNull();
    expect(resolveSlideCount("Include three examples.","8")).toEqual({count:8,overridden:false});
  });

  test("builds a Zen arc with a hook and close",()=>{
    const blueprint=buildZenBlueprint("Urban gardens",5);
    expect(blueprint).toHaveLength(5);
    expect(blueprint[0].label).toBe("Hook");
    expect(blueprint[4].label).toBe("Close");
  });
});
