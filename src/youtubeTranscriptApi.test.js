import handler,{transcriptFromJson3,transcriptFromXml,videoIdFromUrl} from "../api/youtube-transcript";

function mockResponse(){
  const res={statusCode:200,body:null};res.setHeader=jest.fn();res.status=jest.fn(code=>{res.statusCode=code;return res;});res.json=jest.fn(body=>{res.body=body;return res;});res.end=jest.fn(()=>res);return res;
}

describe("YouTube transcript route",()=>{
  const originalFetch=global.fetch;
  afterEach(()=>{global.fetch=originalFetch;jest.clearAllMocks();});

  test("accepts normal, short, and Shorts links only",()=>{
    expect(videoIdFromUrl("https://www.youtube.com/watch?v=abcdefghijk")).toBe("abcdefghijk");
    expect(videoIdFromUrl("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
    expect(videoIdFromUrl("https://youtube.com/shorts/abcdefghijk")).toBe("abcdefghijk");
    expect(videoIdFromUrl("https://example.com/watch?v=abcdefghijk")).toBe("");
  });

  test("reads both YouTube caption formats",()=>{
    expect(transcriptFromJson3({events:[{segs:[{utf8:"Hello "},{utf8:"world"}]}]})).toBe("Hello world");
    expect(transcriptFromXml('<transcript><text start="0">One &amp; two</text><text start="1">Three</text></transcript>')).toBe("One & two Three");
  });

  test("returns a caption transcript and video metadata",async()=>{
    const trackUrl="https://www.youtube.com/api/timedtext?v=abcdefghijk&amp;lang=en";
    global.fetch=jest.fn()
      .mockResolvedValueOnce({ok:true,text:async()=>`<script>{"captionTracks":[{"baseUrl":"${trackUrl}","languageCode":"en"}],"audioTracks":[]}</script>`})
      .mockResolvedValueOnce({ok:true,json:async()=>({events:[{segs:[{utf8:"A useful transcript."}]}]})})
      .mockResolvedValueOnce({ok:true,json:async()=>({title:"Useful video",author_name:"Creator"})});
    const req={method:"POST",body:{url:"https://youtu.be/abcdefghijk"}};const res=mockResponse();
    await handler(req,res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({title:"Useful video",author:"Creator",transcript:"A useful transcript."});
  });
});

