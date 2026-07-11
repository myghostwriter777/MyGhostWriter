/**
 * /api/history.js — cross-device History storage on Upstash Redis.
 *
 * Setup: install "Upstash for Redis" from the Vercel Marketplace (Storage tab).
 * The integration automatically injects KV_REST_API_URL / KV_REST_API_TOKEN
 * (some flows use the UPSTASH_REDIS_REST_* names — both are accepted below).
 * Uses Upstash's plain REST interface via fetch, so NO npm package is needed.
 *
 * GET  /api/history?email=x          → { items: [...] }   (empty array if none)
 * POST /api/history {email, item}    → { ok: true, count }
 *
 * One key per user: gwm:hist:<email> holding a JSON array, newest first,
 * capped at 200 items and ~800KB (Upstash free-tier request ceiling is 1MB).
 */

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const MAX_ITEMS = 200;
const MAX_BYTES = 800_000;     // total array budget
const MAX_ITEM_BYTES = 100_000; // single item budget (longest study guides fit easily)

// Single Redis command via Upstash REST: body is the command as a JSON array,
// e.g. ["GET", "key"] — avoids URL-encoding pitfalls with emails in key names.
async function redis(command) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.result;
}

module.exports = async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({
      error:
        "History database not configured. Install 'Upstash for Redis' from the Vercel Marketplace Storage tab, connect it to this project, then redeploy.",
    });
  }

  const email = (req.method === "GET" ? req.query.email : req.body?.email || "")
    .toString()
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  const key = "gwm:hist:" + email;

  try {
    if (req.method === "GET") {
      const raw = await redis(["GET", key]);
      return res.status(200).json({ items: raw ? JSON.parse(raw) : [] });
    }

    if (req.method === "POST") {
      const item = req.body?.item;
      if (!item || !item.mode || item.output == null) {
        return res.status(400).json({ error: "item with mode and output is required" });
      }
      if (JSON.stringify(item).length > MAX_ITEM_BYTES) {
        return res.status(413).json({ error: "Item too large" });
      }

      const raw = await redis(["GET", key]);
      const items = raw ? JSON.parse(raw) : [];

      // Dedupe: the frontend backfills old local items on every History open,
      // so the same item can legitimately be POSTed twice — keep one copy.
      const dk = (it) => String(it.id) + "|" + (it.ts || "");
      if (items.some((it) => dk(it) === dk(item))) {
        return res.status(200).json({ ok: true, count: items.length });
      }

      let next = [item, ...items]
        .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
        .slice(0, MAX_ITEMS);

      // Size guard: drop oldest entries until the array fits the byte budget
      // (edge case: 200 maximum-length study guides would exceed 1MB).
      let payload = JSON.stringify(next);
      while (payload.length > MAX_BYTES && next.length > 1) {
        next = next.slice(0, next.length - 10);
        payload = JSON.stringify(next);
      }

      await redis(["SET", key, payload]);
      return res.status(200).json({ ok: true, count: next.length });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[history error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
