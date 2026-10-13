import { CEFR_DESCRIPTIONS, CEFR_LEVELS, buildCefrWritingRules, normalizeCefrLevel, writingOutputTokenBudget } from "./cefrWriting";

describe("shared CEFR writing guidance", () => {
  test("exposes all six levels in order with distinct concise reader descriptions", () => {
    expect(CEFR_LEVELS).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    expect(new Set(CEFR_LEVELS.map(level => CEFR_DESCRIPTIONS[level])).size).toBe(6);
    CEFR_LEVELS.forEach(level => expect(CEFR_DESCRIPTIONS[level].length).toBeLessThan(100));
  });

  test.each(CEFR_LEVELS)("normalizes saved or user-selected %s levels", level => {
    expect(normalizeCefrLevel(` ${level.toLowerCase()} `)).toBe(level);
    expect(buildCefrWritingRules(` ${level.toLowerCase()} `)).toBe(buildCefrWritingRules(level));
  });

  test.each([undefined, null, "", "B3", "C1/C2", "Beginner", "__proto__", 2, {}, []])("uses a valid fallback for unsupported level %p", value => {
    expect(normalizeCefrLevel(value)).toBe("B2");
    expect(normalizeCefrLevel(value, " c1 ")).toBe("C1");
    expect(normalizeCefrLevel(value, "unknown")).toBe("B2");
    expect(buildCefrWritingRules(value)).toBe(buildCefrWritingRules("B2"));
  });

  test("makes adjacent levels structurally different, rather than changing only a label", () => {
    const sections = CEFR_LEVELS.map(level => buildCefrWritingRules(level).split("\n").slice(1, 5));
    [0, 1, 2, 3].forEach(index => expect(new Set(sections.map(section => section[index])).size).toBe(6));
    expect(buildCefrWritingRules("A1")).toMatch(/one main idea.*finite verb/);
    expect(buildCefrWritingRules("A2")).toMatch(/basic connected sentences/);
    expect(buildCefrWritingRules("B1")).toMatch(/connected narrative and reasoning/);
    expect(buildCefrWritingRules("B2")).toMatch(/Vary simple, compound, and complex sentences/);
    expect(buildCefrWritingRules("C1")).toMatch(/flexible complex sentences.*nuance/);
    expect(buildCefrWritingRules("C2")).toMatch(/mature control.*full range of sentence forms/);
  });

  test.each(CEFR_LEVELS)("protects correctness, source fidelity, format, and register at %s", level => {
    const rules = buildCefrWritingRules(level);
    expect(rules).toContain("Never imitate learner errors");
    expect(rules).toContain("quoted text verbatim");
    expect(rules).toContain("JSON keys");
    expect(rules).toContain("must not override the selected CEFR level");
    expect(rules).toContain("Silent self-review:");
    expect(rules).toContain("Return only the requested result");
    expect(rules).not.toMatch(/\b\d+(?:[-–]\d+)?\s+words\s+(?:per|in a)\s+sentence/i);
  });

  test("does not conflate advanced writing with ornate vocabulary or uniformly short syntax", () => {
    expect(buildCefrWritingRules("C1")).toContain("avoid uniform simple syntax");
    expect(buildCefrWritingRules("C1")).toContain("inflated synonyms");
    expect(buildCefrWritingRules("C2")).toContain("never ornate for its own sake");
    expect(buildCefrWritingRules("C2")).toContain("do not flatten it into basic sentences");
  });
});

describe("writing output token budgets", () => {
  test("grows with requested length through 4000 words while respecting the API cap", () => {
    for (const structured of [false, true]) {
      const budgets = [250, 500, 1000, 2000, 3000, 4000].map(words => writingOutputTokenBudget(words, { structured }));
      budgets.forEach(budget => {
        expect(Number.isInteger(budget)).toBe(true);
        expect(budget).toBeLessThanOrEqual(8192);
      });
      budgets.slice(1).forEach((budget, index) => expect(budget).toBeGreaterThan(budgets[index]));
      expect(budgets.at(-1)).toBeGreaterThanOrEqual(7000);
    }
  });

  test("reserves extra room for structured results without exceeding the route limit", () => {
    for (const words of [500, 1000, 2000, 4000]) {
      expect(writingOutputTokenBudget(words, { structured: true })).toBeGreaterThan(writingOutputTokenBudget(words));
    }
    expect(writingOutputTokenBudget(4000, { structured: true })).toBe(8192);
    expect(writingOutputTokenBudget(100000)).toBe(8192);
  });

  test.each([undefined, null, "", "not a count", -1, 0, NaN, Infinity, {}, []])("uses a safe default for an invalid word count %p", words => {
    expect(writingOutputTokenBudget(words)).toBe(writingOutputTokenBudget(500));
  });

  test("supports counts from form inputs and rounds fractional targets upward", () => {
    expect(writingOutputTokenBudget(" 4000 ")).toBe(writingOutputTokenBudget(4000));
    expect(writingOutputTokenBudget(1000.1)).toBe(writingOutputTokenBudget(1001));
  });
});
