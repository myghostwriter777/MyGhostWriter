import { createHash } from "crypto";
import { createGenerationDeadline, requestAnthropic } from "./_lib/generation";

// Text-only requests, especially Meeting Assist, do not need the DOCX parser.
let mammothPromise;
const loadMammoth = () => mammothPromise || (mammothPromise = import("mammoth").then(module => module.default || module));

export const config = {
  maxDuration: 150,
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const MODEL = "claude-sonnet-4-6";
const MEETING_MODEL = "claude-haiku-4-5-20251001";
const MAX_OUTPUT_TOKENS = 16000;
const MAX_FILES = 6;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SYSTEM_CHARS = 12000;
const MAX_USER_CHARS = 30000;
const MAX_EXTRACTED_FILE_CHARS = 120000;

const text = { type: "string" };
const stringList = { type: "array", items: text };
const objectSchema = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const STRUCTURED_OUTPUTS = {
  "portfolio-create": objectSchema({
    title: text,
    introduction: text,
    sections: { type: "array", items: objectSchema({ heading: text, body: text }) },
    checklist: stringList,
  }),
  "portfolio-review": objectSchema({
    readable: { type: "boolean" },
    summary: text,
    criteria: { type: "array", items: objectSchema({
      name: { type: "string", enum: ["Content", "Structure", "Evidence", "Presentation", "Accuracy"] },
      score: { type: "integer" }, feedback: text,
    }) },
    strengths: stringList,
    mistakes: { type: "array", items: objectSchema({ page: { type: "integer" }, excerpt: text, issue: text, correction: text }) },
    suggestions: stringList,
    missingInformation: stringList,
  }),
  "ai-detection": objectSchema({
    score: { type: "integer" },
    summary: text,
    signals: stringList,
  }),
  // Meeting Assist labels who said each new transcript line and, when the
  // other party asked something, returns exactly three spoken-style answers.
  meeting: objectSchema({
    lines: {
      type: "array",
      items: objectSchema({
        index: { type: "integer" },
        speaker: { type: "string", enum: ["other", "you", "unclear"] },
      }),
    },
    needsReply: { type: "boolean" },
    heard: text,
    options: stringList,
  }),
  presentation: objectSchema({
    title: text,
    summary: text,
    totalMinutes: { type: "number" },
    sections: {
      type: "array",
      items: objectSchema({
        speaker: text,
        role: text,
        heading: text,
        timing: text,
        script: text,
        visualCue: text,
      }),
    },
    handoffs: stringList,
  }),
  study: objectSchema({
    title: text,
    sourceSummary: text,
    summary: text,
    bulletPoints: stringList,
    studyGuide: {
      type: "array",
      items: objectSchema({
        heading: text,
        notes: stringList,
        keyTerms: {
          type: "array",
          items: objectSchema({ term: text, definition: text }),
        },
      }),
    },
    flashcards: {
      type: "array",
      items: objectSchema({ front: text, back: text }),
    },
    quiz: {
      type: "array",
      items: objectSchema({
        id: text,
        type: { type: "string", enum: ["multiple_choice", "short_answer"] },
        question: text,
        options: stringList,
        correctAnswer: text,
        explanation: text,
      }),
    },
  }),
  "study-grade": objectSchema({
    score: { type: "number" },
    total: { type: "number" },
    percentage: { type: "number" },
    results: {
      type: "array",
      items: objectSchema({
        id: text,
        correct: { type: "boolean" },
        points: { type: "number" },
        feedback: text,
        correctAnswer: text,
      }),
    },
    overallFeedback: text,
  }),
  slides: objectSchema({
    title: text,
    subtitle: text,
    slides: {
      type: "array",
      items: objectSchema({
        eyebrow: text,
        title: text,
        supportingText: text,
        bullets: stringList,
        speakerNotes: text,
        visualDirection: text,
        visualType: {
          type: "string",
          enum: ["hero-image", "image-cards", "process", "image-detail", "icon-columns", "equation", "takeaway-grid"],
        },
        layout: { type: "string", enum: ["left-third", "right-third", "top-third", "full-bleed"] },
        narrativeRole: { type: "string", enum: ["hook", "context", "process", "detail", "components", "evidence", "insight", "resolution", "close"] },
        isHumorBeat: { type: "boolean" },
        visualLabel: text,
        dataValue: text,
        dataLabel: text,
        sourceUrls: stringList,
      }),
    },
    sources: {
      type: "array",
      items: objectSchema({ title: text, url: text }),
    },
    closing: text,
  }),
  manga: objectSchema({
    title: text,
    logline: text,
    characterBible: {
      type: "array",
      items: objectSchema({ name: text, appearance: text, personality: text }),
    },
    pages: {
      type: "array",
      items: objectSchema({
        pageNumber: { type: "number" },
        visualPrompt: text,
        panels: {
          type: "array",
          items: objectSchema({
            shot: text,
            action: text,
            speaker: text,
            dialogue: text,
            caption: text,
          }),
        },
      }),
    },
  }),
};

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DATA_URL_RE = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/;

function safeFilename(name, index) {
  const cleaned = String(name || `attachment-${index + 1}`)
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .slice(0, 120);
  return cleaned || `attachment-${index + 1}`;
}

function validateFiles(files) {
  if (files == null) return { files: [], totalBytes: 0 };
  if (!Array.isArray(files) || files.length > MAX_FILES) {
    throw new Error(`Upload up to ${MAX_FILES} files at a time.`);
  }

  let totalBytes = 0;
  const validated = files.map((file, index) => {
    const match = typeof file?.dataUrl === "string" ? file.dataUrl.match(DATA_URL_RE) : null;
    const mime = String(file?.type || match?.[1] || "").toLowerCase();
    if (!match || match[1].toLowerCase() !== mime || !ALLOWED_FILE_TYPES.has(mime)) {
      throw new Error(`Attachment ${index + 1} is not a supported file type.`);
    }

    const base64 = match[2].replace(/[\r\n]/g, "");
    if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      throw new Error(`Attachment ${index + 1} contains invalid file data.`);
    }
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const bytes = Math.floor((base64.length * 3) / 4) - padding;
    if (bytes <= 0 || bytes > MAX_FILE_BYTES) {
      throw new Error(`Attachment ${index + 1} must be smaller than 4 MB.`);
    }
    totalBytes += bytes;
    return {
      filename: safeFilename(file?.name, index),
      mime,
      base64,
    };
  });

  if (totalBytes > MAX_TOTAL_FILE_BYTES) {
    throw new Error("The combined attachments are too large.");
  }
  return { files: validated, totalBytes };
}

