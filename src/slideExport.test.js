import { loadDeckSlideImages, loadSlideImage, loadPptxGenerator, slideCanvasBlob, slideCanvasDataUrl } from "./slideExport";
import { drawSlideCanvas } from "./slideCanvas";

const originalImage = global.Image;
let created;

beforeEach(() => {
  created = [];
  global.Image = class {
    naturalWidth = 800;
    naturalHeight = 600;
    constructor() { created.push(this); }
  };
});
afterEach(() => { global.Image = originalImage; jest.restoreAllMocks(); jest.useRealTimers(); });

test("bounds simultaneous image decodes and shares repeated image sources", async () => {
  const images = Array.from({ length: 6 }, (_, i) => ({ id: `image-${i}`, dataUrl: `data:image/png;base64,${i}` }));
  const pending = loadDeckSlideImages({ slides: [{ customImages: [...images, { ...images[0], id: "duplicate" }] }] });
  expect(created).toHaveLength(4);
  const firstBatch = [...created];
  firstBatch.forEach(image => image.onload());
  await Promise.resolve();
  expect(created).toHaveLength(6);
  created.slice(4).forEach(image => image.onload());
  const result = await pending;
  expect(result.size).toBe(7);
  expect(result.get("image-0")).toBe(result.get("duplicate"));
  expect(created.every(image => image.onload === null && image.onerror === null)).toBe(true);
});

test("rejects damaged images instead of silently exporting incomplete slides", async () => {
  const pending = loadDeckSlideImages({ slides: [{ customImages: [{ id: "broken", dataUrl: "broken" }] }] });
  const rejected = expect(pending).rejects.toThrow("Reattach it before exporting");
  created[0].onerror();
  await rejected;
  expect(created[0].onload).toBeNull(); expect(created[0].onerror).toBeNull();
});

test("times out stalled image decodes and releases their handlers", async () => {
  jest.useFakeTimers();
  const pending = loadSlideImage("stalled");
  const rejected = expect(pending).rejects.toThrow("could not be loaded");
  jest.advanceTimersByTime(15000);
  await rejected;
  expect(created[0].src).toBe("");
  expect(created[0].onload).toBeNull(); expect(created[0].onerror).toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});

test("frees the raster surface after successful or failed data URL encoding", () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1600; canvas.height = 900;
  jest.spyOn(canvas, "toDataURL").mockReturnValue("data:image/png;base64,AAAA");
  expect(slideCanvasDataUrl(canvas, "image/png")).toBe("data:image/png;base64,AAAA");
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  canvas.width = 1600; canvas.height = 900;
  canvas.toDataURL.mockImplementation(() => { throw new Error("Encoding failed"); });
  expect(() => slideCanvasDataUrl(canvas, "image/png")).toThrow("Encoding failed");
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
});

test("keeps a raster surface until asynchronous blob encoding finishes", async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1600; canvas.height = 900;
  let finish;
  jest.spyOn(canvas, "toBlob").mockImplementation(callback => { finish = callback; });
  const pending = slideCanvasBlob(canvas, "image/png");
  expect(canvas.width).toBe(1600);
  const result = new Blob(["image"]); finish(result);
  await expect(pending).resolves.toBe(result);
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
});

test("frees raster memory when a browser never completes blob encoding", async () => {
  jest.useFakeTimers();
  const canvas = document.createElement("canvas");
  jest.spyOn(canvas, "toBlob").mockImplementation(() => {});
  const pending = slideCanvasBlob(canvas, "image/png");
  const rejected = expect(pending).rejects.toThrow("took too long");
  jest.advanceTimersByTime(30000);
  await rejected;
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
});

test("reports unavailable rendering contexts and releases the failed canvas", () => {
  let canvas;
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () { canvas = this; return null; });
  expect(() => drawSlideCanvas({}, {}, 0)).toThrow("could not prepare the slide image");
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
});

test("retries the PPTX exporter after script failure and shares concurrent loads", async () => {
  delete window.PptxGenJS;
  const first = loadPptxGenerator();
  expect(loadPptxGenerator()).toBe(first);
  const failedScript = document.querySelector('script[data-gwm-pptx="true"]');
  const rejected = expect(first).rejects.toThrow("could not load");
  failedScript.dispatchEvent(new Event("error"));
  await rejected;
  expect(failedScript.isConnected).toBe(false);
  const retry = loadPptxGenerator();
  const newScript = document.querySelector('script[data-gwm-pptx="true"]');
  expect(newScript).not.toBe(failedScript);
  const generator = function PptxGenJS() {};
  window.PptxGenJS = generator;
  newScript.dispatchEvent(new Event("load"));
  await expect(retry).resolves.toBe(generator);
  delete window.PptxGenJS; newScript.remove();
});

test("times out stalled PPTX loading so a subsequent export can retry", async () => {
  jest.useFakeTimers(); delete window.PptxGenJS;
  const pending = loadPptxGenerator();
  const rejected = expect(pending).rejects.toThrow("took too long");
  jest.advanceTimersByTime(30000);
  await rejected;
  expect(document.querySelector('script[data-gwm-pptx="true"]')).toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});
