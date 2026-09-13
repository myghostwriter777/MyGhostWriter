// /api/connector-tokens — mint, list and revoke the tokens a user pastes into
// Claude, ChatGPT or Cursor to reach /api/mcp.
//
// Every action is authenticated with a fresh Google access token from the
// browser, not with an email address. A connector token grants read access to
// the account's whole History, so "knows the email" is nowhere near enough.
// Everything is POSTed so the access token never lands in a URL or a log.

const {
  verifyGoogleAccessToken,
  requireConnectorAccess,
  listTokens,
  createToken,
  revokeToken,
} = require("../lib/connectorAuth");

const config = { api: { bodyParser: { sizeLimit: "16kb" } }, maxDuration: 15 };

const ACTIONS = new Set(["list", "create", "revoke"]);

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Could not parse the request." });
    }
  }
  body = body || {};

  const action = String(body.action || "list");
  if (!ACTIONS.has(action)) return res.status(400).json({ error: "Unknown connector action." });

  try {
    const { email } = await verifyGoogleAccessToken(body.googleAccessToken);
    await requireConnectorAccess(email);

    if (action === "list") {
      return res.status(200).json({ tokens: await listTokens(email) });
    }
    if (action === "create") {
      const created = await createToken(email, body.label);
      // `token` is the only time the plaintext exists outside the client.
      return res.status(201).json({ ...created, tokens: await listTokens(email) });
    }
    await revokeToken(email, body.id);
    return res.status(200).json({ ok: true, tokens: await listTokens(email) });
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    if (status >= 500) console.error("[connector-tokens] failed", { action, message: String(error?.message || error).slice(0, 300) });
    return res.status(status).json({
      error: status >= 500 ? "The connector service is unavailable right now." : error.message,
      ...(error?.code ? { code: error.code } : {}),
    });
  }
}

module.exports = handler;
module.exports.config = config;
