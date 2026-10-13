import { buildCefrWritingRules } from "./cefrWriting";

const CITATION_MARKER=/\[(?:\s*\d+\s*)(?:(?:,|;|\u2013|-)\s*\d+\s*)*\]/g;
const SIGNED_NUMBER_LINE=/^[ \t]*[-+][ \t]*(?:\p{N}|[.,]\p{N})/u;

// Indentation carries list hierarchy. Collapse repeated prose spaces only
// after the indent, and leave ambiguous signed numeric lines intact.
const normalizeInlineSpacing=value=>value.split("\n").map(line=>SIGNED_NUMBER_LINE.test(line)?line:line.replace(/(^[ \t]+)|[ \t]{2,}/g,(spaces,indent)=>indent??" ")).join("\n");

// Numeric source markers are presentation metadata rather than prose.
// They are removed from Humanize output.
// This deliberately leaves ordinary bracketed text such as [draft] intact.
export function removeBracketedNumberCitations(value){
  return normalizeInlineSpacing(String(value||"")
    .replace(CITATION_MARKER,"")
    .replace(/[ \t]+([,.;!?])/g,"$1")
    .replace(/[ \t]+\n/g,"\n"))
    .trim();
}

// Compatibility for older callers. A dash can separate independent clauses,
// mark a range, or belong to a quotation. Replacing it with a comma introduces
// comma splices or changes meaning; sentence simplification belongs in the
// writing instructions, where the whole sentence can be rewritten.
export function removeBeginnerDashPunctuation(value){
  return String(value??"");
}

// A question-mark count cannot distinguish quoted, genuine, and rhetorical
// questions. Preserve punctuation rather than turning "Why now?" into the
// ungrammatical "Why now." or corrupting a URL's query string.
export function limitQuestionsToSource(value){
  return String(value??"");
}

// Share grammar, sentence structure, and vocabulary guidance with every other
// writing mode. Humanize adds only instructions specific to rewriting a source.
export function buildHumanizeLevelRules(level){
  return `${buildCefrWritingRules(level)}\nHUMANIZE: Do not invent rhetorical questions or question-and-answer framing. Preserve genuine questions and quoted speech from the source; when recasting a question as a statement, rewrite its syntax instead of only changing punctuation.`;
}

// Strip markup and decorative characters that language models sometimes
// leave in otherwise plain prose. Normal essay punctuation, mathematical
// symbols, currencies, apostrophes, parentheses, and compound-word hyphens
// remain untouched.
export function cleanHumanizedFormatting(value){
  const cleaned=String(value||"")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g,"")
    .replace(/```[a-z]*\s*/gi,"")
    .replace(/`/g,"")
    .replace(/\*\*([^\n]+?)\*\*/g,"$1")
    .replace(/(^|[\s([{])\*([^\s*\n](?:[^*\n]*[^\s*\n])?)\*(?=$|[\s.,!?;:)\]}])/g,"$1$2")
    .replace(/^\s{0,3}#{1,6}\s*/gm,"")
    .split("\n").map(line=>SIGNED_NUMBER_LINE.test(line)?line:line.replace(/^([ \t]*)(?:[•◦▪▫◆◇►▸]+|[-+*][ \t]+)[ \t]*/,"$1")).join("\n")
    .replace(/[ \t]+\n/g,"\n");
  return normalizeInlineSpacing(cleaned)
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}
