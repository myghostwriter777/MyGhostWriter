jest.mock("../lib/anthropic", () => {
  const actual = jest.requireActual("../lib/anthropic");
  return { ...actual, callClaude: jest.fn() };
});
jest.mock("../lib/supabaseRest", () => ({ select: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn() }));

const fs = require("fs");
const { callClaude, STUDIO_MODEL } = require("../lib/anthropic");
const { select } = require("../lib/supabaseRest");
const { runTool } = require("../lib/mcp/tools");
const { historyItemText, historyItemSummary, matchesQuery } = require("../lib/mcp/history");

const session = { email: "writer@example.com" };

const slideRow = {
  id: "h2",
  mode: "slides",
  title: "Photosynthesis deck",
  ts: "2026-09-02T10:00:00.000Z",
  output:
    "GWM_SLIDE_DECK_V1\n" +
    JSON.stringify({
      deck: {
        title: "Photosynthesis",
        subtitle: "How leaves eat light",
        slides: [
          { title: "Inside the leaf", supportingText: "Chloroplasts do the work.", bullets: ["Stroma: the fluid"], speakerNotes: "Mention scale." },
          { isSources: true, title: "Sources" },
        ],
        sources: [{ title: "Khan Academy", url: "https://khanacademy.org/x" }],
      },
    }),
};

const mangaRow = {
  id: "h3",
  mode: "manga",
  title: "Last train",
  ts: "2026-09-03T10:00:00.000Z",
  output:
    "GWM_MANGA_STUDIO_V1\n" +
    JSON.stringify({
      pack: {
        title: "Last Train",
        logline: "Two friends miss the last train.",
        characterBible: [{ name: "Mina", appearance: "short dark hair", personality: "guarded" }],
        pages: [{ panels: [{ shot: "Close-up", action: "Mina looks away.", speaker: "Mina", dialogue: "It's fine." }] }],
      },
      images: [{ dataUrl: `data:image/jpeg;base64,${"A".repeat(4000)}` }],
    }),
};

describe("MCP history decoding", () => {
  test("renders a saved slide deck as readable text", () => {
    const text = historyItemText(slideRow);
    expect(text).toContain("Photosynthesis");
    expect(text).toContain("SLIDE 1: Inside the leaf");
    expect(text).toContain("- Stroma: the fluid");
    expect(text).toContain("Speaker notes: Mention scale.");
    expect(text).toContain("1. Khan Academy — https://khanacademy.org/x");
  });

  test("renders a manga pack without leaking base64 image data", () => {
    const text = historyItemText(mangaRow);
    expect(text).toContain("Last Train");
    expect(text).toContain('Mina: "It\'s fine."');
    expect(text).toContain("1 illustrated page");
    expect(text).not.toContain("base64");
    expect(text.length).toBeLessThan(1000);
  });

  test("strips embedded images from plain rows and survives corrupt payloads", () => {
    expect(historyItemText({ output: `See data:image/png;base64,${"B".repeat(500)} here` })).toBe("See [image] here");
    expect(historyItemText({ output: "GWM_SLIDE_DECK_V1\n{not json" })).toContain("not json");
    expect(historyItemText({})).toBe("");
  });

  test("summaries are short and searching needs every word to match", () => {
    const summary = historyItemSummary({ ...slideRow, output: "x".repeat(400) }, 50);
    expect(summary.snippet.endsWith("…")).toBe(true);
    expect(summary.modeLabel).toBe("Slide Deck");
    expect(matchesQuery(slideRow, "photosynthesis leaf")).toBe(true);
    expect(matchesQuery(slideRow, "photosynthesis volcano")).toBe(false);
    expect(matchesQuery(slideRow, "")).toBe(true);
  });
});

