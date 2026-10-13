import {buildHumanizeLevelRules,cleanHumanizedFormatting,limitQuestionsToSource,removeBeginnerDashPunctuation,removeBracketedNumberCitations} from "./humanizeText";
import {buildCefrWritingRules} from "./cefrWriting";

describe("Humanize text safeguards",()=>{
  test("removes numeric citation markers",()=>{
    expect(removeBracketedNumberCitations("The result held up [1,2]. A later review agreed [3].")).toBe("The result held up. A later review agreed.");
    expect(removeBracketedNumberCitations("Keep [draft] but remove [4-6] and [7; 8].")).toBe("Keep [draft] but remove and.");
  });

  test("does not turn independent clauses into comma splices",()=>{
    const text="It is useful — it saves time. It is a well-known tool - many people use it.";
    expect(removeBeginnerDashPunctuation(text)).toBe(text);
  });

  test("preserves ranges and quoted punctuation rather than changing their meaning",()=>{
    const text='In 2018–2024, sales grew. “Wait—I have a question,” she said.';
    expect(removeBeginnerDashPunctuation(text)).toBe(text);
  });

  test("does not change interrogative syntax into a sentence with the wrong punctuation",()=>{
    expect(limitQuestionsToSource("Why now? Why later?","Why now?")).toBe("Why now? Why later?");
    const text='She asked, “Can we leave?” See https://example.org/?page=2.';
    expect(limitQuestionsToSource(text,"She asked if they could leave.")).toBe(text);
  });

  test("removes markdown and decorative symbols without damaging prose punctuation",()=>{
    expect(cleanHumanizedFormatting("## *Clear result*\n• It costs $20 (today).\n- It is well-known.\n`Final` answer."))
      .toBe("Clear result\nIt costs $20 (today).\nIt is well-known.\nFinal answer.");
  });

  test("preserves multiplication when stripping actual emphasis and bullet markup",()=>{
    expect(cleanHumanizedFormatting("**The calculation**\n* Use 2 * 3 * 4 = 24.\nThe *total* is correct."))
      .toBe("The calculation\nUse 2 * 3 * 4 = 24.\nThe total is correct.");
  });

  test("preserves signed measurements and ambiguous numeric bullets exactly",()=>{
    const text="Changes:\n- 5 degrees\n+ 3 degrees\n  -  0.5 percent\n\t+ 12.5 kg\n- .5 units\n- 5 reasons\n- ٥ درجات";
    expect(cleanHumanizedFormatting(text)).toBe(text);
  });

  test("removes clear bullet markers while preserving nested indentation",()=>{
    expect(cleanHumanizedFormatting("• Parent  item\n  - Child item\n    + Grandchild item\n\t* Tabbed child"))
      .toBe("Parent item\n  Child item\n    Grandchild item\n\tTabbed child");
  });

  test("citation cleanup also preserves the hierarchy before formatting cleanup",()=>{
    const source="• Parent [1]\n  - Child [2]\n    - Grandchild [3]";
    const withoutCitations=removeBracketedNumberCitations(source);
    expect(withoutCitations).toBe("• Parent\n  - Child\n    - Grandchild");
    expect(cleanHumanizedFormatting(withoutCitations)).toBe("Parent\n  Child\n    Grandchild");
  });

  test.each(["A1","A2","B1","B2","C1","C2"])("shares the full %s writing rules and prevents invented rhetorical framing",level=>{
    const rules=buildHumanizeLevelRules(level);
    expect(rules.startsWith(buildCefrWritingRules(level))).toBe(true);
    expect(rules).toContain(`CEFR WRITING LEVEL: ${level}`);
    expect(rules).toContain("Do not invent rhetorical questions");
    expect(rules).toContain("Preserve genuine questions and quoted speech");
  });

  test("uses shared normalization and fallback for lowercase, blank, and unknown levels",()=>{
    expect(buildHumanizeLevelRules("  a2 ")).toBe(buildHumanizeLevelRules("A2"));
    for(const level of [undefined,"","advanced","A3"]){
      expect(buildHumanizeLevelRules(level)).toBe(buildHumanizeLevelRules("B2"));
    }
  });
});
