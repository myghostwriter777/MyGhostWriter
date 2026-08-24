import { DEFAULT_TAROT_CARD_ART, getTarotCardArt, TAROT_CARD_ART } from "./tarotCardAssets";

describe("tarot card visual contract",()=>{
  test("uses only the shared engraved WebP asset family",()=>{
    expect(DEFAULT_TAROT_CARD_ART).toMatch(/^\/tarot\/[a-z0-9-]+\.webp$/);
    Object.values(TAROT_CARD_ART).forEach(path=>expect(path).toMatch(/^\/tarot\/[a-z0-9-]+\.webp$/));
  });

  test("gives the three newer modes commissioned matching artwork",()=>{
    expect(TAROT_CARD_ART.writing).toBe("/tarot/writing-v2.webp");
    expect(TAROT_CARD_ART.meeting).toBe("/tarot/meeting-v2.webp");
    expect(TAROT_CARD_ART.manga).toBe("/tarot/manga-v2.webp");
  });

  test("keeps future uncommissioned modes inside the same visual family",()=>{
    expect(getTarotCardArt("future-mode")).toBe(DEFAULT_TAROT_CARD_ART);
  });
});
