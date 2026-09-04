import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HumanizeMode, PresentationMode } from "./App";
import { preparePresentationPdf } from "./presentationPdf";

jest.mock("./localWhisper", () => ({ prepareLocalWhisper: jest.fn(), transcribeLocalAudio: jest.fn() }));
jest.mock("./presentationPdf", () => ({
  ...jest.requireActual("./presentationPdf"), preparePresentationPdf: jest.fn(),
}));

const originalFetch = global.fetch;
const deck = { name: "energy.pdf", type: "application/pdf", size: 100, dataUrl: "data:application/pdf;base64,JVBERi0=", pageCount: 2, textPages: 2, preview: "[Slide 1]\nSolar energy\n[Slide 2]\nSavings", preparedLabel: "2 slides ready" };
const script = { title: "Solar energy script", summary: "A presentation based on the slides.", totalMinutes: 10, handoffs: [], sections: Array.from({ length: 6 }, (_, index) => ({ speaker: `Speaker ${index % 3 + 1}`, heading: `Section ${index + 1}`, script: "Our findings show energy savings.", visualCue: "Slide 1" })) };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("gwm_notice_humanize", "1");
  preparePresentationPdf.mockReset().mockResolvedValue(deck);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(script) }) });
});
afterEach(() => { global.fetch = originalFetch; });

test("creates a PDF-based script without a topic, then clears the PDF for a new script", async () => {
  render(<PresentationMode/>);
  expect(screen.getByRole("button", { name: "Generate Group Script" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Presentation PDF (optional)"), { target: { files: [new File(["pdf"], "energy.pdf", { type: "application/pdf" })] } });
  const generate = await screen.findByRole("button", { name: "Generate Script from PDF" });
  expect(generate).toBeEnabled();
  expect(screen.getByText(/Slide text extracted/)).toBeInTheDocument();
  fireEvent.click(generate);
  expect(await screen.findByText("Solar energy script")).toBeInTheDocument();
  const request = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(request.files).toEqual([{ name: deck.name, type: deck.type, dataUrl: deck.dataUrl }]);
  expect(request.mode).toBe("presentation");
  expect(request.system).toMatch(/primary source[\s\S]*slide order/);
  expect(request.user).toMatch(/Presenter count: 3[\s\S]*section count: 6/);
  expect(sessionStorage.getItem("gwm_presentation_result_guest")).not.toContain("base64");
  fireEvent.click(screen.getByRole("button", { name: /New Script/ }));
  expect(screen.queryByText("energy.pdf")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Generate Group Script" })).toBeDisabled();
});

test("retains topic-only generation and keeps PDF attachments out of friend reviews", async () => {
  render(<PresentationMode/>);
  fireEvent.change(screen.getByPlaceholderText(/How urban gardens/), { target: { value: "Urban gardens" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate Group Script" }));
  await screen.findByText("Solar energy script");
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).files).toEqual([]);
  fireEvent.click(screen.getByRole("tab", { name: "Check a Friend's Script" }));
  expect(screen.getByPlaceholderText(/Paste your friend's presentation script/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Presentation PDF (optional)")).not.toBeInTheDocument();
});

test("blocks generation during PDF reading and reports upload failures", async () => {
  let reject;
  preparePresentationPdf.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  render(<PresentationMode/>);
  fireEvent.change(screen.getByPlaceholderText(/How urban gardens/), { target: { value: "Solar energy" } });
  fireEvent.change(screen.getByLabelText("Presentation PDF (optional)"), { target: { files: [new File(["pdf"], "energy.pdf")] } });
  expect(screen.getByRole("button", { name: "Generate Group Script" })).toBeDisabled();
  reject(new Error("This PDF is password protected. Upload an unlocked copy."));
  expect(await screen.findByRole("alert")).toHaveTextContent("password protected");
  await waitFor(() => expect(screen.getByRole("button", { name: "Generate Group Script" })).toBeEnabled());
  expect(global.fetch).not.toHaveBeenCalled();
});

test("Humanize analyzes the original text through the existing route without rewriting it", async () => {
  const text = "We reviewed the experiment carefully and recorded its results for the team. ".repeat(6);
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify({ score: 42, summary: "Mixed stylistic signals.", signals: ["Similar sentence patterns."] }) }) });
  render(<HumanizeMode/>);
  const input = screen.getByPlaceholderText(/Paste any AI-generated/);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Analyze AI content" }));
  expect(await screen.findByText("42%")).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("/api/openai");
  const request = JSON.parse(options.body);
  expect(request.mode).toBe("ai-detection");
  expect(request.system).not.toContain("WRITING STYLE (apply to all generated prose");
  expect(request.user).toContain(text.trim());
  expect(input).toHaveValue(text);
  expect(screen.getByRole("button", { name: "Humanize My Writing" })).toBeEnabled();
});
