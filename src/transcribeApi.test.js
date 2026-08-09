import handler from "../api/transcribe";

function mockResponse(){
  const res={statusCode:200,body:null};
  res.status=jest.fn(code=>{res.statusCode=code;return res;});
  res.json=jest.fn(body=>{res.body=body;return res;});
  return res;
}

describe("meeting transcription API",()=>{
  const originalFetch=global.fetch;
  const originalKey=process.env.OPENAI_API_KEY;

  afterEach(()=>{
    global.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY=originalKey;
  });

  test("sends a bounded WebM segment to OpenAI transcription",async()=>{
    process.env.OPENAI_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({text:"Could you send the updated timeline?"})});
    const req={method:"POST",body:{audio:"data:audio/webm;codecs=opus;base64,aGVsbG8=",language:"en"}};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(200);
    expect(res.body.text).toMatch(/updated timeline/);
    const [url,options]=global.fetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(options.headers.Authorization).toBe("Bearer test-key");
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body.get("model")).toBe("gpt-4o-mini-transcribe");
  });

  test("rejects unsupported data before contacting OpenAI",async()=>{
    process.env.OPENAI_API_KEY="test-key";
    global.fetch=jest.fn();
    const res=mockResponse();
    await handler({method:"POST",body:{audio:"data:text/plain;base64,aGVsbG8="}},res);
    expect(res.statusCode).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
