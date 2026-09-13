// Authentication for the connector features.
//
// Two different credentials are involved, and they must not be confused:
//
//  1. A **Google access token**, proving that the person calling a management
//     route is really signed into that Google account. The app already signs
//     users in with `google.accounts.oauth2.initTokenClient`, so the browser
//     can hand a fresh access token to the server, which verifies it against
//     Google's userinfo endpoint. This is what guards token creation: without
//     it, anyone who knew an email address could mint a credential that reads
//     that account's whole History.
//
//  2. A **connector token** (`gwm_<id>_<secret>`), which the user pastes into
//     Claude, ChatGPT or Cursor. Only a SHA-256 hash of the secret is stored,
//     so a database leak cannot be replayed against the MCP endpoint.

const { createHash, randomBytes, timingSafeEqual } = require("crypto");
const { select, insert, update, remove } = require("./supabaseRest");

const TOKEN_TABLE = "connector_tokens";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";
const TOKEN_PREFIX = "gwm_";
const TOKEN_PATTERN = /^gwm_([0-9a-f]{16})_([0-9a-f]{48})$/;
const MAX_TOKENS_PER_USER = 5;
const VERIFY_TIMEOUT_MS = 8000;

const sha256 = value => createHash("sha256").update(String(value)).digest("hex");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function httpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

// ---------------------------------------------------------------- Google

async function verifyGoogleAccessToken(accessToken, { fetchImpl = fetch } = {}) {
  const token = String(accessToken || "").trim();
  if (!token) throw httpError("Sign in with Google again to manage connectors.", 401, "GOOGLE_TOKEN_REQUIRED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    throw httpError("Google could not be reached to verify your sign-in. Try again.", 502);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw httpError("That Google sign-in has expired. Sign in again and retry.", 401, "GOOGLE_TOKEN_INVALID");
  }
  const profile = await response.json().catch(() => null);
  const email = normalizeEmail(profile?.email);
  if (!email) throw httpError("Google did not return a verified email address.", 401, "GOOGLE_TOKEN_INVALID");
  if (profile.email_verified === false) throw httpError("This Google account has no verified email address.", 403);
  return { email, name: String(profile?.name || "").trim(), googleId: String(profile?.sub || "") };
}

// Only permanent admin-tester accounts may use connectors while the feature is
// finalised. Mirrors isAdminTester() in src/featureAvailability.js, but read
// from the database so the gate cannot be bypassed from the browser.
async function requireConnectorAccess(email) {
  const rows = await select(
    "users",
    `?email=eq.${encodeURIComponent(email)}&select=email,role,all_features,plan`
  );
  const user = Array.isArray(rows) ? rows[0] : null;
  if (!user) throw httpError("This account was not found.", 404);
  if (!(user.role === "admin" && user.all_features === true)) {
    throw httpError(
      "Connectors are still in admin testing and are not enabled for this account yet.",
      403,
      "CONNECTORS_NOT_ENABLED"
    );
  }
  return user;
}

// ---------------------------------------------------------------- tokens

function mintToken() {
  const id = randomBytes(8).toString("hex");
  const secret = randomBytes(24).toString("hex");
  return { id, secret, token: `${TOKEN_PREFIX}${id}_${secret}` };
}

function parseToken(value) {
  const match = TOKEN_PATTERN.exec(String(value || "").trim());
  return match ? { id: match[1], secret: match[2] } : null;
}

// Constant-time compare so a wrong token cannot be narrowed down by timing.
function secretMatches(secret, storedHash) {
  const provided = Buffer.from(sha256(secret), "utf8");
  const stored = Buffer.from(String(storedHash || ""), "utf8");
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

async function listTokens(email) {
  const rows = await select(
    TOKEN_TABLE,
    `?email=eq.${encodeURIComponent(email)}&select=id,label,created_at,last_used_at&order=created_at.desc`
  );
  return Array.isArray(rows) ? rows : [];
}

async function createToken(email, label) {
  const existing = await listTokens(email);
  if (existing.length >= MAX_TOKENS_PER_USER) {
    throw httpError(`You already have ${MAX_TOKENS_PER_USER} connector tokens. Revoke one before creating another.`, 409);
  }
  const { id, secret, token } = mintToken();
  await insert(TOKEN_TABLE, {
    id,
    email,
    token_hash: sha256(secret),
    label: String(label || "").trim().slice(0, 60) || "Connector token",
    created_at: new Date().toISOString(),
  });
  // The plaintext token is returned exactly once and never stored.
  return { id, token };
}

async function revokeToken(email, id) {
  if (!/^[0-9a-f]{16}$/.test(String(id || ""))) throw httpError("That connector token id is not valid.", 400);
  await remove(TOKEN_TABLE, `?email=eq.${encodeURIComponent(email)}&id=eq.${encodeURIComponent(id)}`);
  return { ok: true };
}

// Verifies a token presented by an MCP client and returns the owning account.
// Access is re-checked on every call, so revoking admin rights or deleting the
// token takes effect immediately rather than at the next sign-in.
async function authenticateConnectorToken(value) {
  const parsed = parseToken(value);
  if (!parsed) throw httpError("Missing or malformed connector token.", 401, "TOKEN_INVALID");
  const rows = await select(
    TOKEN_TABLE,
    `?id=eq.${encodeURIComponent(parsed.id)}&select=id,email,token_hash,label`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !secretMatches(parsed.secret, row.token_hash)) {
    throw httpError("This connector token is not valid or has been revoked.", 401, "TOKEN_INVALID");
  }
  const email = normalizeEmail(row.email);
  await requireConnectorAccess(email);
  // Best effort: a failed timestamp write must never block a working call,
  // and neither must a storage layer that returns something other than a
  // promise.
  try {
    Promise.resolve(
      update(TOKEN_TABLE, `?id=eq.${encodeURIComponent(parsed.id)}`, { last_used_at: new Date().toISOString() })
    ).catch(() => {});
  } catch { /* ignore */ }
  return { email, tokenId: row.id, label: row.label || "" };
}

// Accepts the token from the Authorization header (preferred) or a query
// parameter, because some connector UIs only accept a URL.
function tokenFromRequest(req) {
  const header = String(req?.headers?.authorization || req?.headers?.Authorization || "");
  const bearer = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (bearer) return bearer[1].trim();
  const headerToken = req?.headers?.["x-connector-token"];
  if (headerToken) return String(headerToken).trim();
  const query = req?.query || {};
  return String(query.token || query.key || "").trim();
}

module.exports = {
  TOKEN_TABLE,
  MAX_TOKENS_PER_USER,
  normalizeEmail,
  httpError,
  sha256,
  mintToken,
  parseToken,
  secretMatches,
  verifyGoogleAccessToken,
  requireConnectorAccess,
  listTokens,
  createToken,
  revokeToken,
  authenticateConnectorToken,
  tokenFromRequest,
};
