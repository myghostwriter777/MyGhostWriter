import handler from "../api/openai";

function mockResponse(){
  const res={statusCode:200,body:null,headers:{}};
  res.setHeader=jest.fn((name,value)=>{res.headers[name]=value;});
  res.status=jest.fn(code=>{res.statusCode=code;return res;});
  res.json=jest.fn(body=>{res.body=body;return res;});
  res.end=jest.fn(()=>res);
  return res;
}

describe("OpenAI Studio API route",()=>{
  const originalFetch=global.fetch;
  const originalKey=process.env.OPENAI_API_KEY;

  afterEach(()=>{
    global.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY=originalKey;
    jest.clearAllMocks();
  });

  test("builds a bounded Responses API request with image and document inputs",async()=>{
    process.env.OPENAI_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({
      ok:true,
      status:200,
      json:async()=>({output:[{content:[{type:"output_text",text:"{\"ok\":true}"}]}]}),
    });
    const req={method:"POST",body:{
      system:"Return JSON.",
      user:"Review these files.",
      max_output_tokens:99999,
      user_id:"studio.qa@example.com",
      files:[
        {name:"script.png",type:"image/png",dataUrl:"data:image/png;base64,aGVsbG8="},
        {name:"resume.txt",type:"text/plain",dataUrl:"data:text/plain;base64,aGVsbG8="},
      ],
    }};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({output_text:'{"ok":true}'});
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [,options]=global.fetch.mock.calls[0];
    const payload=JSON.parse(options.body);
    expect(payload.model).toBe("gpt-5.6-sol");
    expect(payload.max_output_tokens).toBe(12000);
    expect(payload.store).toBe(false);
    expect(payload.safety_identifier).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.input[0].content.map(item=>item.type)).toEqual(["input_image","input_file","input_text"]);
    expect(payload.input[0].content[1].filename).toBe("resume.txt");
  });

  test("rejects unsupported attachments before contacting OpenAI",async()=>{
    process.env.OPENAI_API_KEY="test-key";
    global.fetch=jest.fn();
    const req={method:"POST",body:{
      system:"Return JSON.",
      user:"Review this file.",
      files:[{name:"archive.zip",type:"application/zip",dataUrl:"data:application/zip;base64,aGVsbG8="}],
    }};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/supported file type/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
