import { requestJson } from "./requestJson";

const originalFetch=global.fetch;
beforeEach(()=>jest.useFakeTimers());
afterEach(()=>{global.fetch=originalFetch;jest.useRealTimers();});

test.each(["headers","body"])("a stalled %s phase settles even if the browser ignores abort",async phase=>{
  global.fetch=jest.fn(()=>phase==="headers"?new Promise(()=>{}):Promise.resolve({ok:true,json:()=>new Promise(()=>{})}));
  const result=requestJson("/api/test",{}, {timeoutMs:1000}).catch(error=>error);
  await Promise.resolve();
  jest.advanceTimersByTime(1000);
  expect((await result).code).toBe("AI_REQUEST_TIMEOUT");
  expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

test("a request cancelled in advance does not reach the server",async()=>{
  global.fetch=jest.fn();const controller=new AbortController();controller.abort();
  await expect(requestJson("/api/test",{}, {signal:controller.signal})).rejects.toMatchObject({name:"AbortError"});
  expect(global.fetch).not.toHaveBeenCalled();expect(jest.getTimerCount()).toBe(0);
});

test("user cancellation is distinct from a timeout and removes listeners",async()=>{
  const controller=new AbortController();const remove=jest.spyOn(controller.signal,"removeEventListener");
  global.fetch=jest.fn(()=>new Promise(()=>{}));
  const result=requestJson("/api/test",{}, {signal:controller.signal}).catch(error=>error);
  controller.abort();
  expect(await result).toMatchObject({name:"AbortError"});
  expect(remove).toHaveBeenCalledWith("abort",expect.any(Function));expect(jest.getTimerCount()).toBe(0);
});

test("malformed success bodies fail instead of appearing as empty successful results",async()=>{
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>{throw new SyntaxError("bad json");}}));
  await expect(requestJson("/api/test")).rejects.toThrow(/unreadable response/);
  expect(jest.getTimerCount()).toBe(0);
});

test("an unreadable HTTP error preserves its status for caller-specific recovery",async()=>{
  global.fetch=jest.fn(async()=>({ok:false,status:413,json:async()=>{throw new SyntaxError("html error");}}));
  expect(await requestJson("/api/test")).toMatchObject({response:{status:413},data:{}});
});
