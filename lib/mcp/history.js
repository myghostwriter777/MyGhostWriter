// Turns a stored History row into text an MCP client can read.
//
// Two History modes store JSON rather than prose: slide decks and manga packs.
// Both embed base64 image previews, which must never reach a connector
// response — a single manga row can carry tens of thousands of characters of
// image data that would swamp the client's context and tell it nothing.

const SLIDE_PREFIX = "GWM_SLIDE_DECK_V1\n";
const MANGA_PREFIX = "GWM_MANGA_STUDIO_V1\n";
const DATA_URL = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;

const MODE_LABELS = {
  portfolio: "Portfolio", reply: "AI Reply", writing: "Writing", email: "Email",
  grammar: "Grammar", essay: "Essay", presentation: "Presentation", interview: "Interview",
  slides: "Slide Deck", cv: "CV", author: "Author", story: "Story Guide", study: "Study Pack",
  meeting: "Meeting Assist", academic: "Academic", humanize: "Humanize", manga: "Manga Studio",
};

const clean = value => String(value == null ? "" : value).replace(DATA_URL, "[image]").trim();

function slideDeckText(payload) {
  const deck = payload?.deck || {};
  const slides = (deck.slides || []).filter(slide => !slide?.isSources);
  const lines = [clean(deck.title) || "Slide deck"];
  if (deck.subtitle) lines.push(clean(deck.subtitle));
  slides.forEach((slide, index) => {
    const parts = [`\nSLIDE ${index + 1}: ${clean(slide.title)}`];
    if (slide.supportingText) parts.push(clean(slide.supportingText));
    (slide.bullets || []).forEach(bullet => parts.push(`- ${clean(bullet)}`));
    if (slide.speakerNotes) parts.push(`Speaker notes: ${clean(slide.speakerNotes)}`);
    lines.push(parts.join("\n"));
  });
  const sources = (deck.sources || []).filter(source => source?.url);
  if (sources.length) {
    lines.push("\nSOURCES");
    sources.forEach((source, index) => lines.push(`${index + 1}. ${clean(source.title)} — ${clean(source.url)}`));
  }
  return lines.join("\n");
}

function mangaPackText(payload) {
  const pack = payload?.pack || {};
  const lines = [clean(pack.title) || "Manga pack"];
  if (pack.logline) lines.push(clean(pack.logline));
  const bible = pack.characterBible || [];
  if (bible.length) {
    lines.push("\nCHARACTERS");
    bible.forEach(character =>
      lines.push(`- ${clean(character.name)}: ${clean(character.appearance)} ${clean(character.personality)}`.trim())
    );
  }
  (pack.pages || []).forEach((page, pageIndex) => {
    lines.push(`\nPAGE ${pageIndex + 1}`);
    (page.panels || []).forEach((panel, panelIndex) => {
      const bits = [`Panel ${panelIndex + 1}: ${clean(panel.shot)}. ${clean(panel.action)}`.trim()];
      if (panel.dialogue) bits.push(`${clean(panel.speaker) || "Dialogue"}: "${clean(panel.dialogue)}"`);
      if (panel.caption) bits.push(`Caption: ${clean(panel.caption)}`);
      lines.push(bits.join("\n"));
    });
  });
  const ready = (payload?.images || []).filter(image => image?.dataUrl).length;
  if (ready) lines.push(`\n${ready} illustrated page${ready === 1 ? "" : "s"} are saved in GhostwriterMe (images are not included here).`);
  return lines.join("\n");
}

// Never throws: an unreadable payload degrades to its cleaned raw text rather
// than failing the whole tool call.
function historyItemText(item) {
  const output = String(item?.output || "");
  if (output.startsWith(SLIDE_PREFIX)) {
    try {
      return slideDeckText(JSON.parse(output.slice(SLIDE_PREFIX.length)));
    } catch { /* fall through to raw text */ }
  }
  if (output.startsWith(MANGA_PREFIX)) {
    try {
      return mangaPackText(JSON.parse(output.slice(MANGA_PREFIX.length)));
    } catch { /* fall through to raw text */ }
  }
  return clean(output);
}

function historyItemSummary(item, snippetLength = 220) {
  const text = historyItemText(item);
  return {
    id: String(item?.id || ""),
    mode: String(item?.mode || ""),
    modeLabel: MODE_LABELS[item?.mode] || String(item?.mode || "Result"),
    title: clean(item?.title) || "Untitled",
    createdAt: item?.ts || null,
    snippet: text.length > snippetLength ? `${text.slice(0, snippetLength).trimEnd()}…` : text,
  };
}

// Substring match across title, input and decoded output. The History table
// has no full-text index, so filtering happens here on a bounded page of rows.
function matchesQuery(item, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${item?.title || ""}\n${item?.input || ""}\n${historyItemText(item)}`.toLowerCase();
  return needle.split(/\s+/).every(word => haystack.includes(word));
}

module.exports = { SLIDE_PREFIX, MANGA_PREFIX, MODE_LABELS, historyItemText, historyItemSummary, matchesQuery, clean };
