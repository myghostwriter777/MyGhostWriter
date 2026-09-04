import { preparePresentationPdf, presentationSourceInstructions } from "./presentationPdf";
import { getDocument } from "pdfjs-dist/build/pdf.mjs";

jest.mock("pdfjs-dist/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument: jest.fn() }));

const makeFile = (content = "%PDF-1.7\nfixture", name = "slides.pdf") => {
  const file = new File([content], name, { type: "application/pdf" });
  file.arrayBuffer = async () => Uint8Array.from(content, char => char.charCodeAt(0)).buffer;
  return file;
};

function mockPdf(texts) {
  const pages = texts.map(text => ({ getTextContent: jest.fn().mockResolvedValue({ items: [{ str: text, hasEOL: true }] }), cleanup: jest.fn() }));
  const pdf = { numPages: pages.length, getPage: jest.fn(number => Promise.resolve(pages[number - 1])) };
  const task = { promise: Promise.resolve(pdf), destroy: jest.fn().mockResolvedValue() };
  getDocument.mockReturnValue(task);
  return { pages, pdf, task };
}

afterEach(() => jest.clearAllMocks());

test("extracts slide text in order and retains the complete PDF for visual reading", async () => {
  const { pages, task } = mockPdf(["Solar Energy", "Annual savings: 35%"]);
  const prepared = await preparePresentationPdf(makeFile());
  expect(prepared.pageCount).toBe(2);
  expect(prepared.textPages).toBe(2);
  expect(prepared.preview).toMatch(/\[Slide 1\]\nSolar Energy[\s\S]*\[Slide 2\]\nAnnual savings: 35%/);
  expect(prepared.dataUrl).toMatch(/^data:application\/pdf;base64,/);
  expect(atob(prepared.dataUrl.split(",")[1])).toBe("%PDF-1.7\nfixture");
  expect(pages.every(page => page.cleanup.mock.calls.length === 1)).toBe(true);
  expect(task.destroy).toHaveBeenCalled();
  expect(presentationSourceInstructions(prepared)).toMatch(/slide order/);
});

test("preserves scanned slides for provider visual reading", async () => {
  mockPdf(["", ""]);
  const prepared = await preparePresentationPdf(makeFile());
  expect(prepared.textPages).toBe(0);
  expect(prepared.preview).toMatch(/read visually/);
  expect(prepared.type).toBe("application/pdf");
});

test("bounds only the preview while reading every page and preserving the full PDF", async () => {
  const { pdf } = mockPdf(["A".repeat(13000), "Final slide"]);
  const prepared = await preparePresentationPdf(makeFile());
  expect(prepared.preview.length).toBeLessThanOrEqual(12000);
  expect(prepared.previewTruncated).toBe(true);
  expect(prepared.textPages).toBe(2);
  expect(pdf.getPage).toHaveBeenCalledWith(2);
  expect(atob(prepared.dataUrl.split(",")[1])).toBe("%PDF-1.7\nfixture");
});

test("rejects unsupported, empty, oversized, and invalid files before parsing", async () => {
  await expect(preparePresentationPdf(new File(["text"], "notes.txt", { type: "text/plain" }))).rejects.toThrow(/Choose a PDF/);
  await expect(preparePresentationPdf(makeFile(""))).rejects.toThrow(/empty/);
  await expect(preparePresentationPdf({ name: "large.pdf", size: 4 * 1024 * 1024 + 1 })).rejects.toThrow(/4 MB/);
  await expect(preparePresentationPdf(makeFile("not a PDF"))).rejects.toThrow(/not a valid PDF/);
  expect(getDocument).not.toHaveBeenCalled();
});

test("rejects excessive page counts and releases the PDF worker", async () => {
  const { task } = mockPdf(Array(101).fill("slide"));
  await expect(preparePresentationPdf(makeFile())).rejects.toThrow(/100 pages/);
  expect(task.destroy).toHaveBeenCalled();
});

test.each([["PasswordException", /unlocked copy/], ["InvalidPDFException", /damaged or unreadable/]])("handles %s", async (name, message) => {
  const task = { promise: Promise.reject(Object.assign(new Error("PDF error"), { name })), destroy: jest.fn().mockResolvedValue() };
  // Create the rejection only once getDocument is called to avoid an unhandled promise.
  task.promise.catch(() => {});
  getDocument.mockReturnValue(task);
  await expect(preparePresentationPdf(makeFile())).rejects.toThrow(message);
  expect(task.destroy).toHaveBeenCalled();
});
