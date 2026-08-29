import {makeSourcesSlide,normalizeSlideSources,slideSourceDomain,withSourcesSlide} from "./slideSources";

describe("slide sources",()=>{
  test("deduplicates valid web sources and keeps editable fields",()=>{
    expect(normalizeSlideSources(
      [{title:"Example",url:"https://example.com/article"}],
      [{title:"Duplicate",url:"https://example.com/article/"},{title:"Bad",url:"javascript:alert(1)"}],
    )).toEqual([{id:expect.stringMatching(/^slide-source-/),title:"Example",url:"https://example.com/article"}]);
  });

  test("adds one dedicated sources slide after the content",()=>{
    const deck=withSourcesSlide({title:"Deck",slides:[{title:"One"}]},[{title:"Source",url:"https://www.nasa.gov/topic"}]);
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[1]).toMatchObject({isSources:true,title:"Sources",visualType:"sources"});
    expect(deck.sources).toHaveLength(1);
    expect(slideSourceDomain(deck.sources[0].url)).toBe("nasa.gov");
    expect(makeSourcesSlide(2).supportingText).toContain("2 sources");
  });
});