async function toClaudeContent(files) {
  const content = [];
  for (const file of files) {
    if (file.mime.startsWith("image/")) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: file.mime, data: file.base64 },
      });
      continue;
    }

    if (file.mime === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: file.base64 },
        title: file.filename,
      });
      continue;
    }

    let text;
    if (file.mime === "text/plain") {
      text = Buffer.from(file.base64, "base64").toString("utf8");
    } else {
      const mammoth = await loadMammoth();
      const extracted = await mammoth.extractRawText({ buffer: Buffer.from(file.base64, "base64") });
      text = extracted.value;
    }
    text = String(text || "").trim();
    if (!text) throw new Error(`${file.filename} does not contain readable text.`);
    if (text.length > MAX_EXTRACTED_FILE_CHARS) {
      throw new Error(`${file.filename} contains too much text. Please upload a shorter document.`);
    }
    content.push({
      type: "document",
      source: { type: "text", media_type: "text/plain", data: text },
      title: file.filename,
    });
  }
  return content;
}

function extractOutputText(data, structured = false) {
  const content = Array.isArray(data?.content) ? data.content : [];
  const blocks = content.filter((item) => item?.type === "text" && typeof item?.text === "string");
  if (structured && content.some(item => item?.type === "web_search_tool_result")) {
    return blocks.at(-1)?.text || "";
  }
  return blocks
    .map((item) => item.text)
    .join("");
}

