// /api/create-subscription.js
const Stripe = require("stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  const { paymentMethodId, email, name, plan, billing } = req.body;

  if (!paymentMethodId || !email || !plan || !billing) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Yearly plans use a single price (no intro phase needed)
  const isYearly = billing === "yearly";

  try {
    // 1. Find or create Customer
    let customer;
    const existing = await stripe.customers.list({ email, limit: 1 });
    customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({ email, name: name || email });

    // 2. Attach PaymentMethod
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    let subscription;

    if (isYearly) {
      // ── Yearly: simple subscription, no intro phase ──────────────────
      const priceId = plan === "student"
        ? process.env.STRIPE_PRICE_STUDENT_YEARLY
        : process.env.STRIPE_PRICE_PRO_YEARLY;

      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_period_days: 3,
        payment_behavior: "default_incomplete",
        payment_settings: {
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
      });

    } else {
      // ── Monthly/Bimonthly: 2-phase schedule (intro → regular) ────────
      const introPriceId = plan === "student"
        ? process.env.STRIPE_PRICE_STUDENT_INTRO   // $15 / 2mo
        : process.env.STRIPE_PRICE_PRO_INTRO;      // $7 / mo

      const regularPriceId = plan === "student"
        ? process.env.STRIPE_PRICE_STUDENT_REGULAR // $20 / 2mo
        : process.env.STRIPE_PRICE_PRO_REGULAR;    // $12 / mo

      // How many billing cycles the intro price lasts:
      //   Pro: 3 months = 3 cycles (monthly)
      //   Student: 2 months = 1 cycle (every-2-months interval)
      const introCycles = plan === "student" ? 1 : 3;

      const schedule = await stripe.subscriptionSchedules.create({
        customer: customer.id,
        start_date: "now",
        end_behavior: "release", // after phases end, subscription continues normally
        phases: [
          {
            // Phase 1: 3-day trial + intro price
            items: [{ price: introPriceId, quantity: 1 }],
            trial: true,              // respects trial_period_days below
            iterations: introCycles,  // number of billing cycles at intro price
          },
          {
            // Phase 2: regular price forever
            items: [{ price: regularPriceId, quantity: 1 }],
          },
        ],
        default_settings: {
          payment_method_types: ["card"],
          // 3-day trial on the very first invoice
          trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        },
        expand: ["subscription.latest_invoice.payment_intent"],
      });

      subscription = schedule.subscription;
    }

    const paymentIntent = subscription?.latest_invoice?.payment_intent;

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
      status: subscription.status, // "trialing"
    });

  } catch (err) {
    console.error("[Stripe Error]", err.message);
    return res.status(402).json({ error: err.message || "Payment failed." });
  }
};
