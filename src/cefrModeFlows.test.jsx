import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { AppShell } from "./App";

jest.mock("./localWhisper", () => ({ prepareLocalWhisper: jest.fn(), transcribeLocalAudio: jest.fn() }));

const originalFetch = global.fetch;
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const user = { email: "cefr-tester@example.test", name: "Writing Tester", plan: "student", isAdmin: true, allFeatures: true };
const response = value => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], stop_reason: "end_turn" }) });
let modelReply;
let handleModel;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("gwm_notice_academic", "1");
  localStorage.setItem("gwm_notice_humanize", "1");
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  modelReply = "A complete generated passage.";
  handleModel = () => Promise.resolve(response(modelReply));
  global.fetch = jest.fn((url, options) => {
    if (url === "/api/claude") return handleModel(JSON.parse(options.body));
    if (url === "/api/openai") return Promise.resolve({ ok: true, status: 200, json: async () => ({ output_text: typeof modelReply === "string" ? modelReply : JSON.stringify(modelReply) }) });
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [] }) });
  });
});

afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

function ModeHarness({ initialMode }) {
  const [mode, setMode] = useState(initialMode);
  return <AppShell user={user} activeMode={mode} setActiveMode={setMode} onSignOut={jest.fn()} onUpdateUser={jest.fn()} onUpgrade={jest.fn()} onChangePlan={jest.fn()} onCancelPlan={jest.fn()} theme="dark" onToggleTheme={jest.fn()} starEffect={false} onToggleStarEffect={jest.fn()}/>;
}
const renderMode = mode => render(<ModeHarness initialMode={mode}/>);
const modelRequests = () => global.fetch.mock.calls.filter(([url]) => url === "/api/claude").map(([, options]) => JSON.parse(options.body));
const levelGroup = () => screen.getByRole("group", { name: "English level (CEFR)" });
const chooseLevel = level => {
  const button = within(levelGroup()).getByRole("button", { name: level, exact: true });
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-pressed", "true");
};
const expectLevel = (request, level) => {
  expect(request.system).toContain(`CEFR WRITING LEVEL: ${level}`);
  expect(request.system).toContain("Sentence structure:");
  expect(request.system).toContain("Silent self-review:");
};
const setEssayTopic = () => fireEvent.change(screen.getByPlaceholderText(/The impact of social media/), { target: { value: "The benefits of community gardens" } });
const setHumanizeSource = () => fireEvent.change(screen.getByPlaceholderText(/Paste any AI-generated/), { target: { value: "The committee examined the evidence before making its final recommendation." } });

test.each(levels)("Essay sends the selected %s sentence and vocabulary profile", async level => {
  renderMode("essay"); chooseLevel(level); setEssayTopic();
  fireEvent.click(screen.getByRole("button", { name: "Generate Essay" }));
  await screen.findByText(modelReply);
  expect(modelRequests()).toHaveLength(1);
  expectLevel(modelRequests()[0], level);
});

test.each(levels)("both Humanize passes retain the selected %s profile", async level => {
  modelReply = { humanized: "The revised paragraph keeps the original meaning.", changes: [], note: "" };
  renderMode("humanize"); chooseLevel(level); setHumanizeSource();
  fireEvent.click(screen.getByRole("button", { name: "Humanize My Writing" }));
  await screen.findByText(modelReply.humanized);
  expect(modelRequests()).toHaveLength(2);
  for (const request of modelRequests()) {
    expectLevel(request, level);
    expect(request.system).not.toContain("Most sentences should be 8 to 18 words");
    expect(request.system).not.toContain("Use simple sentence structure and one main idea per sentence");
    expect(request.system).not.toContain("Make the writing clearer and simpler");
  }
});

