export const COMING_SOON_MODE_IDS = new Set(["meeting", "manga"]);

export function isAdminTester(user) {
  return Boolean(user?.isAdmin && user?.allFeatures);
}

export function isComingSoonForUser(modeOrId, user) {
  const modeId = typeof modeOrId === "string" ? modeOrId : modeOrId?.id;
  return COMING_SOON_MODE_IDS.has(modeId) && !isAdminTester(user);
}
