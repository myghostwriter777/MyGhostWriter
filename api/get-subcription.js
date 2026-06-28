/**
 * /api/get-subscription.js
 * Checks Stripe for an active subscription by customer email.
 * Called every time the user logs in or the app loads.
 *
 * Returns: { plan: "pro" | "student" | "free", billing, renewsAt, cancelAtPeriodEnd }
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
    // 1. Find the Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });

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
      subscription = subscriptions.data.find(s => s.status === status);
      if (subscription) break;
    }

    if (!subscription) {
      // No active subscription found
      return res.status(200).json({ plan: "free" });
    }

    // 4. Determine plan from the price ID
    const priceId = subscription.items.data[0]?.price?.id;

    const PRICE_TO_PLAN = {
      [process.env.STRIPE_PRICE_PRO_MONTHLY]:  { plan: "pro",     billing: "monthly"  },
      [process.env.STRIPE_PRICE_PRO_REGULAR]:  { plan: "pro",     billing: "monthly"  },
      [process.env.STRIPE_PRICE_PRO_YEARLY]:   { plan: "pro",     billing: "yearly"   },
      [process.env.STRIPE_PRICE_STUDENT_MONTHLY]: { plan: "student", billing: "monthly" },
      [process.env.STRIPE_PRICE_STUDENT_REGULAR]: { plan: "student", billing: "monthly" },
      [process.env.STRIPE_PRICE_STUDENT_YEARLY]:  { plan: "student", billing: "yearly"  },
    };

    const matched = PRICE_TO_PLAN[priceId] || { plan: "pro", billing: "monthly" };

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