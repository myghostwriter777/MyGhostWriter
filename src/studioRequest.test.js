import { callStudioAI } from "./App";

jest.mock("./localWhisper", () => ({ prepareLocalWhisper: jest.fn(), transcribeLocalAudio: jest.fn() }));

const originalFetch = global.fetch;
beforeEach(() => { jest.useFakeTimers(); localStorage.clear(); });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test("times out a stalled response body after the server has sent its headers", async () => {
  let signal, rejectBody;
  global.fetch = jest.fn(async (_url, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise((_resolve, reject) => {
      rejectBody = reject;
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }) };
  });
  const result = callStudioAI("System", "Question", 100, [], "", { timeoutMs: 15000 }).catch(error => error);
  await Promise.resolve();
  jest.advanceTimersByTime(15000);
  try { expect(signal.aborted).toBe(true); }
  finally { rejectBody(new DOMException("Aborted", "AbortError")); }
  expect((await result).message).toMatch(/took too long/);
  expect(jest.getTimerCount()).toBe(0);
});

test("honors cancellation while the response body is downloading", async () => {
  const controller = new AbortController();
  let signal, rejectBody;
  global.fetch = jest.fn(async (_url, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise((_resolve, reject) => {
      rejectBody = reject;
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }) };
  });
  const result = callStudioAI("System", "Question", 100, [], "", { signal: controller.signal }).catch(error => error);
  await Promise.resolve(); controller.abort();
  try { expect(signal.aborted).toBe(true); }
  finally { rejectBody(new DOMException("Aborted", "AbortError")); }
  expect(await result).toBeInstanceOf(Error);
  expect(jest.getTimerCount()).toBe(0);
});