test.each([
  { mode: "writing", placeholder: /Add bullet points or short notes/, button: "Write My Sentence", output: "Our community garden opens on Saturday." },
  { mode: "email", placeholder: "What's this email about?", button: "Generate Email", output: { subject: "Community garden", body: "Please join us on Saturday.", tip: "Keep the invitation specific." } },
  { mode: "grammar", placeholder: "Any text — email, essay, message...", button: "Check & Rewrite", output: { errors: [], rewritten: "The garden opens on Saturday.", score: 95, summary: "The corrected text is clear." } },
  { mode: "author", placeholder: /A young mage discovers/, button: "Generate Scene", output: "At dawn, the gardener found an unfamiliar seed by the gate." },
])("$mode applies its selected CEFR level to generated prose", async ({ mode, placeholder, button, output }) => {
  modelReply = output;
  renderMode(mode); chooseLevel("C1");
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: "A community garden opens on Saturday." } });
  fireEvent.click(screen.getByRole("button", { name: button }));
  const expected = typeof output === "string" ? output : output.body || output.rewritten;
  await screen.findByText(expected);
  expectLevel(modelRequests()[0], "C1");
});

test.each([
  { mode: "essay", oldCap: 2000 },
  { mode: "academic", oldCap: 2500 },
])("$mode reserves enough output tokens for a 2000-word request", async ({ mode, oldCap }) => {
  renderMode(mode);
  if (mode === "academic") {
    fireEvent.click(screen.getByRole("button", { name: /Academic Draft Builder.*Generate outlines/ }));
    fireEvent.change(screen.getByPlaceholderText(/The role of AI in modern healthcare/), { target: { value: "Community gardens and public health" } });
  } else setEssayTopic();
  chooseLevel("C2");
  const wordCount = screen.getAllByRole("combobox").find(select => within(select).queryByRole("option", { name: "2000 words" }));
  fireEvent.change(wordCount, { target: { value: "2000" } });
  fireEvent.click(screen.getByRole("button", { name: mode === "academic" ? "Generate Example Draft" : "Generate Essay" }));
  await screen.findByText(modelReply);
  const request = modelRequests()[0];
  expectLevel(request, "C2");
  expect(request.max_tokens).toBeGreaterThan(oldCap);
  expect(request.max_tokens).toBeLessThanOrEqual(8192);
  expect(JSON.stringify(request.messages)).toContain("2000");
});

test("academic follow-up uses the current level without changing the prior feedback", async () => {
  modelReply = { grade: "B", range: "80-89", numeric: 85, summary: "Your argument has a clear focus.", categories: [], strengths: [], improvements: [], revisions: [] };
  renderMode("academic"); chooseLevel("A1");
  fireEvent.change(screen.getByPlaceholderText(/Paste your full essay or a section/), { target: { value: "The community garden helps neighbours meet and grow fresh food." } });
  fireEvent.click(screen.getByRole("button", { name: "Analyze My Essay" }));
  await screen.findByText("Your argument has a clear focus.");
  expectLevel(modelRequests()[0], "A1");
  chooseLevel("C1"); modelReply = "Link the evidence to your central claim and qualify its limitations.";
  fireEvent.change(screen.getByLabelText("Follow-up question"), { target: { value: "How could I develop my argument?" } });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  await screen.findByText(modelReply);
  expectLevel(modelRequests()[1], "C1");
  expect(screen.getByText("Your argument has a clear focus.")).toBeInTheDocument();
});

test.each(["essay", "humanize"])("%s locks the level while generating and keeps the output's original label", async mode => {
  let complete;
  let requested = false;
  modelReply = mode === "humanize" ? { humanized: "A polished paragraph with its original meaning.", changes: [], note: "" } : "A complete essay at the chosen level.";
  handleModel = () => {
    if (requested) return Promise.resolve(response(modelReply));
    requested = true;
    return new Promise(resolve => { complete = resolve; });
  };
  renderMode(mode); chooseLevel("B2");
  if (mode === "essay") setEssayTopic(); else setHumanizeSource();
  fireEvent.click(screen.getByRole("button", { name: mode === "essay" ? "Generate Essay" : "Humanize My Writing" }));
  await waitFor(() => expect(complete).toBeDefined());
  for (const button of within(levelGroup()).getAllByRole("button")) expect(button).toBeDisabled();
  await act(async () => { complete(response(modelReply)); });
  await screen.findByText(typeof modelReply === "string" ? modelReply : modelReply.humanized);
  const outputLabel = mode === "essay" ? /Argumentative.*B2/ : /Humanized Output.*B2/;
  expect(screen.getByText(outputLabel)).toBeInTheDocument();
  chooseLevel("A1");
  expect(screen.getByText(outputLabel)).toBeInTheDocument();
  expect(screen.queryByText(mode === "essay" ? /Argumentative.*A1/ : /Humanized Output.*A1/)).not.toBeInTheDocument();
});

