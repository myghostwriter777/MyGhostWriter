import voicesHandler from "../api/elevenlabs-voices";
import speechHandler from "../api/elevenlabs-speech";
import { DEVICE_SPEECH_CHUNK_LIMIT, splitSpeechText } from "./voiceApi";

function mockResponse(){
  const res={statusCode:200,body:null,headers:{}};
  res.setHeader=jest.fn((name,value)=>{res.headers[name]=value;});
  res.status=jest.fn(code=>{res.statusCode=code;return res;});
  res.json=jest.fn(body=>{res.body=body;return res;});
  res.send=jest.fn(body=>{res.body=body;return res;});
  res.end=jest.fn(()=>res);
  return res;
}

describe("ElevenLabs voice API routes",()=>{
  const originalFetch=global.fetch;
  const originalKey=process.env.ELEVENLABS_API_KEY;
  const originalIds=process.env.ELEVENLABS_VOICE_IDS;
  const originalModel=process.env.ELEVENLABS_MODEL_ID;

  beforeEach(()=>{
    process.env.ELEVENLABS_API_KEY="test-elevenlabs-key";
    delete process.env.ELEVENLABS_VOICE_IDS;
    delete process.env.ELEVENLABS_MODEL_ID;
  });

  afterEach(()=>{
    global.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.ELEVENLABS_API_KEY;else process.env.ELEVENLABS_API_KEY=originalKey;
    if(originalIds===undefined)delete process.env.ELEVENLABS_VOICE_IDS;else process.env.ELEVENLABS_VOICE_IDS=originalIds;
    if(originalModel===undefined)delete process.env.ELEVENLABS_MODEL_ID;else process.env.ELEVENLABS_MODEL_ID=originalModel;
    jest.clearAllMocks();
  });

  test("returns a curated, public-safe voice catalog",async()=>{
    process.env.ELEVENLABS_VOICE_IDS="voice_beta_12345,voice_alpha_12345";
    global.fetch=jest.fn().mockResolvedValue({
      ok:true,
      status:200,
      json:async()=>({voices:[
        {voice_id:"voice_alpha_12345",name:"Alpha",category:"premade",description:"Warm narrator",preview_url:"https://example.com/alpha.mp3",labels:{accent:"American",gender:"female"},settings:{stability:0.2}},
        {voice_id:"voice_beta_12345",name:"Beta",category:"professional",description:"Clear guide",preview_url:"https://example.com/beta.mp3",labels:{accent:"British",gender:"male"}},
      ]}),
    });
    const res=mockResponse();

    await voicesHandler({method:"GET"},res);

    expect(res.statusCode).toBe(200);
    expect(res.body.voices.map(voice=>voice.name)).toEqual(["Beta","Alpha"]);
    expect(res.body.voices[1]).not.toHaveProperty("settings");
    expect(res.body.voices[1].labels).toEqual({accent:"American",age:"",gender:"female",useCase:""});
    const [url,options]=global.fetch.mock.calls[0];
    expect(String(url)).toContain("https://api.elevenlabs.io/v2/voices");
    expect(options.headers["xi-api-key"]).toBe("test-elevenlabs-key");
  });

  test("generates bounded Thai speech with Eleven v3",async()=>{
    global.fetch=jest.fn().mockResolvedValue({
      ok:true,
      status:200,
      headers:{get:()=>"audio/mpeg"},
      arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer,
    });
    const res=mockResponse();

    await speechHandler({method:"POST",body:{text:"สวัสดี",voiceId:"JBFqnCBsd6RMkjVDRZzb",language:"th",speed:9}},res);

    expect(res.statusCode).toBe(200);
    expect(Buffer.from(res.body)).toEqual(Buffer.from([1,2,3]));
    const [url,options]=global.fetch.mock.calls[0];
    expect(url).toContain("/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128");
    const payload=JSON.parse(options.body);
    expect(payload.model_id).toBe("eleven_v3");
    expect(payload.language_code).toBe("th");
    expect(payload.voice_settings.speed).toBe(1.2);
    expect(options.headers["xi-api-key"]).toBe("test-elevenlabs-key");
  });

  test("rejects invalid voice IDs before spending provider credits",async()=>{
    global.fetch=jest.fn();
    const res=mockResponse();

    await speechHandler({method:"POST",body:{text:"Hello",voiceId:"../../bad",language:"en"}},res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("invalid_voice");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("enforces the curated voice set on speech requests",async()=>{
    process.env.ELEVENLABS_VOICE_IDS="AllowedVoice123456789";
    global.fetch=jest.fn();
    const res=mockResponse();

    await speechHandler({method:"POST",body:{text:"Hello",voiceId:"DifferentVoice123456",language:"en"}},res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("voice_not_allowed");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("surfaces exhausted ElevenLabs credits instead of changing voices",async()=>{
    global.fetch=jest.fn().mockResolvedValue({
      ok:false,
      status:401,
      json:async()=>({detail:{message:"This request exceeds your quota. You have 33 credits remaining."}}),
    });
    const res=mockResponse();

    await speechHandler({method:"POST",body:{text:"Keep the chosen narrator.",voiceId:"JBFqnCBsd6RMkjVDRZzb",language:"en"}},res);

    expect(res.statusCode).toBe(402);
    expect(res.body.code).toBe("speech_quota_exceeded");
    expect(res.body.error).toMatch(/credits/i);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

test("long narration is split into provider-safe sections",()=>{
  const text=`${"A sentence. ".repeat(520)}\n\n${"Another sentence. ".repeat(220)}`;
  const chunks=splitSpeechText(text,4800);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every(chunk=>chunk.length<=4800)).toBe(true);
  expect(chunks.join(" ").replace(/\s+/g," ").trim()).toBe(text.replace(/\s+/g," ").trim());
});

test("device narration uses short mobile-safe sections",()=>{
  const text="A concise sentence. ".repeat(80);
  const chunks=splitSpeechText(text,DEVICE_SPEECH_CHUNK_LIMIT);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every(chunk=>chunk.length<=DEVICE_SPEECH_CHUNK_LIMIT)).toBe(true);
  expect(chunks.join(" ").replace(/\s+/g," ").trim()).toBe(text.replace(/\s+/g," ").trim());
});