describe("MCP tools", () => {
  afterEach(() => jest.clearAllMocks());

  test("the tool model matches the Studio route so the two cannot drift", () => {
    const studioSource = fs.readFileSync(require.resolve("../api/openai.js"), "utf8");
    expect(studioSource).toContain(`const MODEL = "${STUDIO_MODEL}"`);
  });

  test("search_history only reads the caller's own rows and returns ids", async () => {
    select.mockResolvedValue([slideRow, mangaRow]);
    const text = await runTool("search_history", { query: "photosynthesis", limit: 5 }, session);
    const query = select.mock.calls[0][1];
    expect(select.mock.calls[0][0]).toBe("history");
    expect(query).toContain(`email=eq.${encodeURIComponent(session.email)}`);
    expect(text).toContain("[h2]");
    expect(text).toContain("Slide Deck");
    expect(text).not.toContain("[h3]");
  });

  test("search_history reports an empty account plainly", async () => {
    select.mockResolvedValue([]);
    expect(await runTool("search_history", {}, session)).toContain("no saved work yet");
  });

  test("get_history_item refuses an id that is not on the account", async () => {
    select.mockResolvedValue([]);
    await expect(runTool("get_history_item", { id: "someone-else" }, session)).rejects.toThrow(/No saved item/);
    expect(select.mock.calls[0][1]).toContain(`email=eq.${encodeURIComponent(session.email)}`);
  });

  test("write_essay clamps the request and asks for the chosen level and length", async () => {
    callClaude.mockResolvedValue("An essay.");
    await runTool("write_essay", { topic: "Bees", level: "C1", essay_type: "expository", words: 99999 }, session);
    const request = callClaude.mock.calls[0][0];
    expect(request.system).toContain("CEFR C1");
    expect(request.system).toContain("expository");
    expect(request.system).toContain("2000 words");
    expect(request.user).toBe("Essay topic: Bees");
  });

  test("write_essay rejects an empty topic before spending an API call", async () => {
    await expect(runTool("write_essay", { topic: "   " }, session)).rejects.toThrow(/topic is required/);
    expect(callClaude).not.toHaveBeenCalled();
  });

  test("humanize_writing needs enough text to work with", async () => {
    await expect(runTool("humanize_writing", { text: "too short" }, session)).rejects.toThrow(/at least 200 characters/);
    callClaude.mockResolvedValue("Rewritten.");
    expect(await runTool("humanize_writing", { text: "x".repeat(250), intensity: "thorough" }, session)).toBe("Rewritten.");
    expect(callClaude.mock.calls[0][0].system).toContain("thorough changes");
  });

  test("check_ai_content always labels the score as an estimate", async () => {
    callClaude.mockResolvedValue(JSON.stringify({ score: 91, verdict: "Reads as AI", observations: ["Even sentence rhythm"] }));
    const text = await runTool("check_ai_content", { text: "y".repeat(250) }, session);
    expect(text).toContain("91/100");
    expect(text).toContain("- Even sentence rhythm");
    expect(text).toContain("not a calibrated probability");
  });

  test("outline_slide_deck returns readable slides for the requested count", async () => {
    callClaude.mockResolvedValue(
      JSON.stringify({
        title: "Bees",
        subtitle: "Why they matter",
        slides: [
          { title: "Pollination", supportingText: "Bees move pollen.", bullets: ["Scale: a third of crops"], speakerNotes: "Note the figure source." },
          { title: "Extra", supportingText: "Should be trimmed.", bullets: [], speakerNotes: "" },
        ],
      })
    );
    const text = await runTool("outline_slide_deck", { topic: "Bees", slides: 3 }, session);
    expect(text).toContain("SLIDE 1: Pollination");
    expect(text).toContain("  - Scale: a third of crops");
    expect(text).toContain("Speaker notes: Note the figure source.");
    expect(callClaude.mock.calls[0][0].user).toContain("exactly 3 content slides");
  });

  test("an unknown tool name fails without touching the database or the model", async () => {
    await expect(runTool("delete_everything", {}, session)).rejects.toThrow(/Unknown tool/);
    expect(select).not.toHaveBeenCalled();
    expect(callClaude).not.toHaveBeenCalled();
  });
});
