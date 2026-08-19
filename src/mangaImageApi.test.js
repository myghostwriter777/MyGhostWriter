jest.mock("ai",()=>({generateImage:jest.fn(),generateText:jest.fn()}));
import {generateImage,generateText} from "ai";
import handler from "../api/manga-image";

function mockResponse(){const res={statusCode:200,body:null};res.setHeader=jest.fn();res.status=jest.fn(code=>{res.statusCode=code;return res;});res.json=jest.fn(body=>{res.body=body;return res;});res.end=jest.fn(()=>res);return res;}

describe("Manga image API",()=>{
  afterEach(()=>jest.clearAllMocks());

  test("creates a portrait comic page through Vercel AI Gateway",async()=>{
    generateText.mockResolvedValue({files:[{base64:"aGVsbG8=",mediaType:"image/png"}]});
    const req={method:"POST",body:{prompt:"A three-panel scene with two original adult characters."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(res.body.image.dataUrl).toBe("data:image/png;base64,aGVsbG8=");
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({model:"google/gemini-3.1-flash-image-preview"}));
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("falls back to GPT Image when the multimodal model returns no page",async()=>{
    generateText.mockResolvedValue({files:[]});
    generateImage.mockResolvedValue({image:{base64:"aGVsbG8=",mediaType:"image/png"}});
    const req={method:"POST",body:{prompt:"A portrait comic page."}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({model:"openai/gpt-image-2",size:"1024x1536"}));
  });

  test("rejects unsupported reference images before generation",async()=>{
    const req={method:"POST",body:{prompt:"A page",references:["data:image/gif;base64,aGVsbG8="]}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(400);expect(generateText).not.toHaveBeenCalled();expect(generateImage).not.toHaveBeenCalled();
  });
});
