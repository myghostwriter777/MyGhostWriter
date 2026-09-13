// Thin wrapper over Supabase's PostgREST interface, matching the plain-fetch
// approach api/history.js and api/upsert-user.js already use (no npm client).
// Shared by the connector routes so table-missing and auth errors read the
// same way everywhere.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MISSING_TABLE = /relation .* does not exist|Could not find the table/i;

function isConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function tableError(table, message) {
  const error = new Error(
    MISSING_TABLE.test(message)
      ? `The "${table}" table is missing. Run supabase/connectors.sql in the Supabase SQL Editor, then try again.`
      : `Database request failed: ${String(message || "").slice(0, 200)}`
  );
  error.statusCode = MISSING_TABLE.test(message) ? 503 : 502;
  error.missingTable = MISSING_TABLE.test(message);
  return error;
}

function assertConfigured() {
  if (isConfigured()) return;
  const error = new Error(
    "The connector database is not configured. Connect Supabase to this project so SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, then redeploy."
  );
  error.statusCode = 503;
  throw error;
}

async function request(table, { method = "GET", query = "", body, prefer } = {}) {
  assertConfigured();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw tableError(table, await response.text().catch(() => ""));
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const select = (table, query) => request(table, { query });
const insert = (table, rows, prefer = "return=representation") =>
  request(table, { method: "POST", body: Array.isArray(rows) ? rows : [rows], prefer });
const update = (table, query, patch) =>
  request(table, { method: "PATCH", query, body: patch, prefer: "return=representation" });
const remove = (table, query) => request(table, { method: "DELETE", query, prefer: "return=minimal" });

module.exports = { isConfigured, assertConfigured, request, select, insert, update, remove, MISSING_TABLE };
