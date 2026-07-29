/**
 * /api/upsert-user.js — upserts a row into Supabase `public.users` on every
 * Google sign-in. Uses Supabase's REST interface (PostgREST) via plain
 * fetch, matching api/history.js — NO npm package, even though
 * @supabase/supabase-js is in package.json.
 *
 * On conflict (existing email) only name, google_id and last_login_at are
 * updated: plan, trial_used and notices_accepted are intentionally left out
 * of the upsert payload so PostgREST's generated ON CONFLICT DO UPDATE
 * never touches them.
 *
 * POST { email, name, googleId } → { ok: true }
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Service-role key: server-side ONLY. Never expose with a REACT_APP_ prefix.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  // CORS + preflight — mirrors claude.js, which needed this for mobile browsers.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse body safely — req.body can arrive as a raw STRING on some Vercel
  // configs (same issue claude.js guards against).
  let body = req.body;
  if (!body) {
    return res.status(400).json({ error: "Request body is empty" });
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Could not parse request body as JSON" });
    }
  }

  const rawEmail = body.email;
  if (!rawEmail || typeof rawEmail !== "string") {
    return res.status(400).json({ error: "email is required" });
  }
  if (!rawEmail.includes("@")) {
    return res.status(400).json({ error: 'email must contain "@" — received: "' + rawEmail + '"' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error:
        "User database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Project Settings → Environment Variables, then redeploy.",
    });
  }

  const email = rawEmail.trim().toLowerCase();
  const row = {
    email,
    name: body.name != null ? String(body.name) : null,
    google_id: body.googleId != null ? String(body.googleId) : null,
    last_login_at: new Date().toISOString(),
  };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        // Upsert on the email primary key: only the columns in `row` are
        // ever written on conflict — plan/trial_used/notices_accepted are
        // never included here, so they're never overwritten.
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([row]),
    });
    if (!r.ok) {
      const msg = await r.text();
      if (r.status === 404 || /relation .* does not exist|Could not find the table/i.test(msg)) {
        return res.status(500).json({
          error: "users table missing — run supabase/users.sql in the Supabase SQL Editor, then try again.",
        });
      }
      return res.status(500).json({ error: "Database error: " + msg.slice(0, 140) });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[upsert-user error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
