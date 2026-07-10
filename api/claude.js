export const config = {
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

export default async function handler(req, res) {
  // CORS — required for mobile browsers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server config error: ANTHROPIC_API_KEY environment variable is not set on Vercel."
    });
  }

  // Parse body safely
  let body = req.body;
  if (!body) {
    return res.status(400).json({ error: "Request body is empty" });
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Could not parse request body as JSON" });
    }
  }

  // ---- Request-shape validation (see header comment) ----
  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: "Model not allowed" });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }
  // Cap rather than reject oversized max_tokens (edge case: a future frontend
  // bump shouldn't hard-fail; it just gets clamped).
  if (typeof body.max_tokens !== "number" || body.max_tokens < 1) {
    body.max_tokens = 1500;
  }
  body.max_tokens = Math.min(body.max_tokens, MAX_TOKENS_CAP);
  // Only the web_search server tool may pass through.
  if (body.tools) {
    const onlyWebSearch =
      Array.isArray(body.tools) &&
      body.tools.length > 0 &&
      body.tools.every(
        (t) => typeof t?.type === "string" && t.type.startsWith("web_search")
      );
    if (!onlyWebSearch) {
      return res.status(400).json({ error: "Only the web_search tool is allowed" });
    }
  }

  // Call Anthropic
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to reach Anthropic: " + e.message });
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    return res.status(500).json({ error: "Bad response from Anthropic" });
  }

  return res.status(response.status).json(data);
}
