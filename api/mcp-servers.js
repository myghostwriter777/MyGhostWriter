// /api/mcp-servers — the apps a user connects into GhostwriterMe.
//
// Registers remote MCP servers (Notion, Drive, GitHub, an internal tool) that
// Studio requests can consult while writing. Same authentication rule as
// /api/connector-tokens: a verified Google access token, never a bare email,
// because these rows can carry the user's access tokens for other services.

const { verifyGoogleAccessToken, requireConnectorAccess } = require("../lib/connectorAuth");
const { select, insert, remove, update } = require("../lib/supabaseRest");
const { SERVER_TABLE, MAX_SERVERS_PER_USER, validateServer, publicServer, newServerRow } = require("../lib/mcp/servers");

const config = { api: { bodyParser: { sizeLimit: "16kb" } }, maxDuration: 15 };

const ACTIONS = new Set(["list", "add", "remove", "toggle"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listServers(email) {
  const rows = await select(
    SERVER_TABLE,
    `?email=eq.${encodeURIComponent(email)}&select=id,name,url,enabled,auth_token,created_at&order=created_at.asc`
  );
  return (Array.isArray(rows) ? rows : []).map(publicServer);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

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
  if (!ACTIONS.has(action)) return res.status(400).json({ error: "Unknown connected-app action." });

  try {
    const { email } = await verifyGoogleAccessToken(body.googleAccessToken);
    await requireConnectorAccess(email);

    if (action === "list") return res.status(200).json({ servers: await listServers(email) });

    if (action === "add") {
      const existing = await listServers(email);
      if (existing.length >= MAX_SERVERS_PER_USER) {
        throw badRequest(`You can connect up to ${MAX_SERVERS_PER_USER} apps. Remove one before adding another.`);
      }
      const server = validateServer({ name: body.name, url: body.url, authToken: body.authToken });
      if (existing.some(item => item.name === server.name)) {
        throw badRequest(`You already have a connected app named "${server.name}".`);
      }
      await insert(SERVER_TABLE, newServerRow(email, server));
      return res.status(201).json({ servers: await listServers(email) });
    }

    const id = String(body.id || "");
    if (!UUID.test(id)) throw badRequest("That connected-app id is not valid.");
    const scope = `?email=eq.${encodeURIComponent(email)}&id=eq.${encodeURIComponent(id)}`;

    if (action === "remove") {
      await remove(SERVER_TABLE, scope);
    } else {
      await update(SERVER_TABLE, scope, { enabled: body.enabled !== false });
    }
    return res.status(200).json({ servers: await listServers(email) });
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    if (status >= 500) console.error("[mcp-servers] failed", { action, message: String(error?.message || error).slice(0, 300) });
    return res.status(status).json({
      error: status >= 500 ? "The connected-apps service is unavailable right now." : error.message,
      ...(error?.code ? { code: error.code } : {}),
    });
  }
}

module.exports = handler;
module.exports.config = config;
module.exports.listServers = listServers;
