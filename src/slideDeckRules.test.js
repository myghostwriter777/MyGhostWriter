import {buildEditorialBlueprint,normalizeEditorialDeck,requestedSlideCount,resolveSlideCount,slideNeedsIllustration} from "./slideDeckRules";

describe("slide deck rules",()=>{
  test("details override the selector when a slide count is requested",()=>{
    expect(resolveSlideCount("Please make 3 slides with a strong ending.","12")).toEqual({count:3,overridden:true});
    expect(resolveSlideCount("I need twelve pages for class.","5")).toEqual({count:12,overridden:true});
  });

  test("uses the selector when details contain no slide count",()=>{
    expect(requestedSlideCount("Include three examples.")).toBeNull();
    expect(resolveSlideCount("Include three examples.","8")).toEqual({count:8,overridden:false});
  });

  test("builds a varied editorial arc with an illustrated cover and takeaway",()=>{
    const blueprint=buildEditorialBlueprint("Urban gardens",8);
    expect(blueprint).toHaveLength(8);
    expect(blueprint[0].label).toBe("Cover");
    expect(blueprint[0].visualType).toBe("hero-image");
    expect(blueprint[7].label).toBe("Takeaway");
    expect(blueprint[7].visualType).toBe("takeaway-grid");
    expect(new Set(blueprint.map(item=>item.visualType)).size).toBeGreaterThan(4);
    expect(new Set(blueprint.map(item=>item.label)).size).toBe(blueprint.length);
    const longBlueprint=buildEditorialBlueprint("Urban gardens",20);
    expect(new Set(longBlueprint.map(item=>item.label)).size).toBe(longBlueprint.length);
  });

  test("normalizes generated copy into concise but detailed visual cards",()=>{
    const blueprint=buildEditorialBlueprint("Urban gardens",3);
    const deck=normalizeEditorialDeck({title:"A very long but still manageable urban garden presentation title",subtitle:"A useful subtitle",slides:blueprint.map(()=>({eyebrow:"A long category label for the slide",title:"This headline contains far too many words for a calm and memorable presentation slide so it should be shortened",bullets:["One concise supporting sentence","A second bullet that should remain"],visualType:"gallery",layout:"centered",visualLabel:"A very long visual label",dataValue:"42%",dataLabel:"Less wasted space"}))},blueprint);
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides.every(slide=>slide.bullets.length===2)).toBe(true);
    expect(deck.slides[0].supportingText).toBe("");
    expect(deck.slides.every(slide=>slide.isHumorBeat===false)).toBe(true);
    expect(deck.slides[0].visualType).toBe("image-detail");
    expect(deck.slides[0].layout).toBe("left-third");
    expect(slideNeedsIllustration(deck.slides[0])).toBe(true);
  });
});
