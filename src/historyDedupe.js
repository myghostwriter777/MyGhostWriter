const normalizeHistoryText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const historyContentKey = (item = {}) =>
  [item.mode, item.title, item.input, item.output]
    .map(normalizeHistoryText)
    .join("\u241f");

export const historyItemsMatch = (a, b, withinMs = 120000) => {
  if (!a || !b || historyContentKey(a) !== historyContentKey(b)) return false;
  const aTime = new Date(a.ts || 0).getTime();
  const bTime = new Date(b.ts || 0).getTime();
  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return true;
  return Math.abs(aTime - bTime) <= withinMs;
};

export const dedupeHistoryItems = (items = [], withinMs = 120000) => {
  const sorted = [...items].filter(Boolean).sort((a, b) =>
    new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime()
  );
  const kept = [];
  for (const item of sorted) {
    if (!kept.some((existing) => historyItemsMatch(existing, item, withinMs))) {
      kept.push(item);
    }
  }
  return kept;
};
