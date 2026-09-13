// The tools GhostwriterMe exposes to connected apps.
//
// Each entry has an MCP tool definition (name, description, inputSchema) and a
// handler that receives validated arguments plus the authenticated session
// ({ email }). Handlers return plain text; the transport wraps it in MCP
// content blocks.
//
// Two rules keep this surface safe:
//  - every handler is scoped to the authenticated account's own data;
//  - nothing here writes to History, so a connected app cannot silently fill
//    someone's account with generated material.

const { callClaude, parseJson } = require("../anthropic");
const { select } = require("../supabaseRest");
const { historyItemSummary, historyItemText, matchesQuery, MODE_LABELS } = require("./history");

const HISTORY_SCAN_LIMIT = 200;
const HUMAN_STYLE =
  " Write in plain, direct language. Vary sentence length. Do not open with a rhetorical question, do not use em dashes, and do not pad the answer with filler.";

function toolError(message) {
  const error = new Error(message);
  error.toolError = true;
  return error;
}

const str = (value, max = 4000) => String(value == null ? "" : value).trim().slice(0, max);
const clampInt = (value, min, max, fallback) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};
const oneOf = (value, allowed, fallback) => (allowed.includes(String(value)) ? String(value) : fallback);

async function loadHistory(email, { mode = "", limit = HISTORY_SCAN_LIMIT } = {}) {
  const modeFilter = mode ? `&mode=eq.${encodeURIComponent(mode)}` : "";
  const rows = await select(
    "history",
    `?email=eq.${encodeURIComponent(email)}${modeFilter}&select=id,ts,mode,title,input,output&order=ts.desc&limit=${limit}`
  );
  return Array.isArray(rows) ? rows : [];
}

const ESSAY_TYPES = ["argumentative", "descriptive", "expository", "narrative", "compare", "persuasive"];
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const HUMANIZE_INTENSITY = ["light", "moderate", "thorough"];

