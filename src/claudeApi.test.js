import { EventEmitter } from "events";
import handler from "../api/claude";

function mockResponse() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.setHeader = jest.fn();
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => { res.body = body; return res; });
  res.end = jest.fn(() => res);
  return res;
}
const request = overrides => ({ method: "POST", body: { model: "claude-sonnet-4-6", system: "Help the user.", messages: [{ role: "user", content: "Write a useful answer." }], ...overrides } });
const providerResponse = data => ({ ok: true, status: 200, json: async () => data });
const answer = { stop_reason: "end_turn", content: [{ type: "text", text: "Completed answer." }] };

describe("Claude generation API", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = "test-key"; global.fetch = jest.fn().mockResolvedValue(providerResponse(answer)); });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    jest.useRealTimers();
  });

  test.each(["null", "[]", "true", "42"])("rejects non-object JSON %s without crashing or spending a request", async body => {
    const res = mockResponse();
    await handler({ method: "POST", body }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/object/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each([NaN, Infinity, -1, 0])("normalizes invalid token budgets (%s)", async max_tokens => {
    const res = mockResponse();
    await handler(request({ max_tokens }), res);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).max_tokens).toBe(1500);
    expect(res.statusCode).toBe(200);
  });

  test("bounds tokens and search uses while excluding unsupported request controls", async () => {
    const req = request({ max_tokens: 99999.5, stream: true, thinking: { type: "enabled", budget_tokens: 50000 }, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10000 }] });
    const res = mockResponse();
    await handler(req, res);
    const sent = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sent.max_tokens).toBe(8192);
    expect(sent.tools[0].max_uses).toBe(3);
    expect(sent.stream).toBeUndefined();
    expect(sent.thinking).toBeUndefined();
    expect(req.body.max_tokens).toBe(99999.5);
  });

  test("rejects a web_search-like client tool before contacting the provider", async () => {
    const res = mockResponse();
    await handler(request({ tools: [{ type: "web_search_fake", name: "client_tool" }] }), res);
    expect(res.statusCode).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("resumes Story Guide searches and preserves provider tool state", async () => {
    const paused = { stop_reason: "pause_turn", content: [{ type: "web_search_tool_result", content: [{ encrypted_content: "opaque-result" }] }] };
    global.fetch.mockResolvedValueOnce(providerResponse(paused)).mockResolvedValueOnce(providerResponse(answer));
    const res = mockResponse();
    await handler(request({ tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] }), res);
    expect(res.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const continuation = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(continuation.messages.at(-1)).toEqual({ role: "assistant", content: paused.content });
    expect(continuation.tools[0].name).toBe("web_search");
    expect(res.body.stop_reason).toBe("end_turn");
    expect(res.body.content.at(-1).text).toBe("Completed answer.");
    expect(res.listenerCount("close")).toBe(0);
  });

  test("returns an actionable error if research never leaves pause_turn", async () => {
    global.fetch.mockResolvedValue(providerResponse({ stop_reason: "pause_turn", content: [{ type: "text", text: "Still searching." }] }));
    const res = mockResponse();
    await handler(request({ tools: [{ type: "web_search_20250305", name: "web_search" }] }), res);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(res.statusCode).toBe(502);
    expect(res.body.error.message).toMatch(/could not finish/i);
  });

  test("retains earlier search results across multiple paused turns", async () => {
    const first=[{type:"web_search_tool_result",tool_use_id:"first",content:[{encrypted_content:"first-result"}]}];
    const second=[{type:"web_search_tool_result",tool_use_id:"second",content:[{encrypted_content:"second-result"}]}];
    global.fetch.mockResolvedValueOnce(providerResponse({stop_reason:"pause_turn",content:first}))
      .mockResolvedValueOnce(providerResponse({stop_reason:"pause_turn",content:second}))
      .mockResolvedValueOnce(providerResponse(answer));
    const res=mockResponse();
    await handler(request({tools:[{type:"web_search_20250305",name:"web_search"}]}),res);
    expect(res.statusCode).toBe(200);
    const finalRequest=JSON.parse(global.fetch.mock.calls[2][1].body);
    expect(finalRequest.messages.at(-1).content).toEqual([...first,...second]);
  });

  test("keeps search narration with braces out of Story Guide JSON", async () => {
    const searchResult={type:"web_search_tool_result",content:[{encrypted_content:"result"}]};
    global.fetch.mockResolvedValueOnce(providerResponse({stop_reason:"pause_turn",content:[{type:"text",text:"Looking for {original source}."},searchResult]}))
      .mockResolvedValueOnce(providerResponse({stop_reason:"end_turn",content:[{type:"text",text:"Checking {one more source}."},searchResult,{type:"text",text:'{"title":"Completed story guide"}'}]}));
    const res=mockResponse();
    await handler(request({tools:[{type:"web_search_20250305",name:"web_search"}]}),res);
    expect(res.statusCode).toBe(200);
    const text=res.body.content.map(block=>block.text||"").join("");
    expect(JSON.parse(text)).toEqual({title:"Completed story guide"});
    expect(res.body.content.filter(block=>block.type==="web_search_tool_result")).toHaveLength(2);
  });

  test("keeps the deadline active while waiting for the provider response body", async () => {
    jest.useFakeTimers();
    global.fetch.mockImplementation(async (_url, { signal }) => ({ ok: true, status: 200, json: () => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true })) }));
    const res = mockResponse();
    const pending = handler(request(), res);
    await Promise.resolve();
    jest.advanceTimersByTime(110001);
    await pending;
    expect(res.statusCode).toBe(504);
    expect(res.body.error.message).toMatch(/too long/i);
    expect(jest.getTimerCount()).toBe(0);
  });

  test("stops provider work when the browser disconnects", async () => {
    global.fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true })));
    const res = mockResponse();
    const pending = handler(request(), res);
    const signal = global.fetch.mock.calls[0][1].signal;
    res.emit("close");
    await pending;
    expect(signal.aborted).toBe(true);
    expect(res.listenerCount("close")).toBe(0);
  });

  test.each([null, { content: {} }, { content: [{ type: "text", text: " " }] }, { content: [{ type: "text", text: 42 }] }])("reports malformed or empty provider responses", async data => {
    global.fetch.mockResolvedValue(providerResponse(data));
    const res = mockResponse();
    await handler(request(), res);
    expect(res.statusCode).toBe(502);
    expect(res.body.error.message).toBeTruthy();
  });
});
