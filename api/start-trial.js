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

const Stripe = require("stripe");

const TRIAL_DAYS = 3;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, plan } = req.body || {};
  if (!email || !["pro", "student"].includes(plan)) {
    return res.status(400).json({ error: "email and plan (pro|student) are required" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-04-10",
  });

  try {
    // Find or create the customer by email (same lookup create-subscription uses)
    const existing = await stripe.customers.list({ email, limit: 1 });
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
      customer = await stripe.customers.create({ email });
    }

    // Backfill support: a device whose trial predates this server system can
    // send its ORIGINAL end date so every device shows the same countdown.
    // Clamped hard: must be in the future and at most TRIAL_DAYS away — a
    // forged far-future date gets ignored, not honored (edge case: abuse).
    let trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const requested = req.body?.trialEndsAt ? new Date(req.body.trialEndsAt) : null;
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
