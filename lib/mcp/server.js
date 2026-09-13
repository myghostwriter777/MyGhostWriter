// JSON-RPC 2.0 dispatch for the GhostwriterMe MCP server.
//
// Kept free of HTTP so it can be unit-tested directly: api/mcp.js owns the
// transport (auth, headers, status codes) and hands parsed messages here.
//
// The server is stateless. Streamable HTTP allows a server to omit session
// ids, which suits serverless functions where no two requests share a
// process, so no Mcp-Session-Id is issued and none is required back.

const { toolDefinitions, runTool } = require("./tools");

const SERVER_NAME = "ghostwriterme";
const SERVER_TITLE = "GhostwriterMe";
const SERVER_VERSION = "1.0.0";

// Newest first. The spec says to echo the client's version when supported and
// otherwise answer with one of ours.
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

const INSTRUCTIONS =
  "GhostwriterMe writing tools for the signed-in account. search_history and get_history_item read the user's own saved work — check there before writing something new. " +
  "write_essay, humanize_writing and outline_slide_deck generate new material and cost the account an AI request each. Nothing here writes to the user's History; " +
  "results are returned to you only. check_ai_content returns a style estimate, never proof of authorship.";

const ERROR = { PARSE: -32700, INVALID_REQUEST: -32600, METHOD_NOT_FOUND: -32601, INVALID_PARAMS: -32602, INTERNAL: -32603 };

const result = (id, value) => ({ jsonrpc: "2.0", id, result: value });
const failure = (id, code, message, data) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message, ...(data === undefined ? {} : { data }) },
});

const textResult = (text, isError = false) => ({
  content: [{ type: "text", text: String(text) }],
  ...(isError ? { isError: true } : {}),
});

function negotiateProtocol(requested) {
  const asked = String(requested || "").trim();
  return SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : LATEST_PROTOCOL_VERSION;
}

function isNotification(message) {
  return message?.id === undefined || message?.id === null;
}

// Handles one JSON-RPC message. Returns null for notifications, which get no
// response by definition.
async function handleMessage(message, session = {}) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return failure(null, ERROR.INVALID_REQUEST, "Invalid JSON-RPC message.");
  }
  const { id = null, method } = message;
  const notification = isNotification(message);

  if (typeof method !== "string" || !method) {
    return notification ? null : failure(id, ERROR.INVALID_REQUEST, "A JSON-RPC method is required.");
  }
  // Client-to-server notifications are acknowledged by silence.
  if (method.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: negotiateProtocol(message.params?.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, title: SERVER_TITLE, version: SERVER_VERSION },
        instructions: INSTRUCTIONS,
      });

    case "ping":
      return notification ? null : result(id, {});

    case "tools/list":
      return result(id, { tools: toolDefinitions() });

    case "tools/call": {
      const name = message.params?.name;
      if (typeof name !== "string" || !name) {
        return failure(id, ERROR.INVALID_PARAMS, "tools/call requires a tool name.");
      }
      try {
        const text = await runTool(name, message.params?.arguments, session);
        return result(id, textResult(text));
      } catch (error) {
        // Tool failures come back as a result with isError so the calling
        // model can read the reason and adjust, per the MCP tool spec.
        // Protocol-level errors are reserved for malformed requests.
        return result(id, textResult(String(error?.message || "The tool failed."), true));
      }
    }

    // Not advertised in capabilities, but some clients probe anyway; an empty
    // list is friendlier than a method-not-found error in their logs.
    case "prompts/list":
      return result(id, { prompts: [] });
    case "resources/list":
      return result(id, { resources: [] });
    case "resources/templates/list":
      return result(id, { resourceTemplates: [] });
    case "logging/setLevel":
      return result(id, {});

    default:
      return notification ? null : failure(id, ERROR.METHOD_NOT_FOUND, `Unknown method "${method.slice(0, 60)}".`);
  }
}

// Accepts a single message or a batch. Returns null when every message was a
// notification, which the transport answers with 202 Accepted and no body.
async function handleRpc(payload, session = {}) {
  if (Array.isArray(payload)) {
    if (!payload.length) return failure(null, ERROR.INVALID_REQUEST, "An empty JSON-RPC batch is not valid.");
    const responses = [];
    for (const message of payload) {
      const response = await handleMessage(message, session);
      if (response) responses.push(response);
    }
    return responses.length ? responses : null;
  }
  return handleMessage(payload, session);
}

module.exports = {
  SERVER_NAME,
  SERVER_TITLE,
  SERVER_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  LATEST_PROTOCOL_VERSION,
  INSTRUCTIONS,
  ERROR,
  negotiateProtocol,
  handleMessage,
  handleRpc,
  failure,
  textResult,
};
