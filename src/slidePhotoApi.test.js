const mockSharpToBuffer=jest.fn();
jest.mock("sharp",()=>jest.fn());
import sharp from "sharp";
const handler=require("../api/slide-photo");
const {findSlidePhoto,rankCandidates,googleConfig}=handler;

function mockResponse(){const res={statusCode:200,body:null};res.setHeader=jest.fn();res.status=jest.fn(code=>{res.statusCode=code;return res;});res.json=jest.fn(body=>{res.body=body;return res;});res.end=jest.fn(()=>res);return res;}

const jsonResponse=(data,status=200)=>({ok:status<400,status,json:async()=>data,headers:{get:()=>"application/json"}});
const imageResponse=(bytes,type="image/jpeg",status=200)=>({ok:status<400,status,headers:{get:name=>name==="content-type"?type:name==="content-length"?String(bytes.length):null},arrayBuffer:async()=>Uint8Array.from(bytes).buffer});

const googleItems=[
  {link:"https://images.example.org/leaf-small.jpg",title:"Tiny leaf",displayLink:"example.org",mime:"image/jpeg",image:{contextLink:"https://example.org/tiny",width:300,height:200,byteSize:5000}},
  {link:"https://images.example.org/leaf.jpg",title:"Leaf anatomy &amp; chloroplasts",displayLink:"www.example.org",mime:"image/jpeg",image:{contextLink:"https://example.org/leaf-anatomy",width:1600,height:1000,byteSize:240000}},
  {link:"https://images.example.org/leaf.svg",title:"Vector leaf",displayLink:"example.org",mime:"image/svg+xml",image:{contextLink:"https://example.org/vector",width:1600,height:1000,byteSize:4000}},
];

