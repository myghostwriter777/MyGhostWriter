// The Studio route attaches a user's connected MCP servers to the Claude call.
// supabaseRest is mocked so no database is needed; the route and tests load
// the same CommonJS module.
jest.mock("../lib/supabaseRest", () => ({ select: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn() }));

import handler from "../api/openai";
const supabaseRest = require("../lib/supabaseRest");

function mockResponse() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.setHeader = jest.fn((name, value) => { res.headers[name] = value; });
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => { res.body = body; return res; });
  res.end = jest.fn(() => res);
  return res;
}

const okReply = () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "done" }] }) });
const request = extra => ({
  method: "POST",
  body: { system: "You are a writer.", user: "Write about bees.", user_id: "Admin@Example.com", ...extra },
});

const connectedRow = { id: "1", name: "notion", url: "https://mcp.notion.com/mcp", auth_token: "secret", enabled: true };

describe("Studio route connected apps", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue(okReply());
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    jest.clearAllMocks();
  });

  const sentRequest = () => {
    const [, init] = global.fetch.mock.calls[0];
    return { body: JSON.parse(init.body), headers: init.headers };
  };

  test("sends both halves of the connector payload and the beta flag", async () => {
    supabaseRest.select.mockResolvedValue([connectedRow]);
    const res = mockResponse();
    await handler(request({ use_connectors: true }), res);
    expect(res.statusCode).toBe(200);

    const query = supabaseRest.select.mock.calls[0][1];
    expect(supabaseRest.select.mock.calls[0][0]).toBe("user_mcp_servers");
    expect(query).toContain(`email=eq.${encodeURIComponent("admin@example.com")}`);
    expect(query).toContain("enabled=is.true");

    const { body, headers } = sentRequest();
    expect(body.mcp_servers).toEqual([
      { type: "url", url: "https://mcp.notion.com/mcp", name: "notion", authorization_token: "secret" },
    ]);
    expect(body.tools).toEqual([{ type: "mcp_toolset", mcp_server_name: "notion" }]);
    expect(headers["anthropic-beta"]).toBe("mcp-client-2025-11-20");
  });

  test("connector tools are added alongside web search rather than replacing it", async () => {
    supabaseRest.select.mockResolvedValue([connectedRow]);
    await handler(request({ use_connectors: true, use_search: true }), mockResponse());
    const { body } = sentRequest();
    expect(body.tools.map(tool => tool.type)).toEqual(["web_search_20250305", "mcp_toolset"]);
  });

  test("no opt-in means no database read and an unchanged request", async () => {
    await handler(request({}), mockResponse());
    expect(supabaseRest.select).not.toHaveBeenCalled();
    const { body, headers } = sentRequest();
    expect(body.mcp_servers).toBeUndefined();
    expect(headers["anthropic-beta"]).toBeUndefined();
  });

  test("a user with nothing connected sends no mcp_servers key at all", async () => {
    supabaseRest.select.mockResolvedValue([]);
    await handler(request({ use_connectors: true }), mockResponse());
    const { body, headers } = sentRequest();
    expect(body.mcp_servers).toBeUndefined();
    expect(body.tools).toBeUndefined();
    expect(headers["anthropic-beta"]).toBeUndefined();
  });

  test("a database failure degrades to a normal generation instead of an error", async () => {
    supabaseRest.select.mockRejectedValue(new Error("connectors table missing"));
    const res = mockResponse();
    await handler(request({ use_connectors: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.output_text).toBe("done");
    expect(sentRequest().body.mcp_servers).toBeUndefined();
  });
});
