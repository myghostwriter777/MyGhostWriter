import {buildZenBlueprint,normalizeZenDeck,requestedSlideCount,resolveSlideCount,zenHumorIndex} from "./slideDeckRules";

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
    const blueprint=buildZenBlueprint("Urban gardens",8);
    expect(blueprint).toHaveLength(8);
    expect(blueprint[0].label).toBe("Hook");
    expect(blueprint[7].label).toBe("Close");
    expect(blueprint.filter(item=>item.isHumorBeat)).toHaveLength(1);
    expect(blueprint[zenHumorIndex(8)].visualType).toBe("metaphor");
    expect(new Set(blueprint.map(item=>item.label)).size).toBe(blueprint.length);
    expect(blueprint.every(item=>item.heading&&item.heading.split(/\s+/).length<=8)).toBe(true);
    const longBlueprint=buildZenBlueprint("Urban gardens",20);
    expect(new Set(longBlueprint.map(item=>item.label)).size).toBe(longBlueprint.length);
  });

  test("normalizes generated copy into concise but detailed visual cards",()=>{
    const blueprint=buildZenBlueprint("Urban gardens",3);
    const deck=normalizeZenDeck({title:"A very long but still manageable urban garden presentation title",subtitle:"A useful subtitle",slides:blueprint.map((_,index)=>({eyebrow:"A long category label for the slide",title:"This headline contains far too many words for a calm and memorable presentation slide so it should be shortened",bullets:["One concise supporting sentence","A second bullet that should not appear"],visualType:"gallery",layout:"centered",visualLabel:"A very long visual label",dataValue:"42%",dataLabel:"Less wasted space"}))},blueprint);
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides.every(slide=>slide.bullets.length===2)).toBe(true);
    expect(deck.slides[0].supportingText).toBe("");
    expect(deck.slides[1].isHumorBeat).toBe(true);
    expect(deck.slides[1].visualType).toBe("metaphor");
    expect(deck.slides[0].layout).toBe("right-third");
  });
});
