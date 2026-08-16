import {limitQuestionsToSource,protectCitationMarkers,restoreCitationMarkers} from "./humanizeText";

describe("Humanize text safeguards",()=>{
  test("preserves NotebookLM-style citation markers exactly",()=>{
    const input="The finding was replicated [1,2] and later reviewed [3].";
    const protectedText=protectCitationMarkers(input);
    const rewritten=`The result held up ${protectedText.citations[0].token}. A later review agreed ${protectedText.citations[1].token}.`;
    expect(restoreCitationMarkers(rewritten,protectedText.citations)).toBe("The result held up [1,2]. A later review agreed [3].");
  });

  test("restores a citation even if a model drops its placeholder",()=>{
    const protectedText=protectCitationMarkers("Evidence supports this [4-6].");
    expect(restoreCitationMarkers("The evidence supports this.",protectedText.citations)).toBe("The evidence supports this. [4-6]");
  });

  test("does not allow Humanize to invent rhetorical questions",()=>{
    expect(limitQuestionsToSource("A pile of statistics? Most people tune out.","Statistics are often ignored.")).toBe("A pile of statistics. Most people tune out.");
    expect(limitQuestionsToSource("Why now? Why later?","Why now?")).toBe("Why now? Why later.");
  });
});

