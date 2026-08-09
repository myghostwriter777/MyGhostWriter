import { createHash } from "crypto";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 12000;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SYSTEM_CHARS = 12000;
const MAX_USER_CHARS = 30000;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
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
      dataUrl: `data:${mime};base64,${base64}`,
    };
  });

  if (totalBytes > MAX_TOTAL_FILE_BYTES) {
    throw new Error("The combined attachments are too large.");
  }
  return { files: validated, totalBytes };
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  return (data?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text" && typeof item?.text === "string")
    .map((item) => item.text)
    .join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
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

  const content = validated.files.map((file) =>
    file.mime.startsWith("image/")
      ? { type: "input_image", image_url: file.dataUrl, detail: "auto" }
      : { type: "input_file", filename: file.filename, file_data: file.dataUrl }
  );
  content.push({ type: "input_text", text: user });

  const requestedTokens = Number(body.max_output_tokens);
  const maxOutputTokens = Number.isFinite(requestedTokens)
    ? Math.max(500, Math.min(Math.floor(requestedTokens), MAX_OUTPUT_TOKENS))
    : 5000;

  const requestBody = {
    model: MODEL,
    instructions: system,
    input: [{ role: "user", content }],
    reasoning: { effort: "low" },
    text: { verbosity: "medium" },
    max_output_tokens: maxOutputTokens,
    store: false,
  };

  if (typeof body.user_id === "string" && body.user_id.trim()) {
    requestBody.safety_identifier = createHash("sha256")
      .update(body.user_id.trim().toLowerCase())
      .digest("hex");
  }

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