test("Presentation sends the selected level through the Studio generation route", async () => {
  modelReply = {
    title: "Community gardens presentation", summary: "A balanced group presentation.", totalMinutes: 10, handoffs: [],
    sections: Array.from({ length: 6 }, (_, index) => ({ speaker: `Speaker ${index % 3 + 1}`, heading: `Section ${index + 1}`, script: "Community gardens help neighbours share food and knowledge.", visualCue: "Show the garden." })),
  };
  renderMode("presentation"); chooseLevel("C2");
  fireEvent.change(screen.getByPlaceholderText(/How urban gardens/), { target: { value: "Community gardens" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate Group Script" }));
  await screen.findByText("Community gardens presentation");
  const requests = global.fetch.mock.calls.filter(([url]) => url === "/api/openai").map(([, options]) => JSON.parse(options.body));
  expect(requests).toHaveLength(1);
  expect(requests[0].mode).toBe("presentation");
  expectLevel(requests[0], "C2");
});

test("keeps independent per-mode levels and uses them after switching back", async () => {
  renderMode("writing"); chooseLevel("A2");
  const notes = "The community garden opens on Saturday.";
  fireEvent.change(screen.getByPlaceholderText(/Add bullet points or short notes/), { target: { value: notes } });
  fireEvent.click(screen.getByRole("button", { name: "Email", exact: true }));
  expect(within(levelGroup()).getByRole("button", { name: "B2", exact: true })).toHaveAttribute("aria-pressed", "true");
  chooseLevel("C2");
  fireEvent.click(screen.getByRole("button", { name: "Writing", exact: true }));
  expect(within(levelGroup()).getByRole("button", { name: "A2", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByPlaceholderText(/Add bullet points or short notes/)).toHaveValue(notes);
  modelReply = "The garden opens this Saturday.";
  fireEvent.click(screen.getByRole("button", { name: "Write My Sentence" }));
  await screen.findByText(modelReply);
  expectLevel(modelRequests()[0], "A2");
  fireEvent.click(screen.getByRole("button", { name: "Email", exact: true }));
  expect(within(levelGroup()).getByRole("button", { name: "C2", exact: true })).toHaveAttribute("aria-pressed", "true");
  modelReply = { subject: "Garden invitation", body: "We would be delighted if you joined the opening this Saturday.", tip: "Include the location." };
  fireEvent.change(screen.getByPlaceholderText("What's this email about?"), { target: { value: "Invite neighbours to the garden opening." } });
  fireEvent.click(screen.getByRole("button", { name: "Generate Email" }));
  await screen.findByText(modelReply.body);
  expectLevel(modelRequests()[1], "C2");
});

test("Grammar preserves a 1500-word source and reserves room for the full A2 rewrite", async () => {
  const source = Array.from({ length: 1500 }, (_, index) => `word${index}`).join(" ");
  modelReply = { errors: [], rewritten: "Every idea from the source is retained in the revised text.", score: 95, summary: "The grammar is now clear." };
  renderMode("grammar"); chooseLevel("A2");
  fireEvent.change(screen.getByPlaceholderText("Any text — email, essay, message..."), { target: { value: source } });
  fireEvent.click(screen.getByRole("button", { name: "Check & Rewrite" }));
  await screen.findByText(modelReply.rewritten);
  expect(modelRequests()).toHaveLength(1);
  const request = modelRequests()[0];
  expectLevel(request, "A2");
  expect(request.messages[0].content).toContain(source);
  expect(request.max_tokens).toBeGreaterThanOrEqual(3750);
  expect(request.max_tokens).toBeLessThanOrEqual(8192);
});
