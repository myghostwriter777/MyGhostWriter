jest.mock("ai",()=>({generateImage:jest.fn(),generateText:jest.fn()}));
import {generateImage,generateText} from "ai";
const handler=require("../api/slide-image");
const {buildSlideImagePrompt}=handler;
function mockResponse(){const res={statusCode:200,body:null};res.setHeader=jest.fn();res.status=jest.fn(code=>{res.statusCode=code;return res;});res.json=jest.fn(body=>{res.body=body;return res;});res.end=jest.fn(()=>res);return res;}

describe("slide image API",()=>{
  afterEach(()=>{jest.clearAllMocks();jest.useRealTimers();});
  test("builds a widescreen, text-free visual brief with layout-aware space",()=>{
    const prompt=buildSlideImagePrompt({title:"Photosynthesis",direction:"Sunlight passing through a leaf canopy",theme:"classroom",layout:"right-third"});
    expect(prompt).toContain("16:9");
    expect(prompt).toContain("right side");
    expect(prompt).toContain("Photosynthesis");
    expect(prompt).toContain("Do not include words");
  });

  test("harmonises the illustration with the deck palette and title",()=>{
    const prompt=buildSlideImagePrompt({title:"Why Photosynthesis Matters",deckTitle:"Photosynthesis: Converting Sunlight into Life",direction:"A sunlit meadow",theme:"editorial",layout:"left-third",palette:{bg:"#0f1140",accent:"#efa9f3"}});
    expect(prompt).toContain("#0f1140");
    expect(prompt).toContain("#efa9f3");
    expect(prompt).toContain('deck titled "Photosynthesis: Converting Sunlight into Life"');
    expect(prompt).toContain("left side");
    const unsafe=buildSlideImagePrompt({title:"X",palette:{bg:"javascript:alert(1)",accent:"red"}});
    expect(unsafe).not.toContain("javascript");
  });

  test.each([null,{},[],{title:"  "},{direction:5}])("rejects missing slide descriptions before generation",async body=>{
    const res=mockResponse();
    await handler({method:"POST",body},res);
    expect(res.statusCode).toBe(400);
    expect(generateText).not.toHaveBeenCalled();
    expect(generateImage).not.toHaveBeenCalled();
  });

  test("falls back once per model with a shared cancellation signal",async()=>{
    generateText.mockResolvedValue({files:[]});
    generateImage.mockResolvedValue({image:{base64:"aGVsbG8=",mediaType:"image/png"}});
    const res=mockResponse();
    await handler({method:"POST",body:{title:"A forest ecosystem"}},res);
    expect(res.statusCode).toBe(200);
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateImage).toHaveBeenCalledTimes(1);
    const request=generateImage.mock.calls[0][0];
    expect(request.maxRetries).toBe(0);
    expect(request.abortSignal).toBe(generateText.mock.calls[0][0].abortSignal);
  });

  test("returns a useful timeout before Vercel kills the image request",async()=>{
    jest.useFakeTimers();
    generateText.mockImplementation(({abortSignal})=>new Promise((_resolve,reject)=>abortSignal.addEventListener("abort",()=>reject(Object.assign(new Error("aborted"),{name:"AbortError"})),{once:true})));
    const res=mockResponse();
    const pending=handler({method:"POST",body:{title:"A forest ecosystem"}},res);
    await Promise.resolve();await Promise.resolve();
    jest.advanceTimersByTime(55001);
    await pending;
    expect(res.statusCode).toBe(504);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateImage).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
