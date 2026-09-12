// Meeting Assist shipped in September 2026; only Manga Studio stays behind
// the admin-tester gate while its illustration pipeline is finalised.
export const COMING_SOON_MODE_IDS = new Set(["manga"]);

export function isAdminTester(user) {
  return Boolean(user?.isAdmin && user?.allFeatures);
}

export function isComingSoonForUser(modeOrId, user) {
  const modeId = typeof modeOrId === "string" ? modeOrId : modeOrId?.id;
  return COMING_SOON_MODE_IDS.has(modeId) && !isAdminTester(user);
}
