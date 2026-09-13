// The route destructures its auth helpers at import time, so the module has to
// be mocked rather than spied on. tokenFromRequest keeps its real behaviour
// because the header-versus-query precedence is part of what is being tested.
jest.mock("../lib/connectorAuth", () => {
  const actual = jest.requireActual("../lib/connectorAuth");
  return { ...actual, authenticateConnectorToken: jest.fn() };
});

const { authenticateConnectorToken } = require("../lib/connectorAuth");
const handler = require("../api/mcp");

function mockResponse() {
  const res = { statusCode: 200, body: null, headers: {}, ended: false };
  res.setHeader = jest.fn((key, value) => { res.headers[String(key).toLowerCase()] = value; });
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => { res.body = body; return res; });
  res.end = jest.fn(() => { res.ended = true; return res; });
  return res;
}

const post = (body, { headers = {}, query = {} } = {}) => ({ method: "POST", headers, query, body });
const signedIn = { email: "admin@example.com", tokenId: "abcd1234abcd1234", label: "Claude" };

describe("/api/mcp transport", () => {
  test("an unauthenticated call is refused before any tool runs", async () => {
    authenticateConnectorToken.mockRejectedValue(
      Object.assign(new Error("Missing or malformed connector token."), { statusCode: 401, code: "TOKEN_INVALID" })
    );
    const res = mockResponse();
    await handler(post({ jsonrpc: "2.0", id: 1, method: "tools/list" }), res);
    expect(res.statusCode).toBe(401);
    expect(res.headers["www-authenticate"]).toContain("Bearer");
    expect(res.body.error.message).toContain("connector token");
    expect(res.body.error.data).toEqual({ code: "TOKEN_INVALID" });
  });

  test("an account without connector access gets its own status, not a 401", async () => {
    authenticateConnectorToken.mockRejectedValue(
      Object.assign(new Error("Connectors are still in admin testing."), { statusCode: 403, code: "CONNECTORS_NOT_ENABLED" })
    );
    const res = mockResponse();
    await handler(post({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { headers: { authorization: "Bearer gwm_x_y" } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.data.code).toBe("CONNECTORS_NOT_ENABLED");
  });

  test("an authenticated tools/list returns the catalogue and the protocol header", async () => {
    authenticateConnectorToken.mockResolvedValue(signedIn);
    const res = mockResponse();
    await handler(post({ jsonrpc: "2.0", id: 2, method: "tools/list" }, { headers: { authorization: "Bearer gwm_x_y" } }), res);
    expect(authenticateConnectorToken).toHaveBeenCalledWith("gwm_x_y");
    expect(res.statusCode).toBe(200);
    expect(res.body.result.tools).toHaveLength(6);
    expect(res.headers["mcp-protocol-version"]).toBeTruthy();
  });

  test("a token in the query string still works for connector UIs that only take a URL", async () => {
    authenticateConnectorToken.mockResolvedValue(signedIn);
    const res = mockResponse();
    await handler(post({ jsonrpc: "2.0", id: 3, method: "ping" }, { query: { token: "gwm_from_url" } }), res);
    expect(authenticateConnectorToken).toHaveBeenCalledWith("gwm_from_url");
    expect(res.body.result).toEqual({});
  });

  test("a notification-only post is acknowledged with 202 and no body", async () => {
    authenticateConnectorToken.mockResolvedValue(signedIn);
    const res = mockResponse();
    await handler(post({ jsonrpc: "2.0", method: "notifications/initialized" }, { query: { token: "t" } }), res);
    expect(res.statusCode).toBe(202);
    expect(res.ended).toBe(true);
    expect(res.json).not.toHaveBeenCalled();
  });

  test("a raw string body is parsed and broken JSON is reported as a parse error", async () => {
    authenticateConnectorToken.mockResolvedValue(signedIn);
    const ok = mockResponse();
    await handler(post('{"jsonrpc":"2.0","id":4,"method":"ping"}', { query: { token: "t" } }), ok);
    expect(ok.body.result).toEqual({});
    const bad = mockResponse();
    await handler(post("{oops", { query: { token: "t" } }), bad);
    expect(bad.statusCode).toBe(400);
    expect(bad.body.error.code).toBe(-32700);
  });

  test("initialize succeeds over the wire", async () => {
    authenticateConnectorToken.mockResolvedValue(signedIn);
    const res = mockResponse();
    await handler(post({ jsonrpc: "2.0", id: 5, method: "initialize", params: { protocolVersion: "2025-06-18" } }, { query: { token: "t" } }), res);
    expect(res.body.result.protocolVersion).toBe("2025-06-18");
    expect(res.body.result.serverInfo.name).toBe("ghostwriterme");
  });

  test("GET explains itself instead of pretending to be a stream", async () => {
    const res = mockResponse();
    await handler({ method: "GET", headers: {}, query: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("POST, OPTIONS");
    expect(res.body.error).toContain("POST requests only");
    expect(authenticateConnectorToken).not.toHaveBeenCalled();
  });

  test("preflight is answered without authentication", async () => {
    const res = mockResponse();
    await handler({ method: "OPTIONS", headers: {}, query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(authenticateConnectorToken).not.toHaveBeenCalled();
  });
});
