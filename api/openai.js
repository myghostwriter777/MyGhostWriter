import { createHash } from "crypto";
import mammoth from "mammoth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 8192;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SYSTEM_CHARS = 12000;
const MAX_USER_CHARS = 30000;
const MAX_EXTRACTED_FILE_CHARS = 120000;

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

function extractOutputText(data) {
  return (data?.content || [])
    .filter((item) => item?.type === "text" && typeof item?.text === "string")
    .map((item) => item.text)
    .join("");
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
  if (!body || typeof body !== "object") {
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

  const requestedTokens = Number(body.max_output_tokens);
  const maxOutputTokens = Number.isFinite(requestedTokens)
    ? Math.max(500, Math.min(Math.floor(requestedTokens), MAX_OUTPUT_TOKENS))
    : 5000;

  const requestBody = {
    model: MODEL,
    system,
    messages: [{ role: "user", content }],
    max_tokens: maxOutputTokens,
  };

  // Study Mode may include a public website URL. Anthropic's server-side
  // search tool lets the model ground that source without our server scraping
  // arbitrary URLs. Other Studio requests keep the existing no-tool behavior.
  if (body.use_search === true) {
    requestBody.tools = [
      { type: "web_search_20250305", name: "web_search", max_uses: 3 },
    ];
  }

  if (typeof body.user_id === "string" && body.user_id.trim()) {
    requestBody.metadata = {
      user_id: createHash("sha256")
        .update(body.user_id.trim().toLowerCase())
        .digest("hex"),
    };
  }

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach the Studio AI service." });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 400;
    const message = response.status === 429
      ? "The Studio is busy right now. Please wait a moment and try again."
      : "The Studio could not generate this result. Please check the files and try again.";
    return res.status(status).json({ error: message });
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    return res.status(502).json({ error: "The Studio returned an empty result. Please try again." });
  }
  return res.status(200).json({ output_text: outputText });
}
