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

  test("passes presentation PDFs to the provider as documents with the presentation schema",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({content:[{type:"text",text:'{"title":"Deck"}'}]})});
    const res=mockResponse();
    await handler({method:"POST",body:{system:"Follow the attached slide order.",user:"Generate a script.",mode:"presentation",files:[{name:"deck.pdf",type:"application/pdf",dataUrl:"data:application/pdf;base64,JVBERi0xLjc="}]}},res);
    expect(res.statusCode).toBe(200);
    const request=JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.messages[0].content[0]).toMatchObject({type:"document",title:"deck.pdf",source:{type:"base64",media_type:"application/pdf",data:"JVBERi0xLjc="}});
    expect(request.output_config.format.schema.properties.sections.items.properties.visualCue).toEqual({type:"string"});
  });

  test("requires a numeric AI-content score and explanation in structured output",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({content:[{type:"text",text:'{"score":42,"summary":"Mixed patterns","signals":[]}'}]})});
    const res=mockResponse();
    await handler({method:"POST",body:{system:"Assess writing style.",user:"Source text to analyze.",mode:"ai-detection",max_output_tokens:1400}},res);
    expect(res.statusCode).toBe(200);
    const request=JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.output_config.format.schema.properties.score).toEqual({type:"integer"});
    expect(request.output_config.format.schema.required).toEqual(["score","summary","signals"]);
    expect(request.max_tokens).toBe(1400);
    expect(request.tools).toBeUndefined();
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

  test("constrains researched slide decks to detailed visual cards and sources",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({content:[{type:"text",text:'{"title":"Deck"}'}]})});
    const req={method:"POST",body:{system:"Build a Zen deck.",user:"Use one idea per slide.",mode:"slides",max_output_tokens:14000}};const res=mockResponse();
    await handler(req,res);
    const payload=JSON.parse(global.fetch.mock.calls[0][1].body);const slideSchema=payload.output_config.format.schema.properties.slides.items;
    expect(slideSchema.required).toContain("supportingText");
    expect(slideSchema.required).toContain("bullets");
    expect(slideSchema.required).toContain("sourceUrls");
    expect(payload.output_config.format.schema.required).toContain("sources");
    expect(slideSchema.properties.visualType.enum).toEqual(["hero-image","image-cards","process","image-detail","icon-columns","equation","takeaway-grid"]);
    expect(slideSchema.properties.layout.enum).toEqual(["left-third","right-third","top-third","full-bleed"]);
    expect(slideSchema.required).toContain("isHumorBeat");
  });

  test("constrains Manga Studio storyboards to page and panel schemas",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({content:[{type:"text",text:'{"title":"Page"}'}]})});
    const req={method:"POST",body:{system:"Build a manga storyboard.",user:"Use original characters.",mode:"manga",max_output_tokens:8500}};const res=mockResponse();
    await handler(req,res);
    const payload=JSON.parse(global.fetch.mock.calls[0][1].body);const schema=payload.output_config.format.schema;
    expect(schema.properties.pages.items.properties.panels.items.required).toEqual(["shot","action","speaker","dialogue","caption"]);
    expect(schema.properties.characterBible.items.required).toEqual(["name","appearance","personality"]);
  });

  test("uses the requested bounded search depth and returns source URLs for Deep Research",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({stop_reason:"end_turn",content:[{type:"text",text:"Evidence-based conclusion.",citations:[{url:"https://example.edu/paper",title:"Primary study"}]}]})});
    const req={method:"POST",body:{system:"Research carefully.",user:"Compare the evidence.",mode:"deep-research",use_search:true,search_depth:8,max_output_tokens:9000}};const res=mockResponse();
    await handler(req,res);
    const payload=JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload.tools).toEqual([{type:"web_search_20250305",name:"web_search",max_uses:8}]);
    expect(res.body).toEqual({output_text:"Evidence-based conclusion.",sources:[{url:"https://example.edu/paper",title:"Primary study"}]});
  });

  test("continues a paused Deep Research search instead of returning an empty result",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn()
      .mockResolvedValueOnce({ok:true,status:200,json:async()=>({stop_reason:"pause_turn",content:[{type:"web_search_tool_result",content:[{type:"web_search_result",url:"https://example.org/report",title:"Official report"}]}]})})
      .mockResolvedValueOnce({ok:true,status:200,json:async()=>({stop_reason:"end_turn",content:[{type:"text",text:"Completed research."}]})});
    const req={method:"POST",body:{system:"Research carefully.",user:"Finish the comparison.",mode:"deep-research",use_search:true}};const res=mockResponse();
    await handler(req,res);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const continuation=JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(continuation.messages.at(-1).role).toBe("assistant");
    expect(res.body.output_text).toBe("Completed research.");
    expect(res.body.sources).toEqual([{url:"https://example.org/report",title:"Official report"}]);
  });

  test("constrains Presentation Studio to a structured script result",async()=>{
    process.env.ANTHROPIC_API_KEY="test-key";
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({content:[{type:"text",text:'{"title":"Talk"}'}]})});
    const req={method:"POST",body:{system:"Build a presentation.",user:"Use six sections.",mode:"presentation",max_output_tokens:5000}};const res=mockResponse();
    await handler(req,res);
    const schema=JSON.parse(global.fetch.mock.calls[0][1].body).output_config.format.schema;
    expect(schema.required).toEqual(["title","summary","totalMinutes","sections","handoffs"]);
    expect(schema.properties.sections.items.required).toEqual(["speaker","role","heading","timing","script","visualCue"]);
  });
});
