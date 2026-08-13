import handler from "../api/openai";

function mockResponse(){
  const res={statusCode:200,body:null,headers:{}};
  res.setHeader=jest.fn((name,value)=>{res.headers[name]=value;});
  res.status=jest.fn(code=>{res.statusCode=code;return res;});
  res.json=jest.fn(body=>{res.body=body;return res;});
  res.end=jest.fn(()=>res);
  return res;
}

describe("Studio AI API route",()=>{
  const originalFetch=global.fetch;
  const originalKey=process.env.ANTHROPIC_API_KEY;

  afterEach(()=>{
    global.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY=originalKey;
    jest.clearAllMocks();
  });

  test("builds a bounded Anthropic request with image and document inputs",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({
      ok:true,
      status:200,
      json:async()=>({content:[{type:"text",text:"{\"ok\":true}"}]}),
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
    expect(options.headers["x-api-key"]).toBe("test-key");
    expect(payload.model).toBe("claude-sonnet-4-6");
    expect(payload.max_tokens).toBe(16000);
    expect(payload.metadata.user_id).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.messages[0].content.map(item=>item.type)).toEqual(["image","document","text"]);
    expect(payload.messages[0].content[1].title).toBe("resume.txt");
  });

  test("rejects unsupported attachments before contacting the provider",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
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

  test("uses the low-latency Haiku model and a small token budget for Meeting Assist",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({
      ok:true,
      status:200,
      json:async()=>({content:[{type:"text",text:"Sounds good."}]}),
    });
    const req={method:"POST",body:{
      system:"Suggest a concise reply.",
      user:"Recent meeting transcript.",
      mode:"meeting",
      max_output_tokens:240,
    }};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(200);
    const [,options]=global.fetch.mock.calls[0];
    const payload=JSON.parse(options.body);
    expect(payload.model).toBe("claude-haiku-4-5-20251001");
    expect(payload.max_tokens).toBe(240);
  });

  test("constrains Study and Slide results to valid JSON schemas",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({
      ok:true,
      status:200,
      json:async()=>({content:[{type:"text",text:'{"title":"Pack"}'}]}),
    });
    const req={method:"POST",body:{
      system:"Build a study pack.",
      user:"Use the source.",
      mode:"study",
      max_output_tokens:12000,
    }};
    const res=mockResponse();

    await handler(req,res);

    const [,options]=global.fetch.mock.calls[0];
    const payload=JSON.parse(options.body);
    expect(payload.output_config.format.type).toBe("json_schema");
    expect(payload.output_config.format.schema.properties.quiz.items.properties.type.enum).toEqual(["multiple_choice","short_answer"]);
    expect(payload.max_tokens).toBe(12000);
  });
});
