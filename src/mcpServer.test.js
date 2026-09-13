const {
  handleRpc,
  handleMessage,
  negotiateProtocol,
  LATEST_PROTOCOL_VERSION,
  ERROR,
} = require("../lib/mcp/server");
const { toolDefinitions } = require("../lib/mcp/tools");

jest.mock("../lib/mcp/tools", () => {
  const actual = jest.requireActual("../lib/mcp/tools");
  return { ...actual, runTool: jest.fn() };
});
const { runTool } = require("../lib/mcp/tools");

const session = { email: "writer@example.com" };
const call = (message, ctx = session) => handleRpc(message, ctx);

describe("MCP JSON-RPC server", () => {
  afterEach(() => jest.clearAllMocks());

  test("initialize echoes a supported protocol version and advertises tools", async () => {
    const response = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } });
    expect(response.result.protocolVersion).toBe("2024-11-05");
    expect(response.result.capabilities).toEqual({ tools: { listChanged: false } });
    expect(response.result.serverInfo.name).toBe("ghostwriterme");
    expect(response.result.instructions).toContain("search_history");
  });

  test("an unknown protocol version falls back to the newest one the server speaks", async () => {
    expect(negotiateProtocol("1999-01-01")).toBe(LATEST_PROTOCOL_VERSION);
    const response = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(response.result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
  });

  test("notifications get no response at all", async () => {
    expect(await call({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    expect(await call({ jsonrpc: "2.0", id: 2, method: "notifications/cancelled" })).toBeNull();
  });

  test("tools/list returns valid MCP tool definitions", async () => {
    const response = await call({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    const tools = response.result.tools;
    expect(tools.map(tool => tool.name).sort()).toEqual([
      "check_ai_content",
      "get_history_item",
      "humanize_writing",
      "outline_slide_deck",
      "search_history",
      "write_essay",
    ]);
    for (const tool of tools) {
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
    // Reading saved work is safe; generating is not, so clients can tell them apart.
    expect(tools.find(tool => tool.name === "search_history").annotations.readOnlyHint).toBe(true);
    expect(tools.find(tool => tool.name === "write_essay").annotations.readOnlyHint).toBe(false);
    expect(toolDefinitions()).toHaveLength(6);
  });

  test("tools/call passes the authenticated session through and wraps the text", async () => {
    runTool.mockResolvedValue("An essay about bees.");
    const response = await call({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "write_essay", arguments: { topic: "bees" } },
    });
    expect(runTool).toHaveBeenCalledWith("write_essay", { topic: "bees" }, session);
    expect(response.result).toEqual({ content: [{ type: "text", text: "An essay about bees." }] });
  });

  test("a failing tool returns isError rather than a protocol error", async () => {
    runTool.mockRejectedValue(new Error("An essay topic is required."));
    const response = await call({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "write_essay" } });
    expect(response.error).toBeUndefined();
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toBe("An essay topic is required.");
  });

  test("malformed requests get JSON-RPC errors", async () => {
    expect((await call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: {} })).error.code).toBe(ERROR.INVALID_PARAMS);
    expect((await call({ jsonrpc: "2.0", id: 7, method: "does/not/exist" })).error.code).toBe(ERROR.METHOD_NOT_FOUND);
    expect((await call("nonsense")).error.code).toBe(ERROR.INVALID_REQUEST);
    expect((await call([])).error.code).toBe(ERROR.INVALID_REQUEST);
  });

  test("probes for capabilities the server does not advertise answer empty", async () => {
    expect((await call({ jsonrpc: "2.0", id: 8, method: "prompts/list" })).result).toEqual({ prompts: [] });
    expect((await call({ jsonrpc: "2.0", id: 9, method: "resources/list" })).result).toEqual({ resources: [] });
    expect((await call({ jsonrpc: "2.0", id: 10, method: "ping" })).result).toEqual({});
  });

  test("a batch answers only the requests, and a notification-only batch answers nothing", async () => {
    runTool.mockResolvedValue("ok");
    const responses = await call([
      { jsonrpc: "2.0", id: 11, method: "tools/list" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 12, method: "ping" },
    ]);
    expect(responses.map(item => item.id)).toEqual([11, 12]);
    expect(await call([{ jsonrpc: "2.0", method: "notifications/initialized" }])).toBeNull();
    expect(await handleMessage({ jsonrpc: "2.0", method: "notifications/progress" })).toBeNull();
  });
});
