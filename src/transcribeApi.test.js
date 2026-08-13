const mockTranscribe = jest.fn();
const mockTranscription = jest.fn(model => ({ modelId: model }));
const mockCreateGateway = jest.fn(() => ({ transcriptionModel: (...args) => mockTranscription(...args) }));
const mockGetVercelOidcToken = jest.fn();

jest.mock("ai", () => ({ transcribe: (...args) => mockTranscribe(...args) }));
jest.mock("@ai-sdk/gateway", () => ({
  gateway: { transcriptionModel: (...args) => mockTranscription(...args) },
  createGateway: (...args) => mockCreateGateway(...args),
  GatewayError: { isInstance: error => Boolean(error?.gatewayError) },
}));
jest.mock("@vercel/oidc", () => ({ getVercelOidcToken: (...args) => mockGetVercelOidcToken(...args) }));

import handler from "../api/transcribe";

function mockResponse(){
  const res={statusCode:200,body:null};
  res.status=jest.fn(code=>{res.statusCode=code;return res;});
  res.json=jest.fn(body=>{res.body=body;return res;});
  return res;
}

describe("meeting transcription API",()=>{
  let consoleError;
  beforeEach(()=>{
    mockTranscription.mockImplementation(model=>({modelId:model}));
    mockCreateGateway.mockImplementation(()=>({transcriptionModel:(...args)=>mockTranscription(...args)}));
    mockGetVercelOidcToken.mockResolvedValue("");
    consoleError=jest.spyOn(console,"error").mockImplementation(()=>{});
  });
  afterEach(()=>{consoleError.mockRestore();jest.clearAllMocks();});

  test("sends a bounded WebM segment through Vercel AI Gateway",async()=>{
    mockTranscribe.mockResolvedValue({text:"Could you send the updated timeline?"});
    const req={method:"POST",body:{audio:"data:audio/webm;codecs=opus;base64,aGVsbG8=",language:"en"}};
    const res=mockResponse();

    await handler(req,res);

    expect(res.statusCode).toBe(200);
    expect(res.body.text).toMatch(/updated timeline/);
    expect(mockTranscription).toHaveBeenCalledWith("openai/gpt-4o-mini-transcribe");
    const request=mockTranscribe.mock.calls[0][0];
    expect(request.model).toEqual({modelId:"openai/gpt-4o-mini-transcribe"});
    expect(Array.from(request.audio)).toEqual([104,101,108,108,111]);
    expect(request.maxRetries).toBe(0);
  });

  test("returns a terminal, truthful error when Gateway credits are unavailable",async()=>{
    mockTranscribe.mockRejectedValue({gatewayError:true,statusCode:402,type:"response_error"});
    const res=mockResponse();
    await handler({method:"POST",body:{audio:"data:audio/webm;base64,aGVsbG8="}},res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual(expect.objectContaining({code:"gateway_credits",retryable:false}));
  });

  test("uses Vercel OIDC instead of a restricted static Gateway key",async()=>{
    mockTranscribe.mockResolvedValue({text:"OIDC transcription works"});
    mockGetVercelOidcToken.mockResolvedValue("short-lived-oidc-token");
    const res=mockResponse();
    await handler({method:"POST",headers:{},body:{audio:"data:audio/webm;base64,aGVsbG8="}},res);
    expect(res.statusCode).toBe(200);
    expect(mockCreateGateway).toHaveBeenCalledWith({apiKey:"short-lived-oidc-token"});
    expect(res.body.text).toBe("OIDC transcription works");
  });

  test("marks a real rate limit as retryable",async()=>{
    mockTranscribe.mockRejectedValue({gatewayError:true,statusCode:429,type:"rate_limit_exceeded"});
    const res=mockResponse();
    await handler({method:"POST",body:{audio:"data:audio/webm;base64,aGVsbG8="}},res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual(expect.objectContaining({code:"rate_limited",retryable:true,retry_after:15}));
  });

  test("rejects unsupported data before contacting the Gateway",async()=>{
    const res=mockResponse();
    await handler({method:"POST",body:{audio:"data:text/plain;base64,aGVsbG8="}},res);
    expect(res.statusCode).toBe(400);
    expect(mockTranscribe).not.toHaveBeenCalled();
  });
});
