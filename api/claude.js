import { createGenerationDeadline, requestAnthropic } from "./_lib/generation";

export const config = {
  maxDuration: 120,
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

/**
 * /api/claude.js — proxy to the Anthropic Messages API.
 *
 * HARDENED: the previous version forwarded ANY request body verbatim, which
 * let anyone who found the endpoint run arbitrary models / huge requests on
 * our API key. Now only the request shapes our app actually sends are allowed:
 *  - model must be on the allowlist
 *  - max_tokens is capped
 *  - tools (if present) may only be Anthropic's server-side web_search tool
 *    (used by Story Guide to research recent books/movies past the model's
 *    training data)
 */

const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6", // current app model
  "claude-sonnet-4-5", // previous model, kept for one-flag rollback
]);
const MAX_TOKENS_CAP = 8192;
const MAX_MESSAGE_CHARS = 120000;
const WEB_SEARCH_TYPE = "web_search_20250305";

const sendError = (res, status, message) => res.status(status).json({ error: { type: "generation_error", message } });

export default async function handler(req, res) {
  // CORS — required for mobile browsers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed");
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return sendError(res, 503, "The AI service is not configured yet.");
  }

  // Parse body safely
  let body = req.body;
  if (!body) {
    return sendError(res, 400, "Request body is empty");
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return sendError(res, 400, "Could not parse request body as JSON");
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendError(res, 400, "Request body must be an object");
  }

  // ---- Request-shape validation (see header comment) ----
  if (!ALLOWED_MODELS.has(body.model)) {
    return sendError(res, 400, "Model not allowed");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 20) {
    return sendError(res, 400, "Provide between 1 and 20 messages");
  }
  let messageChars = 0;
  const validMessages = body.messages.every(message => {
    if (!message || !["user", "assistant"].includes(message.role)) return false;
    if (typeof message.content === "string") {
      messageChars += message.content.length;
      return Boolean(message.content.trim());
    }
    if (!Array.isArray(message.content) || !message.content.length) return false;
    return message.content.every(block => {
      if (block?.type === "text" && typeof block.text === "string") {
        messageChars += block.text.length;
        return Boolean(block.text.trim());
      }
      return block?.type === "image" && block.source?.type === "base64"
        && ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(block.source.media_type)
        && typeof block.source.data === "string" && block.source.data.length > 0
        && block.source.data.length <= 6 * 1024 * 1024;
    });
  });
  if (!validMessages || messageChars > MAX_MESSAGE_CHARS) {
    return sendError(res, 400, "The messages are missing, unsupported, or too long.");
  }
  if (body.system != null && (typeof body.system !== "string" || body.system.length > 20000)) {
    return sendError(res, 400, "The system instructions are too long or unsupported.");
  }
  // Cap rather than reject oversized max_tokens (edge case: a future frontend
  // bump shouldn't hard-fail; it just gets clamped).
  const maxTokens = Number.isFinite(body.max_tokens) && body.max_tokens >= 1 ? Math.floor(body.max_tokens) : 1500;
  const requestBody = {
    model: body.model,
    max_tokens: Math.min(maxTokens, MAX_TOKENS_CAP),
    messages: body.messages,
    ...(body.system ? { system: body.system } : {}),
  };
  // Only the web_search server tool may pass through.
  if (body.tools != null) {
    const onlyWebSearch =
      Array.isArray(body.tools) &&
      body.tools.length === 1 &&
      body.tools.every(
        (t) => t?.type === WEB_SEARCH_TYPE && t.name === "web_search"
      );
    if (!onlyWebSearch) {
      return sendError(res, 400, "Only the web_search tool is allowed");
    }
    const requestedUses = Number(body.tools[0].max_uses);
    requestBody.tools = [{ type: WEB_SEARCH_TYPE, name: "web_search", max_uses: Number.isFinite(requestedUses) ? Math.max(1, Math.min(3, Math.floor(requestedUses))) : 3 }];
  }

  // Call Anthropic
  const deadline = createGenerationDeadline(req, res, 110000);
  let response, data, responseParts;
  try {
    ({ response, data, responseParts } = await requestAnthropic(requestBody, apiKey, deadline.signal));
  } catch (e) {
    return sendError(res, deadline.signal.aborted ? 504 : 502, deadline.signal.aborted
      ? "The generation took too long. Try a shorter source or response."
      : "Could not reach the AI service. Please try again.");
  } finally {
    deadline.cleanup();
  }
  if (!data || typeof data !== "object") return sendError(res, 502, "The AI service returned an unreadable response. Please try again.");
  if (response.ok) {
    if (data.stop_reason === "pause_turn") return sendError(res, 502, "The research search could not finish. Try a more focused question.");
    if (data.stop_reason === "refusal") return sendError(res, 422, "The AI could not complete this request. Try rephrasing the instructions.");
    if (!Array.isArray(data.content) || !data.content.some(block => block?.type === "text" && typeof block.text === "string" && block.text.trim())) {
      return sendError(res, 502, "The AI returned an empty result. Please try again.");
    }
    // Story Guide expects one JSON answer. Search narration can contain braces
    // and cannot be prepended to that answer; keep only the final text block.
    // Retain the tool/source blocks separately for consumers that need them.
    if (requestBody.tools?.length) {
      const finalText = data.content.filter(block => block?.type === "text" && typeof block.text === "string").at(-1);
      const toolBlocks = responseParts.flatMap(part => Array.isArray(part.content) ? part.content.filter(block => block?.type !== "text") : []);
      data = { ...data, content: [...toolBlocks, finalText] };
    }
  }

  return res.status(response.status).json(data);
}
