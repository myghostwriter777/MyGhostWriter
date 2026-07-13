/**
 * /api/start-trial.js
 * Starts the cardless 3-day free trial and records it SERVER-SIDE in Stripe
 * customer metadata. This is the cross-device fix: previously the trial lived
 * only in the browser's localStorage, so signing in on a phone/tablet showed
 * "free" even mid-trial. Stripe already acts as our customer store, so the
 * grant is stamped on the customer record — no separate database needed.
 *
 * POST { email, plan: "pro" | "student" }
 * 200 → { trialEndsAt, plan }          trial granted (or already active)
 * 409 → { error: "trial_used" }        this email already consumed its trial
 */

// The server-side "stripe" package is a SEPARATE dependency from the
// frontend @stripe/* packages. If it isn't in package.json, requiring it at
// module load crashes the whole function into a non-JSON Vercel error page
// (seen as "Payment server error (500)"). Requiring it lazily inside the
// handler turns that crash into a readable JSON message naming the fix.
function loadStripeSdk() {
  try {
    return require("stripe");
  } catch (e) {
    return null;
  }
}


const TRIAL_DAYS = 3;

module.exports = async function handler(req, res) {
  // CORS + preflight — mirrors claude.js, which needed this for mobile browsers.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // BUG FIX: on some Vercel configs req.body arrives as a raw STRING, not a
  // parsed object (same issue claude.js already guards against). Without this,
  // every POST failed validation and history sync silently did nothing.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const { email, plan } = body;
  if (!email || !["pro", "student"].includes(plan)) {
    return res.status(400).json({ error: "email and plan (pro|student) are required" });
  }

  const Stripe = loadStripeSdk();
  if (!Stripe) {
    return res.status(500).json({
      error:
        "Server dependency missing: the 'stripe' package is not installed. Run `npm install stripe` in the project folder, then commit and push.",
    });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-04-10",
  });

  try {
    // Find or create the customer by email. Stripe's email filter is
    // CASE-SENSITIVE — try as-given, then lowercased, and always CREATE with
    // the lowercased form so future lookups are consistent.
    const emailNorm = email.trim().toLowerCase();
    let existing = await stripe.customers.list({ email: email.trim(), limit: 1 });
    if (existing.data.length === 0 && email.trim() !== emailNorm) {
      existing = await stripe.customers.list({ email: emailNorm, limit: 1 });
    }
    let customer = existing.data[0];

    if (customer) {
      const m = customer.metadata || {};
      // Edge case: trial already active (e.g. started on the laptop, then this
      // endpoint is hit again from the phone) → return the SAME end date so
      // both devices count down identically.
      if (m.trialEndsAt && new Date(m.trialEndsAt) > new Date()) {
        return res.status(200).json({ trialEndsAt: m.trialEndsAt, plan: m.trialPlan || plan });
      }
      // Trial consumed and expired → refuse a second one.
      if (m.trialUsed === "true") {
        return res.status(409).json({ error: "trial_used" });
      }
    } else {
      customer = await stripe.customers.create({ email: emailNorm });
    }

    // Backfill support: a device whose trial predates this server system can
    // send its ORIGINAL end date so every device shows the same countdown.
    // Clamped hard: must be in the future and at most TRIAL_DAYS away — a
    // forged far-future date gets ignored, not honored (edge case: abuse).
    let trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const requested = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
    if (
      requested && !isNaN(requested) &&
      requested.getTime() > Date.now() &&
      requested.getTime() <= Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
    ) {
      trialEndsAt = requested.toISOString();
    }
    await stripe.customers.update(customer.id, {
      metadata: {
        trialPlan: plan,
        trialEndsAt,
        trialUsed: "true", // Stripe metadata values are strings
      },
    });

    return res.status(200).json({ trialEndsAt, plan });
  } catch (err) {
    console.error("[start-trial error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
