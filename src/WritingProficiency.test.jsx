import React, { useEffect } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { WritingProficiencyProvider, useWritingProficiency } from "./WritingProficiency";

function Probe({ capture }) {
  const proficiency = useWritingProficiency();
  useEffect(() => { capture(proficiency); }, [capture, proficiency]);
  return <><output data-testid="level">{proficiency.level}</output><output data-testid="pending">{proficiency.pending}</output></>;
}

function setup() {
  const capture = jest.fn();
  render(<WritingProficiencyProvider><Probe capture={capture}/></WritingProficiencyProvider>);
  return () => capture.mock.calls.at(-1)[0];
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

const selector = () => within(screen.getByRole("group", { name: "English level (CEFR)" }));
const chooseLevel = level => fireEvent.click(selector().getByRole("button", { name: level, exact: true }));

test("a retained live-session callback uses the latest selected level for later requests", async () => {
  const current = setup();
  const retainedRun = current().runAtLevel;
  chooseLevel("C1");
  expect(current().runAtLevel).toBe(retainedRun);
  let result;
  await act(async () => { result = await retainedRun(level => `Reply at ${level}`); });
  expect(result).toBe("Reply at C1");
  chooseLevel("A2");
  await act(async () => { result = await retainedRun(level => `Reply at ${level}`); });
  expect(result).toBe("Reply at A2");
});

test("a selection is visible to a new request even before React flushes the render", async () => {
  const current = setup();
  const { setLevel, runAtLevel } = current();
  let result;
  await act(async () => {
    setLevel(" c2 ");
    result = await runAtLevel(level => level);
  });
  expect(result).toBe("C2");
  expect(screen.getByTestId("level")).toHaveTextContent("C2");
});

test("an in-flight request stays pinned and blocks both UI and programmatic level changes", async () => {
  const current = setup();
  chooseLevel("A1");
  const work = deferred();
  const task = jest.fn(async level => { await work.promise; return level; });
  let pending;
  act(() => { pending = current().runAtLevel(task); });
  expect(screen.getByTestId("pending")).toHaveTextContent("1");
  selector().getAllByRole("button").forEach(button => expect(button).toBeDisabled());
  chooseLevel("C2");
  act(() => { current().setLevel("C2"); });
  expect(current().level).toBe("A1");
  let result;
  await act(async () => { work.resolve(); result = await pending; });
  expect(result).toBe("A1");
  expect(task).toHaveBeenCalledTimes(1);
  expect(task).toHaveBeenCalledWith("A1");
  expect(screen.getByTestId("pending")).toHaveTextContent("0");
  chooseLevel("C2");
  expect(current().level).toBe("C2");
});

test("a failed request propagates its error and releases the level selector", async () => {
  const current = setup();
  const work = deferred();
  const failure = new Error("The writing request failed.");
  let observed;
  act(() => { observed = current().runAtLevel(() => work.promise).catch(error => error); });
  expect(selector().getByRole("button", { name: "A2", exact: true })).toBeDisabled();
  let result;
  await act(async () => { work.reject(failure); result = await observed; });
  expect(result).toBe(failure);
  expect(current().pending).toBe(0);
  chooseLevel("A2");
  expect(current().level).toBe("A2");
  await act(async () => { result = await current().runAtLevel(level => level); });
  expect(result).toBe("A2");
});

test("overlapping requests keep selection locked until every request finishes", async () => {
  const current = setup();
  const retainedRun = current().runAtLevel;
  chooseLevel("C1");
  const first = deferred(), second = deferred();
  const firstTask = jest.fn(async level => { await first.promise; return level; });
  const secondTask = jest.fn(async level => { await second.promise; return level; });
  let firstRequest, secondRequest;
  act(() => {
    firstRequest = retainedRun(firstTask);
    secondRequest = retainedRun(secondTask);
  });
  expect(current().pending).toBe(2);
  let firstResult, secondResult;
  await act(async () => { first.resolve(); firstResult = await firstRequest; });
  expect(firstResult).toBe("C1");
  expect(current().pending).toBe(1);
  selector().getAllByRole("button").forEach(button => expect(button).toBeDisabled());
  act(() => { current().setLevel("A1"); });
  expect(current().level).toBe("C1");
  await act(async () => { second.resolve(); secondResult = await secondRequest; });
  expect(secondResult).toBe("C1");
  expect(current().pending).toBe(0);
  selector().getAllByRole("button").forEach(button => expect(button).toBeEnabled());
  chooseLevel("A1");
  expect(current().level).toBe("A1");
});
