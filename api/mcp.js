// /api/mcp — GhostwriterMe's Model Context Protocol server.
//
// Users add this URL as a connector in Claude, ChatGPT, Cursor or VS Code and
// their assistant can then call GhostwriterMe's writing tools and read the
// account's own saved work.
//
// Transport: Streamable HTTP, JSON responses only. The server is stateless, so
// it issues no Mcp-Session-Id and every POST is self-contained. A GET is
// answered with 405 because no server-initiated SSE stream is offered, which
// is the documented way to decline that half of the transport.
//
// Auth: a connector token minted in GhostwriterMe settings, sent as
// `Authorization: Bearer gwm_...`. Connector UIs that accept only a URL can
// instead put it in a `?token=` query parameter; that is less safe because
// URLs end up in logs, so the settings screen offers the header form first.

const { handleRpc, failure, ERROR, LATEST_PROTOCOL_VERSION, SERVER_NAME, SERVER_VERSION } = require("../lib/mcp/server");
const { authenticateConnectorToken, tokenFromRequest } = require("../lib/connectorAuth");

const config = { api: { bodyParser: { sizeLimit: "1mb" } }, maxDuration: 60 };

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, X-Connector-Token");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, MCP-Protocol-Version");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function unauthorized(res, message, code) {
  res.setHeader("WWW-Authenticate", 'Bearer realm="GhostwriterMe", error="invalid_token"');
  return res.status(401).json(failure(null, ERROR.INVALID_REQUEST, message, code ? { code } : undefined));
}

async function handler(req, res) {
  cors(res);
  res.setHeader("MCP-Protocol-Version", LATEST_PROTOCOL_VERSION);
  if (req.method === "OPTIONS") return res.status(200).end();

  // No server-initiated stream and no sessions to end.
  if (req.method === "GET" || req.method === "DELETE") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      error: "This MCP endpoint accepts POST requests only. Add the URL as a connector in your AI app rather than opening it in a browser.",
      server: { name: SERVER_NAME, version: SERVER_VERSION, protocolVersion: LATEST_PROTOCOL_VERSION },
    });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json(failure(null, ERROR.INVALID_REQUEST, "Method not allowed."));
  }

  let session;
  try {
    session = await authenticateConnectorToken(tokenFromRequest(req));
  } catch (error) {
    const status = Number(error?.statusCode || 401);
    if (status === 401) return unauthorized(res, error.message, error.code);
    return res.status(status).json(failure(null, ERROR.INVALID_REQUEST, error.message, error.code ? { code: error.code } : undefined));
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json(failure(null, ERROR.PARSE, "The request body is not valid JSON."));
    }
  }
  if (payload === undefined || payload === null) {
    return res.status(400).json(failure(null, ERROR.INVALID_REQUEST, "A JSON-RPC message is required."));
  }

  let response;
  try {
    response = await handleRpc(payload, session);
  } catch (error) {
    console.error("[mcp] dispatch failed", { message: String(error?.message || error).slice(0, 300) });
    return res.status(500).json(failure(null, ERROR.INTERNAL, "The MCP server failed to handle that request."));
  }

  // Every message was a notification: acknowledge with no body.
  if (response === null) return res.status(202).end();
  return res.status(200).json(response);
}

module.exports = handler;
module.exports.config = config;
