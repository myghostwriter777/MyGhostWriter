/**
 * /api/history.js — cross-device History storage on Supabase (Postgres).
 *
 * Setup (one-time):
 *  1. Install "Supabase" from the Vercel Marketplace Storage tab (Free plan is
 *     plenty) and connect it to this project. The integration auto-injects
 *     SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *  2. Open the database (Vercel → Storage → your Supabase DB → Open in
 *     Supabase Studio) → SQL Editor → run create-history-table.sql once.
 *  3. Redeploy so the env vars take effect.
 *
 * Uses Supabase's REST interface (PostgREST) via plain fetch — NO npm package.
 * The endpoint contract is identical to the previous Redis version, so the
 * frontend needs no changes:
 *   GET  /api/history?email=x        → { items: [...] }  (newest first)
 *   POST /api/history {email, item}  → { ok: true }
 *
 * Each item is a ROW with primary key (email, id): re-POSTing the same item
 * (the frontend backfills on every History open) is a harmless upsert — the
 * database itself guarantees no duplicates.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Service-role key: server-side ONLY (bypasses row security). Never expose
// it to the browser — it lives here in a serverless function, which is safe.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Manga History stores small, compressed page previews alongside the text.
// Full-resolution artwork is never copied here; this ceiling only allows the
// lightweight previews to sync across the user's devices.
const MAX_ITEM_BYTES = 350_000;
const LIST_LIMIT = 200;

module.exports = async function handler(req, res) {
  // CORS + preflight — mirrors claude.js, which needed this for mobile browsers.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // req.body can arrive as a raw STRING on some Vercel configs (same issue
  // claude.js guards against) — parse defensively.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error:
        "History database not configured. Install 'Supabase' from the Vercel Marketplace Storage tab, connect it to this project, run create-history-table.sql in the SQL Editor, then redeploy.",
    });
  }

  const email = (req.method === "GET" ? req.query.email : body.email || "")
    .toString()
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const url =
        `${SUPABASE_URL}/rest/v1/history` +
        `?email=eq.${encodeURIComponent(email)}` +
        `&select=id,ts,mode,title,input,output` +
        `&order=ts.desc&limit=${LIST_LIMIT}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const msg = await r.text();
        // The most common first-run failure: the table hasn't been created yet.
        if (r.status === 404 || /relation .* does not exist|Could not find the table/i.test(msg)) {
          return res.status(500).json({
            error: "History table missing — run create-history-table.sql in the Supabase SQL Editor, then try again.",
          });
        }
        return res.status(500).json({ error: "Database error: " + msg.slice(0, 140) });
      }
      const rows = await r.json();
      return res.status(200).json({ items: rows });
    }

    if (req.method === "POST") {
      const item = body.item;
      if (!item || !item.mode || item.output == null || !item.id) {
        return res.status(400).json({ error: "item with id, mode and output is required" });
      }
      if (JSON.stringify(item).length > MAX_ITEM_BYTES) {
        return res.status(413).json({ error: "Item too large" });
      }
      const row = {
        email,
        id: String(item.id),
        ts: item.ts || new Date().toISOString(),
        mode: String(item.mode),
        title: item.title != null ? String(item.title) : null,
        input: item.input != null ? String(item.input) : null,
        output: String(item.output),
      };
      const r = await fetch(`${SUPABASE_URL}/rest/v1/history`, {
        method: "POST",
        headers: {
          ...headers,
          // Upsert on the (email,id) primary key: re-sending an existing item
          // updates it in place instead of erroring or duplicating.
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([row]),
      });
      if (!r.ok) {
        const msg = await r.text();
        if (r.status === 404 || /relation .* does not exist|Could not find the table/i.test(msg)) {
          return res.status(500).json({
            error: "History table missing — run create-history-table.sql in the Supabase SQL Editor, then try again.",
          });
        }
        return res.status(500).json({ error: "Database error: " + msg.slice(0, 140) });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const deleteAll = body.all === true;
      const id = body.id != null ? String(body.id).trim() : "";
      if (!deleteAll && !id) {
        return res.status(400).json({ error: "id is required" });
      }
      const url =
        `${SUPABASE_URL}/rest/v1/history?email=eq.${encodeURIComponent(email)}` +
        (deleteAll ? "" : `&id=eq.${encodeURIComponent(id)}`);
      const r = await fetch(url, {
        method: "DELETE",
        headers: { ...headers, Prefer: "return=minimal" },
      });
      if (!r.ok) {
        const msg = await r.text();
        return res.status(500).json({ error: "Database error: " + msg.slice(0, 140) });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[history error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
