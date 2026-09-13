// Server-side Claude calls for the MCP tools.
//
// api/openai.js owns the Studio request path (file attachments, structured
// schemas, search continuation). The MCP tools need a much smaller surface, so
// this module talks to the Messages API directly with the same model and the
// same output ceiling. STUDIO_MODEL is asserted against api/openai.js by
// src/mcpTools.test.js, so the two cannot drift apart unnoticed.

const STUDIO_MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 16000;
const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TIMEOUT_MS = 50000;

function apiError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function extractText(payload) {
  return (payload?.content || [])
    .filter(block => block?.type === "text")
    .map(block => String(block.text || ""))
    .join("")
    .trim();
}

async function callClaude({
  system,
  user,
  maxOutputTokens = 4000,
  schema = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
  apiKey = process.env.ANTHROPIC_API_KEY,
} = {}) {
  if (!apiKey) throw apiError("The Claude API key is not configured on this deployment.", 503);
  const body = {
    model: STUDIO_MODEL,
    system: String(system || "").slice(0, 12000),
    messages: [{ role: "user", content: String(user || "").slice(0, 30000) }],
    max_tokens: Math.max(500, Math.min(Math.floor(maxOutputTokens) || 4000, MAX_OUTPUT_TOKENS)),
  };
  if (schema) body.output_config = { format: { type: "json_schema", schema } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw apiError("Claude took too long to answer. Try a shorter request.", 504);
    throw apiError("Could not reach Claude.", 502);
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 429) throw apiError("Claude is busy right now. Wait a moment and try again.", 429);
    throw apiError("Claude could not complete this request.", response.status >= 500 ? 502 : 400);
  }
  if (payload?.stop_reason === "max_tokens") {
    throw apiError("The result was too long to finish. Ask for a shorter piece.", 502);
  }
  const text = extractText(payload);
  if (!text) throw apiError("Claude returned an empty result.", 502);
  return text;
}

// The tools that ask for JSON get a schema, but a model can still wrap it in
// prose or a fence, so parse defensively rather than trusting the shape.
function parseJson(raw) {
  const cleaned = String(raw || "").replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw apiError("The result could not be read. Try again.", 502);
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw apiError("The result could not be read. Try again.", 502);
  }
}

module.exports = { STUDIO_MODEL, MAX_OUTPUT_TOKENS, callClaude, parseJson, extractText };
