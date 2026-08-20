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
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({model:"google/gemini-3.1-flash-image-preview"}));
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("falls back to Flux when the multimodal model returns no page",async()=>{
    generateText.mockResolvedValue({files:[]});
    generateImage.mockResolvedValue({image:{base64:"aGVsbG8=",mediaType:"image/png"}});
    const req={method:"POST",body:{prompt:"A portrait comic page."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({model:"bfl/flux-2-flex",aspectRatio:"2:3"}));
  });

  test("tries a second cloud illustrator before using the local storyboard",async()=>{
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

  test("returns a visible local storyboard when both Gateway image models fail",async()=>{
    generateText.mockRejectedValue(Object.assign(new Error("budget exhausted"),{statusCode:402}));
    generateImage.mockRejectedValue(Object.assign(new Error("provider unavailable"),{statusCode:503}));
    const req={method:"POST",body:{prompt:'Title: Test Page\n\nExact panel plan:\nPanel 1\nShot: Close-up\nAction and expression: A character looks surprised.\nSpeech bubble (Mina): "What happened?"'}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fallback).toBe(true);
    expect(res.body.image.mediaType).toBe("image/svg+xml");
    expect(res.body.image.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(generateImage).toHaveBeenCalledTimes(2);
  });

  test("rejects unsupported reference images before generation",async()=>{
    const req={method:"POST",body:{prompt:"A page",references:["data:image/gif;base64,aGVsbG8="]}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(400);expect(generateText).not.toHaveBeenCalled();expect(generateImage).not.toHaveBeenCalled();
  });
});