function extractWebSources(responses) {
  const sources = new Map();
  const add = (item) => {
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!/^https?:\/\//i.test(url) || sources.has(url)) return;
    let fallbackTitle = "Research source";
    try {
      fallbackTitle = new URL(url).hostname;
    } catch {}
    sources.set(url, {
      url,
      title: String(item?.title || item?.document_title || fallbackTitle).trim().slice(0, 240),
    });
  };
  const visit = (item) => {
    if (!item || typeof item !== "object") return;
    add(item);
    if (Array.isArray(item.citations)) item.citations.forEach(add);
    if (Array.isArray(item.content)) item.content.forEach(visit);
  };
  responses.forEach((data) => (Array.isArray(data?.content) ? data.content : []).forEach(visit));
  return [...sources.values()].slice(0, 30);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "The Studio AI service is not configured yet." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Could not parse the request." });
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Request body is required." });
  }

  const system = typeof body.system === "string" ? body.system.trim() : "";
  const user = typeof body.user === "string" ? body.user.trim() : "";
  if (!system || !user || system.length > MAX_SYSTEM_CHARS || user.length > MAX_USER_CHARS) {
    return res.status(400).json({ error: "The Studio prompt is missing or too long." });
  }

  let validated;
  try {
    validated = validateFiles(body.files);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let content;
  try {
    content = await toClaudeContent(validated.files);
  } catch (error) {
    return res.status(400).json({ error: error.message || "One of the attachments could not be read." });
  }
  content.push({ type: "text", text: user });

  const isMeetingRequest = body.mode === "meeting";
  const requestedTokens = Number(body.max_output_tokens);
  const minimumOutputTokens = isMeetingRequest ? 160 : 500;
  const maxOutputTokens = Number.isFinite(requestedTokens)
    ? Math.max(minimumOutputTokens, Math.min(Math.floor(requestedTokens), MAX_OUTPUT_TOKENS))
    : 5000;

  const requestBody = {
    model: isMeetingRequest ? MEETING_MODEL : MODEL,
    system,
    messages: [{ role: "user", content }],
    max_tokens: maxOutputTokens,
  };

  const structuredSchema = Object.prototype.hasOwnProperty.call(STRUCTURED_OUTPUTS, body.mode) ? STRUCTURED_OUTPUTS[body.mode] : null;
  if (structuredSchema) {
    requestBody.output_config = {
      format: { type: "json_schema", schema: structuredSchema },
    };
  }

  // Study Mode may include a public website URL. Anthropic's server-side
  // search tool lets the model ground that source without our server scraping
  // arbitrary URLs. Other Studio requests keep the existing no-tool behavior.
  if (body.use_search === true) {
    const requestedSearchDepth = Number(body.search_depth);
    const maxSearchUses = body.mode === "deep-research"
      ? Math.max(4, Math.min(10, Number.isFinite(requestedSearchDepth) ? Math.floor(requestedSearchDepth) : 6))
      : 3;
    requestBody.tools = [
      { type: "web_search_20250305", name: "web_search", max_uses: maxSearchUses },
    ];
  }

  if (typeof body.user_id === "string" && body.user_id.trim()) {
    requestBody.metadata = {
      user_id: createHash("sha256")
        .update(body.user_id.trim().toLowerCase())
        .digest("hex"),
    };
  }

  const deadline = createGenerationDeadline(req, res, isMeetingRequest ? 25000 : body.mode === "deep-research" ? 140000 : 110000);
  let response, data, responseParts;
  try {
    ({ response, data, responseParts } = await requestAnthropic(requestBody, apiKey, deadline.signal));
  } catch {
    if (deadline.signal.aborted) return res.status(504).json({ error: "The Studio took too long to respond. Try a shorter source or fewer sections." });
    return res.status(502).json({ error: "Could not reach the Studio AI service." });
  } finally {
    deadline.cleanup();
  }
  if (!response.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 400;
    const message = response.status === 429
      ? "The Studio is busy right now. Please wait a moment and try again."
      : "The Studio could not generate this result. Please check the files and try again.";
    return res.status(status).json({ error: message });
  }

  if (data?.stop_reason === "pause_turn") {
    return res.status(502).json({ error: "The research search could not finish. Try a more focused question." });
  }
  if (data?.stop_reason === "refusal") {
    return res.status(422).json({ error: "The Studio could not complete this request. Try rephrasing the instructions." });
  }
  // A search preamble is not part of a structured JSON result. The final
  // response carries the completed object; retain all turns only for sources.
  const outputText = (body.use_search === true && !structuredSchema ? responseParts : [data])
    .map(part => extractOutputText(part, Boolean(structuredSchema)))
    .filter(Boolean)
    .join("\n\n")
    .trim();
  if (["max_tokens", "model_context_window_exceeded"].includes(data?.stop_reason)) {
    return res.status(502).json({ error: "The Studio result was too long to finish. Try fewer questions or slides." });
  }
  if (!outputText) {
    return res.status(502).json({ error: "The Studio returned an empty result. Please try again." });
  }
  if (body.use_search === true) {
    return res.status(200).json({ output_text: outputText, sources: extractWebSources(responseParts) });
  }
  return res.status(200).json({ output_text: outputText });
}
