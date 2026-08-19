import {limitQuestionsToSource,removeBeginnerDashPunctuation,removeBracketedNumberCitations} from "./humanizeText";

describe("Humanize text safeguards",()=>{
  test("removes NotebookLM-style numeric citation markers",()=>{
    expect(removeBracketedNumberCitations("The result held up [1,2]. A later review agreed [3].")).toBe("The result held up. A later review agreed.");
    expect(removeBracketedNumberCitations("Keep [draft] but remove [4-6] and [7; 8].")).toBe("Keep [draft] but remove and.");
  });

  test("removes clause dashes without breaking compound words",()=>{
    expect(removeBeginnerDashPunctuation("It is useful — but not perfect. It is a well-known tool - many people use it.")).toBe("It is useful, but not perfect. It is a well-known tool, many people use it.");
  });

  test("does not allow Humanize to invent rhetorical questions",()=>{
    expect(limitQuestionsToSource("A pile of statistics? Most people tune out.","Statistics are often ignored.")).toBe("A pile of statistics. Most people tune out.");
    expect(limitQuestionsToSource("Why now? Why later?","Why now?")).toBe("Why now? Why later.");
  });
});
