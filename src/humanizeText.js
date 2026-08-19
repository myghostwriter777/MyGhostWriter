const CITATION_MARKER=/\[(?:\s*\d+\s*)(?:(?:,|;|\u2013|-)\s*\d+\s*)*\]/g;

// NotebookLM-style numeric source markers are presentation metadata rather
// than prose. The user explicitly wants them removed from Humanize output.
// This deliberately leaves ordinary bracketed text such as [draft] intact.
export function removeBracketedNumberCitations(value){
  return String(value||"")
    .replace(CITATION_MARKER,"")
    .replace(/[ \t]+([,.;!?])/g,"$1")
    .replace(/[ \t]{2,}/g," ")
    .replace(/[ \t]+\n/g,"\n")
    .trim();
}

// A1-B1 essays should not use dash punctuation. Compound words remain intact;
// only em/en dashes and standalone hyphens used between clauses are removed.
export function removeBeginnerDashPunctuation(value){
  return String(value||"")
    .replace(/\s*[\u2013\u2014]\s*/g,", ")
    .replace(/\s+-\s+/g,", ")
    .replace(/,\s*([,.;!?])/g,"$1")
    .replace(/[ \t]{2,}/g," ")
    .trim();
}

// Humanize may keep genuine questions from the source, but it must never add
// new rhetorical ones. Any extra question marks are safely changed to stops.
export function limitQuestionsToSource(value,source){
  let allowed=(String(source||"").match(/\?/g)||[]).length;
  return String(value||"").replace(/\?/g,()=>allowed-->0?"?":".");
}