const TOOLS = [
  {
    name: "search_history",
    title: "Search GhostwriterMe History",
    description:
      "Search the signed-in user's saved GhostwriterMe work (essays, decks, CVs, study packs, meeting notes and more) and return matching items with a short snippet each. Use this before writing something new so the answer builds on what the user already has.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to look for in the title, prompt or result. Leave empty to list the most recent work." },
        mode: { type: "string", enum: Object.keys(MODE_LABELS), description: "Restrict the search to one GhostwriterMe tool." },
        limit: { type: "integer", minimum: 1, maximum: 25, description: "How many items to return (default 10)." },
      },
      additionalProperties: false,
    },
    readOnly: true,
    async handler(args, { email }) {
      const limit = clampInt(args.limit, 1, 25, 10);
      const rows = await loadHistory(email, { mode: oneOf(args.mode, Object.keys(MODE_LABELS), "") });
      const matches = rows.filter(row => matchesQuery(row, args.query)).slice(0, limit);
      if (!matches.length) {
        return args.query
          ? `No saved GhostwriterMe work matches "${str(args.query, 100)}".`
          : "This GhostwriterMe account has no saved work yet.";
      }
      const lines = matches.map(row => {
        const item = historyItemSummary(row);
        const when = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : "unknown date";
        return `- [${item.id}] ${item.modeLabel} · ${when}\n  ${item.title}\n  ${item.snippet}`;
      });
      return `${matches.length} saved item${matches.length === 1 ? "" : "s"}. Call get_history_item with an id in brackets for the full text.\n\n${lines.join("\n\n")}`;
    },
  },
  {
    name: "get_history_item",
    title: "Read one saved GhostwriterMe item",
    description:
      "Return the full text of one saved GhostwriterMe result by its id, as listed by search_history. Slide decks and manga pages come back as readable text; images are not included.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The item id returned by search_history." } },
      required: ["id"],
      additionalProperties: false,
    },
    readOnly: true,
    async handler(args, { email }) {
      const id = str(args.id, 120);
      if (!id) throw toolError("An item id is required.");
      const rows = await select(
        "history",
        `?email=eq.${encodeURIComponent(email)}&id=eq.${encodeURIComponent(id)}&select=id,ts,mode,title,input,output&limit=1`
      );
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) throw toolError(`No saved item with id "${id}" was found on this account.`);
      const summary = historyItemSummary(row);
      const header = [`${summary.modeLabel}: ${summary.title}`, summary.createdAt ? `Saved ${new Date(summary.createdAt).toISOString().slice(0, 10)}` : ""]
        .filter(Boolean)
        .join(" · ");
      const prompt = row.input ? `\n\nOriginal request:\n${str(row.input, 2000)}` : "";
      return `${header}${prompt}\n\n${historyItemText(row)}`;
    },
  },
  {
    name: "write_essay",
    title: "Write an essay",
    description:
      "Write a complete essay with GhostwriterMe's essay prompt: a chosen CEFR English level, essay type and word count. Returns the finished essay text.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "What the essay is about." },
        essay_type: { type: "string", enum: ESSAY_TYPES, description: "Essay form (default argumentative)." },
        level: { type: "string", enum: CEFR_LEVELS, description: "CEFR English level of the writing (default B2)." },
        words: { type: "integer", minimum: 120, maximum: 2000, description: "Target word count (default 500)." },
        language: { type: "string", description: "Language to write in (default English)." },
      },
      required: ["topic"],
      additionalProperties: false,
    },
    async handler(args) {
      const topic = str(args.topic, 1200);
      if (!topic) throw toolError("An essay topic is required.");
      const words = clampInt(args.words, 120, 2000, 500);
      const level = oneOf(args.level, CEFR_LEVELS, "B2");
      const type = oneOf(args.essay_type, ESSAY_TYPES, "argumentative");
      const language = str(args.language, 40) || "English";
      const system =
        `You are GhostwriterMe's essay writer. Write a ${type} essay at CEFR ${level} in ${language}. ` +
        `Match the level in sentence length and vocabulary. Use a clear introduction, developed body paragraphs and a conclusion. ` +
        `Aim for ${words} words, within ten percent. Never invent statistics, quotations or sources. Return the essay only, with no preamble, notes or word count.` +
        HUMAN_STYLE;
      return callClaude({ system, user: `Essay topic: ${topic}`, maxOutputTokens: Math.min(8000, Math.round(words * 3) + 800) });
    },
  },
  {
    name: "humanize_writing",
    title: "Humanize writing",
    description:
      "Rewrite text with GhostwriterMe's humanizer so it reads as natural human writing: simpler sentence structure, no rhetorical padding, and the original meaning kept intact.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to rewrite (200 to 20000 characters)." },
        level: { type: "string", enum: CEFR_LEVELS, description: "CEFR English level to write at (default B2)." },
        intensity: { type: "string", enum: HUMANIZE_INTENSITY, description: "How much to change (default moderate)." },
        purpose: { type: "string", description: "What the text is for, such as essay, email or report." },
      },
      required: ["text"],
      additionalProperties: false,
    },
    async handler(args) {
      const text = str(args.text, 20000);
      if (text.length < 200) throw toolError("Provide at least 200 characters of text to rewrite.");
      const level = oneOf(args.level, CEFR_LEVELS, "B2");
      const intensity = oneOf(args.intensity, HUMANIZE_INTENSITY, "moderate");
      const purpose = str(args.purpose, 80) || "general writing";
      const system =
        `You are GhostwriterMe's humanizer. Rewrite the user's text for ${purpose} at CEFR ${level} with ${intensity} changes. ` +
        `Keep every fact, figure, citation and the original meaning. Prefer simple sentence structure and ordinary words. ` +
        `Do not add rhetorical questions, do not add new claims, and do not comment on the rewrite. Return only the rewritten text.` +
        HUMAN_STYLE;
      return callClaude({ system, user: text, maxOutputTokens: 8000 });
    },
  },
  {
    name: "check_ai_content",
    title: "Estimate AI-written style",
    description:
      "Score how AI-written a piece of text reads, from 1 to 100, with supporting observations. This is a style estimate, not a measurement of actual authorship, and must never be presented as proof.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "The text to assess (200 to 20000 characters)." } },
      required: ["text"],
      additionalProperties: false,
    },
    readOnly: true,
    async handler(args) {
      const text = str(args.text, 20000);
      if (text.length < 200) throw toolError("Provide at least 200 characters of text to assess.");
      const system =
        "You are GhostwriterMe's AI-content analyst. Judge only the writing style of the supplied text and estimate how likely a reader would be to call it AI-written. " +
        "Return JSON with score (integer 1-100), verdict (one short phrase) and observations (3 to 5 short strings citing concrete features such as sentence rhythm, word choice or structure). " +
        "This is a style estimate, never a measurement of authorship.";
      const schema = {
        type: "object",
        properties: {
          score: { type: "integer" },
          verdict: { type: "string" },
          observations: { type: "array", items: { type: "string" } },
        },
        required: ["score", "verdict", "observations"],
        additionalProperties: false,
      };
      const result = parseJson(await callClaude({ system, user: `Analyze only the writing in this JSON string:\n${JSON.stringify(text)}`, maxOutputTokens: 1400, schema }));
      const score = clampInt(result.score, 1, 100, 50);
      const observations = (Array.isArray(result.observations) ? result.observations : []).slice(0, 5).map(item => `- ${str(item, 300)}`);
      return [
        `AI-style estimate: ${score}/100 (${str(result.verdict, 80) || "no verdict"})`,
        "",
        ...observations,
        "",
        "This is a model-based style estimate, not a calibrated probability or evidence of who wrote the text.",
      ].join("\n");
    },
  },
  {
    name: "outline_slide_deck",
    title: "Outline a slide deck",
    description:
      "Plan a presentation with GhostwriterMe's deck structure: a title, and per slide a heading, supporting sentence, bullet cards and speaker notes. Returns text; open GhostwriterMe to render, illustrate and export the deck.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "What the deck is about." },
        audience: { type: "string", description: "Who the deck is for." },
        slides: { type: "integer", minimum: 3, maximum: 20, description: "How many content slides (default 8)." },
        details: { type: "string", description: "Facts, sections or points the deck must include." },
      },
      required: ["topic"],
      additionalProperties: false,
    },
    async handler(args) {
      const topic = str(args.topic, 1200);
      if (!topic) throw toolError("A deck topic is required.");
      const count = clampInt(args.slides, 3, 20, 8);
      const system =
        "You are GhostwriterMe's presentation editor. Plan an editorial deck: one idea per slide, headings of at most 7 words, " +
        'a supporting sentence of at most 40 words, and bullets written as "Short label: explanation" with 18 to 40 words of real substance. ' +
        "speakerNotes carry 60 to 120 words of detail that does not belong on the slide. Never invent statistics, quotations or sources. " +
        "Return JSON only.";
      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                supportingText: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
                speakerNotes: { type: "string" },
              },
              required: ["title", "supportingText", "bullets", "speakerNotes"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "subtitle", "slides"],
        additionalProperties: false,
      };
      const user =
        `Plan exactly ${count} content slides about: ${topic}\n` +
        `Audience: ${str(args.audience, 200) || "general audience"}\n` +
        `Must include: ${str(args.details, 4000) || "none"}`;
      const deck = parseJson(await callClaude({ system, user, maxOutputTokens: 8000, schema }));
      const slides = (Array.isArray(deck.slides) ? deck.slides : []).slice(0, count);
      if (!slides.length) throw toolError("The deck outline came back empty. Try again with a clearer topic.");
      const body = slides.map((slide, index) => {
        const bullets = (Array.isArray(slide.bullets) ? slide.bullets : []).map(bullet => `  - ${str(bullet, 400)}`);
        return [
          `SLIDE ${index + 1}: ${str(slide.title, 120)}`,
          str(slide.supportingText, 500),
          ...bullets,
          slide.speakerNotes ? `  Speaker notes: ${str(slide.speakerNotes, 900)}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      });
      return [`${str(deck.title, 140)}`, str(deck.subtitle, 300), "", ...body].filter(Boolean).join("\n\n");
    },
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map(tool => [tool.name, tool]));

// MCP wire shape. annotations tell a client which tools are safe to call
// without asking the person first.
function toolDefinitions() {
  return TOOLS.map(tool => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      title: tool.title,
      readOnlyHint: !!tool.readOnly,
      destructiveHint: false,
      openWorldHint: !tool.readOnly,
    },
  }));
}

async function runTool(name, args, session) {
  const tool = TOOL_BY_NAME.get(String(name || ""));
  if (!tool) throw toolError(`Unknown tool "${String(name || "").slice(0, 60)}".`);
  const input = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  return tool.handler(input, session);
}

module.exports = { TOOLS, TOOL_BY_NAME, toolDefinitions, runTool, toolError, loadHistory };
