jest.mock("ai",()=>({generateImage:jest.fn(),generateText:jest.fn()}));
import {generateImage,generateText} from "ai";
const handler=require("../api/manga-image");
const fs=require("fs");

function mockResponse(){const res={statusCode:200,body:null};res.setHeader=jest.fn();res.status=jest.fn(code=>{res.statusCode=code;return res;});res.json=jest.fn(body=>{res.body=body;return res;});res.end=jest.fn(()=>res);return res;}

describe("Manga image API",()=>{
  afterEach(()=>jest.clearAllMocks());

  test("loads the ESM-only AI SDK dynamically in the CommonJS serverless route",()=>{
    const source=fs.readFileSync(require.resolve("../api/manga-image"),"utf8");
    expect(source).toContain('import("ai")');
    expect(source).not.toMatch(/^import\s+.*from\s+["']ai["']/m);
    expect(typeof handler).toBe("function");
  });

  test("creates a portrait comic page through Vercel AI Gateway",async()=>{
    generateText.mockResolvedValue({files:[{base64:"aGVsbG8=",mediaType:"image/png"}]});
    const req={method:"POST",body:{prompt:"A three-panel scene with two original adult characters."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(res.body.image.dataUrl).toBe("data:image/png;base64,aGVsbG8=");
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({model:"google/gemini-3-pro-image"}));
    const prompt=generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain("publication-quality portrait comic page");
    expect(prompt).toContain("Stick figures");
    expect(prompt).toContain("polished cel shading");
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("sends reference art to Nano Banana Pro as multimodal message content",async()=>{
    generateText.mockResolvedValue({files:[{uint8Array:new Uint8Array([104,101,108,108,111]),mediaType:"image/png"}]});
    const reference="data:image/png;base64,aGVsbG8=";
    const req={method:"POST",body:{prompt:"Keep the character consistent.",references:[reference]}};const res=mockResponse();
    await handler(req,res);
    const request=generateText.mock.calls[0][0];
    expect(request.model).toBe("google/gemini-3-pro-image");
    expect(request.prompt).toBeUndefined();
    expect(request.messages[0].content[1]).toEqual(expect.objectContaining({type:"image",mediaType:"image/png"}));
    expect(res.body.image.dataUrl).toBe("data:image/png;base64,aGVsbG8=");
  });

  test("falls back to Flux when the multimodal model returns no page",async()=>{
    generateText.mockResolvedValue({files:[]});
    generateImage.mockResolvedValue({image:{base64:"aGVsbG8=",mediaType:"image/png"}});
    const req={method:"POST",body:{prompt:"A portrait comic page."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(generateText).toHaveBeenNthCalledWith(1,expect.objectContaining({model:"google/gemini-3-pro-image"}));
    expect(generateText).toHaveBeenNthCalledWith(2,expect.objectContaining({model:"google/gemini-3.1-flash-image"}));
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({model:"bfl/flux-2-flex",aspectRatio:"2:3"}));
  });

  test("tries a second cloud illustrator when the first fallback fails",async()=>{
    generateText.mockResolvedValue({files:[]});
    generateImage
      .mockRejectedValueOnce(Object.assign(new Error("Flux unavailable"),{statusCode:503}))
      .mockResolvedValueOnce({image:{base64:"aGVsbG8=",mediaType:"image/png"}});
    const req={method:"POST",body:{prompt:"A portrait comic page."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(generateImage).toHaveBeenNthCalledWith(2,expect.objectContaining({model:"openai/gpt-image-2",size:"1024x1536"}));
    expect(res.body.model).toBe("openai/gpt-image-2");
  });

  test("returns the Gateway allowance error without wasting calls on other models",async()=>{
    generateText.mockRejectedValue(Object.assign(new Error("budget exhausted"),{statusCode:402}));
    generateImage.mockRejectedValue(Object.assign(new Error("provider unavailable"),{statusCode:503}));
    const req={method:"POST",body:{prompt:'Title: Test Page\n\nExact panel plan:\nPanel 1\nShot: Close-up\nAction and expression: A character looks surprised.\nSpeech bubble (Mina): "What happened?"'}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(402);
    expect(res.body.error).toContain("allowance has run out");
    expect(res.body.image).toBeUndefined();
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("explains when production Gateway access blocks every illustrator",async()=>{
    generateText.mockRejectedValue(Object.assign(new Error("A valid credit card is required"),{statusCode:403}));
    generateImage.mockRejectedValue(Object.assign(new Error("A valid credit card is required"),{statusCode:403}));
    const req={method:"POST",body:{prompt:"A portrait comic page."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("IMAGE_GATEWAY_ACCESS_REQUIRED");
    expect(res.body.error).toContain("Vercel AI Gateway received");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("rejects unsupported reference images before generation",async()=>{
    const req={method:"POST",body:{prompt:"A page",references:["data:image/gif;base64,aGVsbG8="]}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(400);expect(generateText).not.toHaveBeenCalled();expect(generateImage).not.toHaveBeenCalled();
  });
});
