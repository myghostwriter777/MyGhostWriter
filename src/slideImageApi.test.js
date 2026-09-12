jest.mock("ai",()=>({generateImage:jest.fn(),generateText:jest.fn()}));
const mockSharpToBuffer=jest.fn();
jest.mock("sharp",()=>jest.fn());
import {generateImage,generateText} from "ai";
import sharp from "sharp";
const handler=require("../api/slide-image");
const {buildSlideImagePrompt}=handler;

function mockResponse(){const res={statusCode:200,body:null};res.setHeader=jest.fn();res.status=jest.fn(code=>{res.statusCode=code;return res;});res.json=jest.fn(body=>{res.body=body;return res;});res.end=jest.fn(()=>res);return res;}

describe("slide image prompt",()=>{
  test("builds a widescreen, text-free visual brief with layout-aware space",()=>{
    const prompt=buildSlideImagePrompt({title:"Photosynthesis",direction:"Sunlight passing through a leaf canopy",theme:"classroom",layout:"right-third"});
    expect(prompt).toContain("16:9");
    expect(prompt).toContain("right side");
    expect(prompt).toContain("Photosynthesis");
    expect(prompt).toContain("Sunlight passing through a leaf canopy");
    expect(prompt).toContain("any words, letters, numbers");
  });

  test("commits to the inked graphic-novel house style the reference art uses",()=>{
    const prompt=buildSlideImagePrompt({title:"A virus entering a cell"});
    expect(prompt).toContain("graphic-novel");
    expect(prompt).toContain("varied line weight");
    expect(prompt).toContain("Cel shading");
    expect(prompt).toContain("cross-hatching");
    expect(prompt).toContain("rim light");
    expect(prompt).toContain("high-chroma");
    expect(prompt).toContain("No empty flat regions");
    expect(prompt).toContain("hero subject");
    // The styles that made earlier decks look generic are ruled out.
    expect(prompt).toContain("Photorealism, 3D renders, stock photography, clip art");
    expect(prompt).toContain("faded pastel washes");
    expect(prompt).toContain("thin uniform outlines");
  });

  test("keeps the theme as styling guidance that cannot override the house style",()=>{
    const prompt=buildSlideImagePrompt({title:"Market entry",theme:"cinematic drama: warm amber and dusk-purple palette"});
    expect(prompt).toContain("MOOD AND PALETTE REFERENCE (styling only, it never overrides the house style): cinematic drama: warm amber and dusk-purple palette");
    expect(prompt.indexOf("HOUSE STYLE")).toBeLessThan(prompt.indexOf("MOOD AND PALETTE REFERENCE"));
  });

  test("harmonises with the deck palette, pushes saturation, and rejects unsafe colours",()=>{
    const prompt=buildSlideImagePrompt({title:"Why Photosynthesis Matters",deckTitle:"Photosynthesis: Converting Sunlight into Life",direction:"A sunlit meadow",theme:"editorial",layout:"left-third",palette:{bg:"#0f1140",accent:"#efa9f3"}});
    expect(prompt).toContain("#0f1140");
    expect(prompt).toContain("#efa9f3");
    expect(prompt).toContain("high saturation");
    expect(prompt).toContain('deck titled "Photosynthesis: Converting Sunlight into Life"');
    expect(prompt).toContain("left side");
    const unsafe=buildSlideImagePrompt({title:"X",palette:{bg:"javascript:alert(1)",accent:"red"}});
    expect(unsafe).not.toContain("javascript");
  });
});

describe("slide image route",()=>{
  beforeEach(()=>{
    sharp.mockImplementation(()=>({rotate:jest.fn().mockReturnThis(),resize:jest.fn().mockReturnThis(),jpeg:jest.fn().mockReturnThis(),toBuffer:mockSharpToBuffer}));
  });
  afterEach(()=>jest.clearAllMocks());

  test("asks the Pro model first with a landscape 1K request and an attempt deadline",async()=>{
    generateText.mockResolvedValue({files:[{base64:"aGVsbG8=",mediaType:"image/png"}]});
    const res=mockResponse();
    await handler({method:"POST",body:{title:"Leaf"}},res);
    expect(res.statusCode).toBe(200);
    const request=generateText.mock.calls[0][0];
    expect(request.model).toBe("google/gemini-3-pro-image");
    expect(request.providerOptions.google).toEqual({responseModalities:["TEXT","IMAGE"],imageConfig:{aspectRatio:"16:9",imageSize:"1K"}});
    expect(request.abortSignal).toBeDefined();
    expect(res.body.model).toBe("google/gemini-3-pro-image");
    expect(sharp).not.toHaveBeenCalled();
  });

  test("retries without the Google image options when the provider rejects them",async()=>{
    generateText
      .mockRejectedValueOnce(Object.assign(new Error("Unknown field imageConfig"),{statusCode:400}))
      .mockResolvedValueOnce({files:[{base64:"aGVsbG8=",mediaType:"image/png"}]});
    const res=mockResponse();
    await handler({method:"POST",body:{title:"Leaf"}},res);
    expect(res.statusCode).toBe(200);
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateText.mock.calls[1][0].providerOptions.google).toBeUndefined();
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("falls through the model chain and recompresses an oversized visual",async()=>{
    const huge=Buffer.alloc(3*1024*1024,1).toString("base64");
    generateText.mockResolvedValueOnce({files:[]}).mockResolvedValueOnce({files:[{base64:huge,mediaType:"image/png"}]});
    mockSharpToBuffer.mockResolvedValue(Buffer.from("small-jpeg"));
    const res=mockResponse();
    await handler({method:"POST",body:{title:"Leaf"}},res);
    expect(res.statusCode).toBe(200);
    expect(generateText).toHaveBeenNthCalledWith(2,expect.objectContaining({model:"google/gemini-3.1-flash-image"}));
    expect(res.body.image.mediaType).toBe("image/jpeg");
    expect(res.body.image.dataUrl).toBe("data:image/jpeg;base64,"+Buffer.from("small-jpeg").toString("base64"));
  });

  test("uses the dedicated image models when both multimodal models fail",async()=>{
    generateText.mockResolvedValue({files:[]});
    generateImage.mockResolvedValue({image:{base64:"aGVsbG8=",mediaType:"image/png"}});
    const res=mockResponse();
    await handler({method:"POST",body:{title:"Leaf"}},res);
    expect(res.statusCode).toBe(200);
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({model:"bfl/flux-2-flex",aspectRatio:"16:9"}));
    expect(res.body.model).toBe("bfl/flux-2-flex");
  });

  test("reports a timeout instead of a generic failure when every model aborts",async()=>{
    const abort=()=>Object.assign(new Error("The operation was aborted"),{name:"AbortError"});
    generateText.mockImplementation(()=>Promise.reject(abort()));
    generateImage.mockImplementation(()=>Promise.reject(abort()));
    const res=mockResponse();
    await handler({method:"POST",body:{title:"Leaf"}},res);
    expect(res.statusCode).toBe(504);
    expect(res.body.error).toContain("took too long");
  });

  test("stops on a Gateway account block without trying every model",async()=>{
    generateText.mockRejectedValue(Object.assign(new Error("A valid credit card is required"),{statusCode:403}));
    const res=mockResponse();
    await handler({method:"POST",body:{title:"Leaf"}},res);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("IMAGE_GATEWAY_ACCESS_REQUIRED");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateImage).not.toHaveBeenCalled();
  });
});
