/**
 * /api/get-subscription.js
 * Checks Stripe for an active subscription by customer email.
 * Called every time the user logs in or the app loads.
 *
 * Returns: { plan: "pro" | "student" | "free", billing, renewsAt, cancelAtPeriodEnd }
 *
 * NOTE ON THE FILENAME: this file MUST be named get-subscription.js.
 * Vercel routes serverless functions by filename, and the frontend's
 * checkSubscription() fetches /api/get-subscription — the previous file
 * was named get-subcription.js (missing "s"), so every plan-restore call
 * 404'd silently and paying customers on a new device appeared as Free.
 */

const Stripe = require("stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-04-10",
  });

  try {
    // 1. Find the Stripe customer by email.
    // Stripe's email filter is CASE-SENSITIVE (item-1 bug: "Ghosty@x.com" at
    // purchase vs "ghosty@x.com" at login found no customer → user shown as
    // free). Try as-given first, then lowercased.
    let customers = await stripe.customers.list({ email: email.trim(), limit: 1 });
    if (customers.data.length === 0 && email.trim() !== email.trim().toLowerCase()) {
      customers = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 1 });
    }

    if (customers.data.length === 0) {
      // No Stripe customer found — they are on free plan
      return res.status(200).json({ plan: "free" });
    }

    const customer = customers.data[0];

    // 2. Get their active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
      expand: ["data.items.data.price"],
    });

    // 3. Find the most relevant subscription
    //    Priority: trialing > active > past_due > everything else
    const priority = ["trialing", "active", "past_due"];
    let subscription = null;

    for (const status of priority) {
      subscription = subscriptions.data.find((s) => s.status === status);
      if (subscription) break;
    }

    if (!subscription) {
      // No Stripe subscription — but a cardless trial may be recorded in
      // customer metadata (written by /api/start-trial). Surfacing it here is
      // the cross-device fix: a phone/tablet login restores the same trial
      // that was started on the laptop instead of showing "free".
      const m = customer.metadata || {};
      if (m.trialEndsAt && new Date(m.trialEndsAt) > new Date()) {
        return res.status(200).json({
          plan: m.trialPlan === "student" ? "student" : "pro",
          status: "local_trial",
          trialEndsAt: m.trialEndsAt,
          trialUsed: true,
          billing: null,
          renewsAt: null,
          cancelAtPeriodEnd: false,
        });
      }
      // Trial consumed and expired (or never started) — tell the frontend
      // either way so a second device can't start a duplicate trial.
      return res.status(200).json({ plan: "free", trialUsed: m.trialUsed === "true" });
    }

    // 4. Determine plan from the price ID
    const priceId = subscription.items.data[0]?.price?.id;

    const PRICE_TO_PLAN = {
      [process.env.STRIPE_PRICE_PRO_MONTHLY]:  { plan: "pro",     billing: "monthly" },
      [process.env.STRIPE_PRICE_PRO_REGULAR]:  { plan: "pro",     billing: "monthly" },
      [process.env.STRIPE_PRICE_PRO_YEARLY]:   { plan: "pro",     billing: "yearly"  },
      [process.env.STRIPE_PRICE_STUDENT_MONTHLY]: { plan: "student", billing: "monthly" },
      [process.env.STRIPE_PRICE_STUDENT_REGULAR]: { plan: "student", billing: "monthly" },
      [process.env.STRIPE_PRICE_STUDENT_YEARLY]:  { plan: "student", billing: "yearly"  },
    };

    let matched = PRICE_TO_PLAN[priceId];

    // Edge case: unknown price ID (env var typo in Vercel, or a price
    // created after this deploy). Previously this defaulted straight to
    // pro/monthly, which would silently DOWNGRADE a Student subscriber's
    // feature access while they keep paying the Student price.
    // create-subscription.js stamps metadata:{plan,billing} on every
    // subscription it creates, so trust that before guessing — and log
    // loudly either way so the misconfiguration is visible in Vercel logs.
    if (!matched) {
      const metaPlan = subscription.metadata?.plan;
      const metaBilling = subscription.metadata?.billing;
      if (metaPlan === "pro" || metaPlan === "student") {
        console.warn(
          `[get-subscription] Price ${priceId} not in PRICE_TO_PLAN — ` +
          `recovered plan "${metaPlan}" from subscription metadata. ` +
          `Check the STRIPE_PRICE_* env vars in Vercel.`
        );
        matched = {
          plan: metaPlan,
          billing: metaBilling === "yearly" ? "yearly" : "monthly",
        };
      } else {
        console.warn(
          `[get-subscription] Price ${priceId} not in PRICE_TO_PLAN and no ` +
          `usable metadata — defaulting to pro/monthly. ` +
          `Check the STRIPE_PRICE_* env vars in Vercel.`
        );
        matched = { plan: "pro", billing: "monthly" };
      }
    }

    // 5. Return the plan details
    return res.status(200).json({
      plan: matched.plan,
      billing: matched.billing,
      renewsAt: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      status: subscription.status, // "trialing", "active", etc.
    });

  } catch (err) {
    console.error("[get-subscription error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