describe("slide photo API",()=>{
  const env={GOOGLE_SEARCH_API_KEY:"key",GOOGLE_SEARCH_ENGINE_ID:"cx"};
  const log={warn:jest.fn(),error:jest.fn()};
  beforeEach(()=>{
    sharp.mockImplementation(()=>({rotate:jest.fn().mockReturnThis(),resize:jest.fn().mockReturnThis(),jpeg:jest.fn().mockReturnThis(),toBuffer:mockSharpToBuffer}));
    mockSharpToBuffer.mockResolvedValue({data:Buffer.from("resized-jpeg"),info:{width:1600,height:1000}});
    global.fetch=jest.fn();
  });
  afterEach(()=>{delete global.fetch;});

  test("reads Google configuration from either environment naming",()=>{
    expect(googleConfig({})).toBeNull();
    expect(googleConfig(env)).toEqual({key:"key",cx:"cx"});
    expect(googleConfig({GOOGLE_CSE_API_KEY:"a",GOOGLE_CSE_ID:"b"})).toEqual({key:"a",cx:"b"});
  });

  test("ranks usable landscape photos first and drops tiny, vector, or excluded results",()=>{
    const ranked=rankCandidates([
      {imageUrl:"https://a/portrait.jpg",pageUrl:"https://a/",mime:"image/jpeg",width:800,height:1400},
      {imageUrl:"https://a/wide.jpg",pageUrl:"https://a/wide",mime:"image/jpeg",width:1600,height:900},
      {imageUrl:"https://a/tiny.jpg",pageUrl:"https://a/tiny",mime:"image/jpeg",width:200,height:100},
      {imageUrl:"https://a/vector.svg",pageUrl:"https://a/vector",mime:"image/svg+xml",width:1600,height:900},
      {imageUrl:"https://a/used.jpg",pageUrl:"https://a/used",mime:"image/jpeg",width:1600,height:900},
    ],["https://a/used.jpg"]);
    expect(ranked.map(item=>item.imageUrl)).toEqual(["https://a/wide.jpg","https://a/portrait.jpg"]);
  });

  test("searches Google Images, downloads the best match, resizes it, and returns the page as the source",async()=>{
    global.fetch
      .mockResolvedValueOnce(jsonResponse({items:googleItems}))
      .mockResolvedValueOnce(imageResponse([255,216,255,224]));
    const result=await findSlidePhoto({query:"leaf chloroplast photosynthesis",exclude:[],env,log});
    const searchUrl=String(global.fetch.mock.calls[0][0]);
    expect(searchUrl).toContain("https://www.googleapis.com/customsearch/v1?");
    expect(searchUrl).toContain("searchType=image");
    expect(searchUrl).toContain("safe=active");
    expect(searchUrl).toContain("q=leaf+chloroplast+photosynthesis");
    expect(String(global.fetch.mock.calls[1][0])).toBe("https://images.example.org/leaf.jpg");
    expect(sharp).toHaveBeenCalledTimes(1);
    expect(result.image.dataUrl).toBe("data:image/jpeg;base64,"+Buffer.from("resized-jpeg").toString("base64"));
    expect(result.image.width).toBe(1600);
    expect(result.source).toEqual({provider:"google",title:"Leaf anatomy & chloroplasts",pageUrl:"https://example.org/leaf-anatomy",imageUrl:"https://images.example.org/leaf.jpg",domain:"example.org",license:"",author:""});
    expect(result.providers).toEqual(["google"]);
  });

  test("falls back to Wikimedia Commons with licence and author when Google is not configured",async()=>{
    global.fetch
      .mockResolvedValueOnce(jsonResponse({query:{pages:[{title:"File:Chloroplast diagram.jpg",imageinfo:[{url:"https://upload.wikimedia.org/full.jpg",thumburl:"https://upload.wikimedia.org/1600px-full.jpg",descriptionurl:"https://commons.wikimedia.org/wiki/File:Chloroplast_diagram.jpg",width:4000,height:2500,thumbwidth:1600,thumbheight:1000,mime:"image/jpeg",extmetadata:{Artist:{value:"<a href=\"/wiki/User:Kelvinsong\">Kelvinsong</a>"},LicenseShortName:{value:"CC BY-SA 3.0"}}}]}]}}))
      .mockResolvedValueOnce(imageResponse([255,216,255,224]));
    const result=await findSlidePhoto({query:"chloroplast",exclude:[],env:{},log});
    const searchUrl=String(global.fetch.mock.calls[0][0]);
    expect(searchUrl).toContain("https://commons.wikimedia.org/w/api.php?");
    expect(searchUrl).toContain("gsrsearch=chloroplast+filetype%3Abitmap");
    expect(String(global.fetch.mock.calls[1][0])).toBe("https://upload.wikimedia.org/1600px-full.jpg");
    expect(result.source).toEqual({provider:"wikimedia",title:"Chloroplast diagram",pageUrl:"https://commons.wikimedia.org/wiki/File:Chloroplast_diagram.jpg",imageUrl:"https://upload.wikimedia.org/1600px-full.jpg",domain:"commons.wikimedia.org",license:"CC BY-SA 3.0",author:"Kelvinsong"});
    expect(result.providers).toEqual(["wikimedia"]);
  });

  test("moves on to Wikimedia when Google is over quota, and to the next candidate when a download is not an image",async()=>{
    global.fetch
      .mockResolvedValueOnce(jsonResponse({error:{message:"Quota exceeded"}},429))
      .mockResolvedValueOnce(jsonResponse({query:{pages:[
        {title:"File:First.jpg",imageinfo:[{thumburl:"https://upload.wikimedia.org/first.jpg",descriptionurl:"https://commons.wikimedia.org/wiki/File:First.jpg",thumbwidth:1600,thumbheight:1000,mime:"image/jpeg",extmetadata:{}}]},
        {title:"File:Second.jpg",imageinfo:[{thumburl:"https://upload.wikimedia.org/second.jpg",descriptionurl:"https://commons.wikimedia.org/wiki/File:Second.jpg",thumbwidth:1600,thumbheight:1000,mime:"image/jpeg",extmetadata:{}}]},
      ]}}))
      .mockResolvedValueOnce(imageResponse([60,104,116,109,108],"text/html"))
      .mockResolvedValueOnce(imageResponse([255,216,255,224]));
    const result=await findSlidePhoto({query:"leaf",exclude:[],env,log});
    expect(result.source.imageUrl).toBe("https://upload.wikimedia.org/second.jpg");
    expect(result.providers).toEqual(["google","wikimedia"]);
  });

  test("the route validates the query and reports a missing photo clearly",async()=>{
    const empty=mockResponse();
    await handler({method:"POST",body:{query:" "}},empty);
    expect(empty.statusCode).toBe(400);
    global.fetch.mockResolvedValue(jsonResponse({query:{pages:[]}}));
    const res=mockResponse();
    await handler({method:"POST",body:{query:"zzzz qqqq",exclude:["not a url"]}},res);
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe("PHOTO_NOT_FOUND");
  });
});
