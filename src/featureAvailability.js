// Meeting Assist shipped in September 2026; only Manga Studio stays behind
// the admin-tester gate while its illustration pipeline is finalised.
export const COMING_SOON_MODE_IDS = new Set(["manga"]);

export function isAdminTester(user) {
  return Boolean(user?.isAdmin && user?.allFeatures);
}

// Connectors (the MCP server users add to Claude/ChatGPT, and the apps they
// connect into GhostwriterMe) are in admin testing. The server re-checks this
// against the database on every call, so this only controls what the UI shows.
export function canUseConnectors(user) {
  return isAdminTester(user);
}

export function isComingSoonForUser(modeOrId, user) {
  const modeId = typeof modeOrId === "string" ? modeOrId : modeOrId?.id;
  return COMING_SOON_MODE_IDS.has(modeId) && !isAdminTester(user);
}
