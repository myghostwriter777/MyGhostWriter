jest.mock("../lib/supabaseRest", () => ({ select: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn() }));

const { select, insert, remove } = require("../lib/supabaseRest");
const auth = require("../lib/connectorAuth");
const { validateServer, buildConnectorPayload, publicServer, MCP_CLIENT_BETA } = require("../lib/mcp/servers");

const adminRow = { email: "admin@example.com", role: "admin", all_features: true, plan: "free" };
const googleOk = () => Promise.resolve({ ok: true, json: async () => ({ email: "Admin@Example.com", email_verified: true, sub: "1" }) });

describe("connector token credentials", () => {
  afterEach(() => jest.clearAllMocks());

  test("a minted token is only ever stored as a hash", async () => {
    const { id, secret, token } = auth.mintToken();
    expect(token).toBe(`gwm_${id}_${secret}`);
    expect(auth.parseToken(token)).toEqual({ id, secret });
    expect(auth.secretMatches(secret, auth.sha256(secret))).toBe(true);
    expect(auth.secretMatches("wrong", auth.sha256(secret))).toBe(false);

    select.mockResolvedValue([]);
    insert.mockResolvedValue(null);
    await auth.createToken("admin@example.com", "Claude desktop");
    const stored = insert.mock.calls[0][1];
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(stored.id + "_");
  });

  test("malformed tokens are rejected before any database lookup", async () => {
    expect(auth.parseToken("gwm_short_abc")).toBeNull();
    expect(auth.parseToken("")).toBeNull();
    await expect(auth.authenticateConnectorToken("not-a-token")).rejects.toMatchObject({ statusCode: 401 });
    expect(select).not.toHaveBeenCalled();
  });

  test("a valid token resolves to its owner and re-checks admin access every call", async () => {
    const { id, secret, token } = auth.mintToken();
    select
      .mockResolvedValueOnce([{ id, email: "admin@example.com", token_hash: auth.sha256(secret), label: "Claude" }])
      .mockResolvedValueOnce([adminRow]);
    await expect(auth.authenticateConnectorToken(token)).resolves.toMatchObject({ email: "admin@example.com", tokenId: id });
    expect(select.mock.calls[1][0]).toBe("users");
  });

  test("a revoked admin flag locks the token out immediately", async () => {
    const { id, secret, token } = auth.mintToken();
    select
      .mockResolvedValueOnce([{ id, email: "user@example.com", token_hash: auth.sha256(secret) }])
      .mockResolvedValueOnce([{ email: "user@example.com", role: "user", all_features: false }]);
    await expect(auth.authenticateConnectorToken(token)).rejects.toMatchObject({ code: "CONNECTORS_NOT_ENABLED", statusCode: 403 });
  });

  test("a stolen database row cannot be replayed as a token", async () => {
    const { id, secret } = auth.mintToken();
    select.mockResolvedValue([{ id, email: "admin@example.com", token_hash: auth.sha256(secret) }]);
    await expect(auth.authenticateConnectorToken(`gwm_${id}_${"0".repeat(48)}`)).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  test("the token is read from the header first and a query parameter second", () => {
    expect(auth.tokenFromRequest({ headers: { authorization: "Bearer gwm_a_b" }, query: { token: "other" } })).toBe("gwm_a_b");
    expect(auth.tokenFromRequest({ headers: {}, query: { token: "gwm_q" } })).toBe("gwm_q");
    expect(auth.tokenFromRequest({ headers: {}, query: {} })).toBe("");
  });

  test("Google verification is what proves who is calling", async () => {
    await expect(auth.verifyGoogleAccessToken("", { fetchImpl: jest.fn() })).rejects.toMatchObject({ code: "GOOGLE_TOKEN_REQUIRED" });
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: false }));
    await expect(auth.verifyGoogleAccessToken("stale", { fetchImpl })).rejects.toMatchObject({ code: "GOOGLE_TOKEN_INVALID" });
    await expect(auth.verifyGoogleAccessToken("good", { fetchImpl: googleOk })).resolves.toMatchObject({ email: "admin@example.com" });
  });
});

describe("connected app validation", () => {
  test("accepts a public https MCP URL and a safe name", () => {
    expect(validateServer({ name: "notion", url: "https://mcp.notion.com/mcp", authToken: " abc " })).toEqual({
      name: "notion",
      url: "https://mcp.notion.com/mcp",
      authToken: "abc",
    });
  });

  test("rejects private, insecure and malformed targets", () => {
    expect(() => validateServer({ name: "x", url: "http://mcp.example.com" })).toThrow(/https/);
    expect(() => validateServer({ name: "x", url: "https://localhost:3000/mcp" })).toThrow(/private address/);
    expect(() => validateServer({ name: "x", url: "https://192.168.1.5/mcp" })).toThrow(/private address/);
    expect(() => validateServer({ name: "x", url: "https://169.254.169.254/latest" })).toThrow(/private address/);
    expect(() => validateServer({ name: "x", url: "not a url" })).toThrow(/full MCP server URL/);
    expect(() => validateServer({ name: "bad name!", url: "https://mcp.example.com" })).toThrow(/1 to 64 characters/);
  });

  test("the browser never sees a stored access token", () => {
    const view = publicServer({ id: "1", name: "notion", url: "https://mcp.notion.com/mcp", auth_token: "secret-value", enabled: true });
    expect(view).toEqual({ id: "1", name: "notion", url: "https://mcp.notion.com/mcp", enabled: true, hasToken: true, createdAt: null });
    expect(JSON.stringify(view)).not.toContain("secret-value");
  });

  test("the Claude payload always carries both halves the API requires", () => {
    const payload = buildConnectorPayload([
      { name: "notion", url: "https://mcp.notion.com/mcp", auth_token: "t1", enabled: true },
      { name: "off", url: "https://mcp.example.com/mcp", enabled: false },
      { name: "notion", url: "https://duplicate.example.com/mcp", enabled: true },
    ]);
    expect(payload.mcp_servers).toEqual([
      { type: "url", url: "https://mcp.notion.com/mcp", name: "notion", authorization_token: "t1" },
    ]);
    expect(payload.tools).toEqual([{ type: "mcp_toolset", mcp_server_name: "notion" }]);
    expect(payload.beta).toBe(MCP_CLIENT_BETA);
  });

  test("no enabled server means the Studio request is left untouched", () => {
    expect(buildConnectorPayload([])).toBeNull();
    expect(buildConnectorPayload([{ name: "off", url: "https://a.example.com", enabled: false }])).toBeNull();
    expect(buildConnectorPayload(null)).toBeNull();
  });
});
