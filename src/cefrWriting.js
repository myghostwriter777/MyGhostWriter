// Application writing guidance informed by the Council of Europe's CEFR
// Companion Volume (2020), not an official assessment rubric or grammar syllabus.
// https://rm.coe.int/16809ea0d4
// Overall written production: p. 66; linguistic range/vocabulary: pp. 130-131;
// grammatical accuracy: p. 132; coherence and cohesion: pp. 140-141.
// The concrete syntax choices below are editorial guidance. CEFR levels do not
// prescribe numeric sentence-length thresholds or require deliberate mistakes.
export const CEFR_LEVELS = Object.freeze(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const CEFR_DESCRIPTIONS = Object.freeze({
  A1: "Simple complete sentences and familiar everyday words.",
  A2: "Basic connected sentences with simple reasons and descriptions.",
  B1: "Connected paragraphs with clear stories, opinions, and reasons.",
  B2: "Varied sentences and clear, developed explanations and arguments.",
  C1: "Flexible complex sentences with nuance and well-shaped paragraphs.",
  C2: "Precise, fluent writing with mature control of structure and tone.",
});

const levelKey = value => typeof value === "string" ? value.trim().toUpperCase() : "";

export function normalizeCefrLevel(value, fallback = "B2") {
  const normalized = levelKey(value);
  if (CEFR_LEVELS.includes(normalized)) return normalized;
  const normalizedFallback = levelKey(fallback);
  return CEFR_LEVELS.includes(normalizedFallback) ? normalizedFallback : "B2";
}

const LEVEL_RULES = {
  A1: [
    "Sentence structure: Prefer a complete sentence with one main idea and a straightforward subject and finite verb. Separate difficult clause chains into complete sentences; do not create fragments or a childish, staccato voice.",
    "Grammar: Use familiar forms of be, have, can, and basic verb patterns. Keep the real time of events with the simplest suitable tense; retain correct articles, agreement, negatives, and questions.",
    "Vocabulary: Choose common, concrete words. Explain an essential unfamiliar term in plain words instead of deleting the idea or changing its meaning.",
    "Coherence: Arrange ideas in an obvious order. Use and or then where helpful, and repeat a clear noun when a pronoun could be confusing.",
  ],
  A2: [
    "Sentence structure: Build basic connected sentences. Join closely related ideas with and, but, or because; use an occasional simple when clause. Avoid stacking several dependent clauses in one sentence.",
    "Grammar: Use straightforward present, past, and future forms as needed, familiar modal verbs, and simple comparisons. Keep each sentence grammatically complete and make references to people and events clear.",
    "Vocabulary: Use familiar everyday wording for descriptions and practical explanations. Introduce necessary topic words with a brief accessible explanation.",
    "Coherence: Connect events, contrasts, and simple reasons explicitly. Group related points together and use basic sequence markers without starting every sentence the same way.",
  ],
  B1: [
    "Sentence structure: Write connected narrative and reasoning, combining simple sentences with manageable subordinate clauses. Use familiar because, although, if, when, and relative clauses when they clarify a relationship; do not reduce everything to isolated short statements.",
    "Grammar: Maintain consistent tense through events and explanations. Use familiar conditionals and relative clauses accurately, keeping clause relationships easy to follow.",
    "Vocabulary: Prefer familiar but reasonably varied language. Explain less familiar ideas directly while retaining useful topic vocabulary and the source's degree of certainty.",
    "Coherence: Develop a clear sequence of points in paragraphs. Link an opinion to its reason or example; signal time, cause, and a straightforward counterpoint.",
  ],
  B2: [
    "Sentence structure: Vary simple, compound, and complex sentences. Use relative, conditional, causal, and concessive clauses to develop explanations and arguments; choose clause length for clarity rather than imposing a short-sentence style.",
    "Grammar: Control tense, modality, comparison, and subordination accurately. Vary sentence openings and use active or passive voice according to what deserves emphasis.",
    "Vocabulary: Use a broad practical range and appropriate subject terminology. Choose natural collocations and avoid repetitive phrasing without replacing precise words just for variety.",
    "Coherence: Shape paragraphs around developed points with supporting detail. Make contrast, consequence, evidence, and reference clear through varied links, not a connector in every sentence.",
  ],
  C1: [
    "Sentence structure: Use flexible complex sentences to express nuance, qualification, and relationships between ideas. Mix concise emphasis with controlled embedding, relative clauses, and participial constructions when useful; avoid uniform simple syntax or unnecessarily tangled sentences.",
    "Grammar: Control clause placement, tense, aspect, modality, and parallel structure precisely. Use hedging or emphasis to match the intended certainty, never to add unsupported claims.",
    "Vocabulary: Choose precise, natural wording from a broad repertoire, including specialist terms when relevant. Prefer a well-chosen expression over inflated synonyms or conspicuous displays of difficulty.",
    "Coherence: Build well-shaped paragraphs that develop and qualify an argument. Integrate transitions, pronoun reference, and thematic links smoothly so the reasoning remains visible without formulaic signposting.",
  ],
  C2: [
    "Sentence structure: Exercise mature control over the full range of sentence forms. Recast and combine clauses to distinguish subtle meanings, pace an argument, or shift emphasis; alternate economical statements and layered syntax as the purpose requires.",
    "Grammar: Keep complex syntax fluent and exact, with deliberate information placement, unambiguous reference, and consistent parallelism. Use advanced constructions selectively, not as a checklist to display proficiency.",
    "Vocabulary: Express fine distinctions with accurate collocations, connotations, and register. Use idiomatic or technical language only when it fits; mature writing should be precise and natural, never ornate for its own sake.",
    "Coherence: Guide the reader through the whole text with purposeful paragraph progression and subtle links. Make important distinctions easy to notice while avoiding repetitive transitions, padding, and unnecessary explanation.",
  ],
};

const SHARED_RULES = [
  "Accuracy: Write natural, grammatical language at every level. Never imitate learner errors, omit necessary grammar, or equate a lower level with childish writing. Vary complexity, not correctness; do not use a fixed words-per-sentence rule.",
  "Meaning and format: Preserve supplied facts, names, numbers, technical meaning, citations, and quoted text verbatim unless the task explicitly asks to change them. Do not invent evidence or erase important qualifications to simplify the language. Keep the requested format, JSON keys, headings, and genre conventions; apply these rules to prose fields, not structural labels. Requested headings, captions, or bullet labels may remain phrases.",
  "Register: Match the requested audience and tone independently of complexity. Academic or professional register must not override the selected CEFR level. At higher levels, clear writing can use varied complex syntax; do not flatten it into basic sentences. For another output language, adapt these principles to that language's natural grammar.",
  "Silent self-review: Before returning the result, check sentence boundaries, agreement, tense consistency, clause connections, pronoun reference, paragraph flow, and the selected level. Repair awkward phrasing and mismatched complexity while preserving meaning and format. Return only the requested result, without this review or a claim of certified CEFR accuracy.",
];

export function buildCefrWritingRules(level) {
  const normalized = normalizeCefrLevel(level);
  return [`CEFR WRITING LEVEL: ${normalized}`, ...LEVEL_RULES[normalized], ...SHARED_RULES].join("\n");
}

// Reserve space for the requested prose and response overhead instead of using
// one fixed budget for both short and long writing tasks. This is an English
// prose estimate, not a word-count guarantee: tokenization, citations, JSON
// escaping, and other languages can require more. At the 8192-token route cap,
// callers must still handle truncated output, especially for long JSON results.
export function writingOutputTokenBudget(words, { structured = false } = {}) {
  const supplied = typeof words === "number" || typeof words === "string" ? Number(words) : NaN;
  const targetWords = Number.isFinite(supplied) && supplied > 0 ? Math.ceil(supplied) : 500;
  const overhead = structured ? 1050 : 500;
  return Math.min(8192, Math.max(1200, Math.ceil(targetWords * 1.8 + overhead)));
}
