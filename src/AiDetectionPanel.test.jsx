import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiDetectionPanel from "./AiDetectionPanel";
import { aiDetectionInputError, parseAiDetection } from "./aiDetection";

const source = "A specific account of the experiment, its details and what happened. ".repeat(6);
const response = JSON.stringify({ score: 67, summary: "Some phrasing is repetitive; authorship is uncertain.", signals: ["Repeated sentence openings."] });

test("validates score bounds without manufacturing a score from bad data", () => {
  for (const score of [0, 101, null, "67"]) expect(() => parseAiDetection(JSON.stringify({ score, summary: "Assessment" }))).toThrow(/invalid score/);
  expect(() => parseAiDetection("incomplete response")).toThrow(/could not be read/);
  expect(parseAiDetection(response).score).toBe(67);
  expect(aiDetectionInputError("short")).toMatch(/200 characters/);
  expect(aiDetectionInputError("x".repeat(20001))).toMatch(/20,000/);
});

test("analyzes the selected text and hides the old score when that text changes", async () => {
  const analyze = jest.fn().mockResolvedValue(response);
  const { rerender } = render(<AiDetectionPanel text={source} analyze={analyze}/>);
  expect(analyze).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Analyze AI content" }));
  expect(await screen.findByText("67%")).toBeInTheDocument();
  expect(analyze.mock.calls[0][0]).toBe(source.trim());
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "67");
  expect(screen.getByText(/cannot measure how much/)).toBeInTheDocument();
  rerender(<AiDetectionPanel text={source + " Changed."} analyze={analyze}/>);
  expect(screen.queryByText("67%")).not.toBeInTheDocument();
});

test("cancels stale analysis and allows analysis of the humanized result", async () => {
  let resolve;
  const analyze = jest.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue(response);
  const rewrittenText = source + " Rewritten.";
  render(<AiDetectionPanel text={source} rewrittenText={rewrittenText} analyze={analyze}/>);
  fireEvent.click(screen.getByRole("button", { name: "Analyze AI content" }));
  const signal = analyze.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "Humanized text" }));
  expect(signal.aborted).toBe(true);
  await act(async () => { resolve(response); });
  expect(screen.queryByText("67%")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Analyze AI content" }));
  expect(await screen.findByText("67%")).toBeInTheDocument();
  expect(analyze.mock.calls[1][0]).toBe(rewrittenText);
});

test("blocks insufficient input and shows recoverable service errors", async () => {
  const analyze = jest.fn().mockRejectedValueOnce(new Error("Service unavailable")).mockResolvedValue(response);
  const { rerender } = render(<AiDetectionPanel text="" analyze={analyze}/>);
  expect(screen.getByRole("button", { name: "Analyze AI content" })).toBeDisabled();
  rerender(<AiDetectionPanel text={source} analyze={analyze}/>);
  fireEvent.click(screen.getByRole("button", { name: "Analyze AI content" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Analyze AI content" }));
  await waitFor(() => expect(screen.getByRole("meter")).toBeInTheDocument());
});
