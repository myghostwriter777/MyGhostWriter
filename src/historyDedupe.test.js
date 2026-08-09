import { dedupeHistoryItems, historyItemsMatch } from "./historyDedupe";

describe("history content deduplication", () => {
  const base = {
    mode: "humanize",
    title: "Humanized: Example",
    input: "Original text",
    output: "Clearer final text",
    ts: "2026-08-09T12:34:00.000Z",
  };

  test("collapses identical generations saved under different IDs", () => {
    const items = [
      { ...base, id: "device-a" },
      { ...base, id: "device-b", ts: "2026-08-09T12:34:18.000Z" },
    ];
    expect(dedupeHistoryItems(items)).toHaveLength(1);
  });

  test("keeps an intentional repeat generated much later", () => {
    const later = { ...base, id: "later", ts: "2026-08-09T13:34:00.000Z" };
    expect(historyItemsMatch(base, later)).toBe(false);
    expect(dedupeHistoryItems([base, later])).toHaveLength(2);
  });
});
