// One visual contract for the landing-page deck. Every commissioned mode art
// must be a textured portrait WebP from the same black-and-old-gold engraved
// family. A future mode that has not received its own illustration yet falls
// back to a real card from that family instead of rendering a flat UI graphic.
export const DEFAULT_TAROT_CARD_ART="/tarot/reply.webp";

export const TAROT_CARD_ART=Object.freeze({
  reply:"/tarot/reply.webp",
  writing:"/tarot/writing-v2.webp",
  email:"/tarot/email.webp",
  grammar:"/tarot/grammar.webp",
  essay:"/tarot/essay.webp",
  presentation:"/tarot/presentation.webp",
  interview:"/tarot/interview.webp",
  slides:"/tarot/slides.webp",
  meeting:"/tarot/meeting-v2.webp",
  manga:"/tarot/manga-v2.webp",
  academic:"/tarot/academic.webp",
  cv:"/tarot/cv.webp",
  author:"/tarot/author.webp",
  humanize:"/tarot/humanize.webp",
  story:"/tarot/story.webp",
  history:"/tarot/history.webp",
});

export const getTarotCardArt=toolId=>TAROT_CARD_ART[toolId]||DEFAULT_TAROT_CARD_ART;
