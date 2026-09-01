import {humanizeOutputTokenBudget,isRetryableHumanizeResponseError,parseHumanizeResponse} from "./humanizeResponse";

describe("Humanize response handling",()=>{
  test("gives longer documents enough output room without exceeding the proxy cap",()=>{
    expect(humanizeOutputTokenBudget("Short source")).toBe(3000);
    expect(humanizeOutputTokenBudget("x".repeat(9000))).toBe(4200);
    expect(humanizeOutputTokenBudget("x".repeat(50000))).toBe(8000);
  });

  test("extracts fenced JSON and limits verbose change lists",()=>{
    const changes=Array.from({length:7},(_,index)=>({what:`Change ${index}`,why:"Clearer"}));
    expect(parseHumanizeResponse(`\`\`\`json\n${JSON.stringify({humanized:"Clear text",changes})}\n\`\`\``)).toEqual(expect.objectContaining({humanized:"Clear text",changes:changes.slice(0,4)}));
  });

  test("repairs literal paragraph breaks inside JSON strings",()=>{
    const result=parseHumanizeResponse('{"humanized":"First paragraph.\n\nSecond paragraph.","changes":[]}');
    expect(result.humanized).toBe("First paragraph.\n\nSecond paragraph.");
  });

  test("classifies a response cut off inside the humanized string as retryable",()=>{
    try{parseHumanizeResponse('{"humanized":"This response never finished');throw new Error("Expected parse to fail");}
    catch(error){expect(isRetryableHumanizeResponseError(error)).toBe(true);expect(error.message).not.toMatch(/JSON\.parse/i);}
  });
});
