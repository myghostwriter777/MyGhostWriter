import { createMeetingTranscriber, MeetingTranscriptionError, transcribeOnServer } from "./meetingTranscriber";

const audio=new Float32Array(1600).fill(0.1);

describe("meeting transcriber",()=>{
  test("uses the server route first and stays there while it works",async()=>{
    const server=jest.fn().mockResolvedValue("Tell me about yourself.");
    const local=jest.fn();
    const transcriber=createMeetingTranscriber({server,local,prepareLocal:jest.fn()});
    await expect(transcriber.transcribe(audio,{sampleRate:16000,language:"en",prompt:"Job interview."})).resolves.toBe("Tell me about yourself.");
    expect(server).toHaveBeenCalledTimes(1);
    expect(server.mock.calls[0][1]).toEqual(expect.objectContaining({language:"en",prompt:"Job interview."}));
    // Quiet audio is lifted before it reaches the model.
    expect(Math.max(...Array.from(server.mock.calls[0][0]).map(Math.abs))).toBeCloseTo(0.85,5);
    expect(local).not.toHaveBeenCalled();
    expect(transcriber.mode).toBe("server");
  });

  test("switches to the on-device model after a terminal server failure",async()=>{
    const server=jest.fn().mockRejectedValue(new MeetingTranscriptionError("No credits.",{code:"gateway_credits",retryable:false}));
    const local=jest.fn().mockResolvedValue("Why do you want this role?");
    const prepareLocal=jest.fn().mockResolvedValue();
    const onModeChange=jest.fn();
    const transcriber=createMeetingTranscriber({server,local,prepareLocal,onModeChange});
    await expect(transcriber.transcribe(audio)).resolves.toBe("Why do you want this role?");
    expect(prepareLocal).toHaveBeenCalledTimes(1);
    expect(onModeChange).toHaveBeenCalledWith(expect.objectContaining({mode:"local"}));
    await transcriber.transcribe(audio);
    expect(server).toHaveBeenCalledTimes(1);
    expect(local).toHaveBeenCalledTimes(2);
  });

  test("retries later after a rate limit without abandoning the server",async()=>{
    let clock=1000;
    const server=jest.fn().mockRejectedValueOnce(new MeetingTranscriptionError("Busy",{code:"rate_limited",retryable:true,retryAfter:10})).mockResolvedValue("Recovered.");
    const transcriber=createMeetingTranscriber({server,local:jest.fn(),prepareLocal:jest.fn(),now:()=>clock});
    await expect(transcriber.transcribe(audio)).rejects.toMatchObject({code:"rate_limited"});
    await expect(transcriber.transcribe(audio)).rejects.toMatchObject({code:"cooldown",skipped:true});
    clock+=11000;
    await expect(transcriber.transcribe(audio)).resolves.toBe("Recovered.");
    expect(transcriber.mode).toBe("server");
  });

  test("falls back to the device after repeated network failures",async()=>{
    const server=jest.fn().mockRejectedValue(new MeetingTranscriptionError("Offline",{code:"network",retryable:true}));
    const local=jest.fn().mockResolvedValue("Local text");
    const transcriber=createMeetingTranscriber({server,local,prepareLocal:jest.fn(),maxNetworkFailures:2});
    await expect(transcriber.transcribe(audio)).rejects.toMatchObject({code:"network"});
    await expect(transcriber.transcribe(audio)).resolves.toBe("Local text");
    expect(transcriber.mode).toBe("local");
  });

  test("posts WAV audio with language and vocabulary hints and maps failures",async()=>{
    const fetchImpl=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({text:" Hello there "})});
    await expect(transcribeOnServer(audio,{fetchImpl,language:"th",prompt:"  Job interview. Names: Acme.  "})).resolves.toBe("Hello there");
    const body=JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.audio).toMatch(/^data:audio\/wav;base64,/);
    expect(body.language).toBe("th");
    expect(body.prompt).toBe("Job interview. Names: Acme.");
    await transcribeOnServer(audio,{fetchImpl,language:"not a code",prompt:"   "});
    const plain=JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(plain).not.toHaveProperty("language");
    expect(plain).not.toHaveProperty("prompt");
    const failing=jest.fn().mockResolvedValue({ok:false,status:503,json:async()=>({error:"No credits",code:"gateway_credits",retryable:false})});
    await expect(transcribeOnServer(audio,{fetchImpl:failing})).rejects.toMatchObject({code:"gateway_credits",retryable:false});
    const offline=jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(transcribeOnServer(audio,{fetchImpl:offline})).rejects.toMatchObject({code:"network",retryable:true});
  });
});
