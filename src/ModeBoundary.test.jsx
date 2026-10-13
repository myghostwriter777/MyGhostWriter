import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LazyMeetingAssistMode, ModeBoundary } from "./ModeBoundary";

let consoleError;
beforeEach(() => { consoleError = jest.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { consoleError.mockRestore(); });

function Draft() {
  const [text, setText] = useState("");
  return <input aria-label="Other tool draft" value={text} onChange={event => setText(event.target.value)} />;
}

test("a failed tool can restart without losing a sibling draft", () => {
  let broken = false;
  let mounts = 0;
  function Tool() {
    const [count, setCount] = useState(() => { mounts += 1; return 0; });
    if (broken) throw new Error("Tool failed");
    return <button onClick={() => setCount(value => value + 1)}>Tool count {count}</button>;
  }
  const app = () => <><Draft /><ModeBoundary label="Writing"><Tool /></ModeBoundary></>;
  const { rerender } = render(app());
  fireEvent.change(screen.getByLabelText("Other tool draft"), { target: { value: "Keep this draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Tool count 0" }));
  broken = true; rerender(app());
  expect(screen.getByRole("alert")).toHaveTextContent("Writing could not open");
  expect(screen.getByLabelText("Other tool draft")).toHaveValue("Keep this draft");
  const previousMounts = mounts;
  broken = false; fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByRole("button", { name: "Tool count 0" })).toBeInTheDocument();
  expect(mounts).toBeGreaterThan(previousMounts);
  expect(screen.getByLabelText("Other tool draft")).toHaveValue("Keep this draft");
});

test("a changed reset key clears an earlier tool failure", () => {
  function Broken() { throw new Error("Failed"); }
  const { rerender } = render(<ModeBoundary resetKey="first"><Broken /></ModeBoundary>);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  rerender(<ModeBoundary resetKey="second"><div>New tool</div></ModeBoundary>);
  expect(screen.getByText("New tool")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("a failed lazy import retries with a fresh loader and preserves other tools", async () => {
  const load = jest.fn()
    .mockRejectedValueOnce(new Error("Chunk download failed"))
    .mockResolvedValueOnce({ default: ({ marker }) => <div>Meeting ready {marker}</div> });
  render(<><Draft /><LazyMeetingAssistMode load={load} marker="again" /></>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Meeting Assist could not open");
  fireEvent.change(screen.getByLabelText("Other tool draft"), { target: { value: "Unsaved work" } });
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Meeting ready again")).toBeInTheDocument();
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("Other tool draft")).toHaveValue("Unsaved work");
});

test("loading a tool shows progress until its module arrives", async () => {
  let finish;
  const load = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  render(<LazyMeetingAssistMode load={load} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading Meeting Assist");
  await act(async () => { finish({ default: () => <div>Loaded meeting</div> }); });
  expect(screen.getByText("Loaded meeting")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
