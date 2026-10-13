import { createPortfolioPdf, drawPortfolioPage } from "./portfolioLayout";
import { jsPDF } from "jspdf";

jest.mock("jspdf", () => ({ jsPDF: jest.fn() }));

const portfolio = { title: "My portfolio", introduction: "I build robots.", sections: [{ heading: "Projects", body: "A school project." }] };
const originalImage = global.Image;
const originalPath = global.Path2D;
let context;

beforeEach(() => {
  context = { scale: jest.fn(), fill: jest.fn(), fillRect: jest.fn(), strokeRect: jest.fn(), fillText: jest.fn(), drawImage: jest.fn(), measureText: jest.fn(text => ({ width: text.length * 5 })) };
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAAA");
  global.Path2D = class {};
});

afterEach(() => {
  jest.restoreAllMocks(); jest.useRealTimers(); global.Image = originalImage; global.Path2D = originalPath;
});

test("releases the large page canvas if PDF encoding fails", async () => {
  let canvas;
  HTMLCanvasElement.prototype.toDataURL.mockImplementation(function () { canvas = this; throw new Error("Encoding failed"); });
  jsPDF.mockImplementation(() => ({ setProperties: jest.fn(), addImage: jest.fn(), addPage: jest.fn() }));
  await expect(createPortfolioPdf(portfolio)).rejects.toThrow("Encoding failed");
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
});

test("releases the page canvas and image handlers after a photo times out", async () => {
  jest.useFakeTimers();
  let photo, canvas;
  global.Image = class { constructor() { photo = this; } };
  HTMLCanvasElement.prototype.getContext.mockImplementation(function () { canvas = this; return context; });
  const pending = drawPortfolioPage({ ops: [{ type: "image", src: "data:image/png;base64,AAAA", x: 0, y: 0, w: 100, h: 100 }] });
  const rejected = expect(pending).rejects.toThrow("A portfolio photo could not be loaded");
  jest.advanceTimersByTime(15000);
  await rejected;
  expect(photo.onload).toBeNull(); expect(photo.onerror).toBeNull(); expect(photo.src).toBe("");
  expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});
