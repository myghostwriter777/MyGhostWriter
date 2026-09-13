// Stage 2: the apps a user connects INTO GhostwriterMe.
//
// A user registers a remote MCP server (Notion, Drive, GitHub, an internal
// tool) in settings. When a Studio request opts in, those servers are attached
// to the Claude call through Anthropic's MCP connector, so the model can read
// the user's own sources while it writes.
//
// GhostwriterMe never connects to these servers itself — Anthropic's API does
// the calling. That keeps arbitrary user-supplied URLs out of our serverless
// functions, but it also means a bad URL is a data-exfiltration risk for the
// user's prompt, so the checks below are deliberately strict.

const { randomUUID } = require("crypto");

const SERVER_TABLE = "user_mcp_servers";
const MCP_CLIENT_BETA = "mcp-client-2025-11-20";
const MAX_SERVERS_PER_USER = 5;
const NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

// Hosts that would point the connector back at private infrastructure. The
// call is made by Anthropic, not by us, but a user pasting one of these has
// misconfigured something and deserves an error rather than a silent failure.
const BLOCKED_HOSTS = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  if (!NAME_PATTERN.test(name)) {
    throw validationError("The connector name must be 1 to 64 characters using letters, numbers, hyphens or underscores.");
  }
  return name;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw validationError("Enter the full MCP server URL, starting with https://");
  }
  if (url.protocol !== "https:") throw validationError("An MCP server URL must use https.");
  if (BLOCKED_HOSTS.test(url.hostname)) throw validationError("That URL points at a private address, which a remote connector cannot reach.");
  if (!url.hostname.includes(".")) throw validationError("That URL has no public hostname.");
  return url.toString();
}

function validateServer({ name, url, authToken } = {}) {
  const token = String(authToken || "").trim();
  if (token.length > 4000) throw validationError("That access token is too long.");
  return {
    name: normalizeName(name),
    url: normalizeUrl(url),
    authToken: token,
  };
}

// What the browser is allowed to see: never the stored access token.
function publicServer(row) {
  return {
    id: String(row?.id || ""),
    name: String(row?.name || ""),
    url: String(row?.url || ""),
    enabled: row?.enabled !== false,
    hasToken: Boolean(row?.auth_token),
    createdAt: row?.created_at || null,
  };
}

function newServerRow(email, { name, url, authToken }) {
  return {
    id: randomUUID(),
    email,
    name,
    url,
    auth_token: authToken || null,
    enabled: true,
    created_at: new Date().toISOString(),
  };
}

// Anthropic rejects `mcp_servers` unless a matching `mcp_toolset` tool is also
// present, so both halves are always built together. Returns null when the
// user has nothing connected, which keeps the caller's request untouched.
function buildConnectorPayload(rows) {
  const enabled = (Array.isArray(rows) ? rows : []).filter(row => row?.enabled !== false && row?.url && row?.name);
  if (!enabled.length) return null;
  const seen = new Set();
  const servers = [];
  for (const row of enabled) {
    const name = String(row.name);
    if (seen.has(name)) continue;
    seen.add(name);
    servers.push({
      type: "url",
      url: String(row.url),
      name,
      ...(row.auth_token ? { authorization_token: String(row.auth_token) } : {}),
    });
    if (servers.length >= MAX_SERVERS_PER_USER) break;
  }
  return {
    mcp_servers: servers,
    tools: servers.map(server => ({ type: "mcp_toolset", mcp_server_name: server.name })),
    beta: MCP_CLIENT_BETA,
  };
}

module.exports = {
  SERVER_TABLE,
  MCP_CLIENT_BETA,
  MAX_SERVERS_PER_USER,
  NAME_PATTERN,
  validationError,
  normalizeName,
  normalizeUrl,
  validateServer,
  publicServer,
  newServerRow,
  buildConnectorPayload,
};
