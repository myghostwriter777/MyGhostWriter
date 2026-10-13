import { plainWritingText } from "./plainWritingText";

test("makes essay titles, subtitles, emphasis and key points plain text", () => {
  expect(plainWritingText("# ***Community Gardens***\n\n## **Benefits**\nA **shared** garden helps.\n\n* **Food:** Fresh produce.\n* ***People:*** New friendships."))
    .toBe("Community Gardens\n\nBenefits\nA shared garden helps.\n\n• Food: Fresh produce.\n• People: New friendships.");
});

test("keeps meaning-bearing hash signs, multiplication, exponents, URLs and paragraph structure", () => {
  const source = "C# and #gardens\n\nThe result is 2 * 3 * 4. Compute 2**3 and 4**5.\nhttps://example.test/#details\nA snake_case identifier.";
  expect(plainWritingText(source)).toBe(source);
});

test("removes stray Markdown wrappers and decorative stars without joining paragraphs", () => {
  expect(plainWritingText("```text\n# Title\n\n***\n\nA *clear* paragraph.\n\n__Conclusion__\nAnother paragraph.\n```"))
    .toBe("Title\n\nA clear paragraph.\n\nConclusion\nAnother paragraph.");
});
