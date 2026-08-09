/**
 * /api/create-subscription.js — COMPLETE REPLACEMENT
 * ─────────────────────────────────────────────────────
 * Creates a Stripe subscription for GhostwriterMe, or switches an existing
 * subscription to a different GhostwriterMe plan.
 *
 * Pricing model (confirmed in-app as of this version):
 *   Pro     monthly: $7/mo first 3 months (intro) → $12/mo after
 *   Master  monthly: $20/mo first 2 months (intro) → $30/mo after
 *   Pro     yearly:  $60/yr   (single price, no intro phase)
 *   Master  yearly:  $96/yr   (single price, no intro phase)
 *
 * NEW IN THIS VERSION — `skipTrial` flag:
 *   The frontend's cardless trial grants 3 free days with no Stripe
 *   involvement. When that trial expires and the user chooses "Continue",
 *   the frontend sends skipTrial:true so we DO NOT grant a second free
 *   period on top of the one already used. Without this, every post-trial
 *   convert would get 6 free days instead of 3 (a revenue leak).
 *
 * Required environment variables (Vercel → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY              sk_test_... / sk_live_...
 *   STRIPE_PRICE_PRO_MONTHLY       price id — $7/mo  (intro)
 *   STRIPE_PRICE_PRO_REGULAR       price id — $12/mo (post-intro)
 *   STRIPE_PRICE_PRO_YEARLY        price id — $60/yr
 *   STRIPE_PRICE_MASTER_MONTHLY    price id — $20/mo (intro)
 *   STRIPE_PRICE_MASTER_REGULAR    price id — $30/mo (post-intro)
 *   STRIPE_PRICE_MASTER_YEARLY     price id — $96/yr
 *
 * Legacy STRIPE_PRICE_STUDENT_* IDs remain read-only aliases in
 * /api/get-subscription.js so existing customers keep their entitlement.
 *
 * NOTE: these names intentionally match the PRICE_TO_PLAN map in
 * /api/get-subscription.js so both files read the same variables.
 * If your Vercel dashboard uses different names, either rename them
 * there or update both files consistently.
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
// How many billing cycles the intro price lasts before switching to regular:
//   Pro: 3 monthly cycles ($7 × 3), Master: 2 monthly cycles ($20 × 2)
const INTRO_CYCLES = { pro: 3, student: 2 };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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

  // req.body can arrive as a raw STRING on some Vercel configs — the exact
  // issue that broke /api/history in this project. Parse defensively BEFORE
  // destructuring, otherwise every field reads undefined (or worse, throws
  // outside the try/catch and Vercel returns a non-JSON crash page, which the
  // frontend used to misreport as "Network error").
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { paymentMethodId, email, name, plan, billing, skipTrial = false } =
    body || {};

  // ── Input validation ─────────────────────────────────────────────
  // Edge case: reject unknown plan/billing values outright rather than
  // falling through to an undefined price id and a confusing Stripe error.
  // Normalize the email once here — Stripe email lookups are case-sensitive,
  // so a customer created as "Ghosty@x.com" is invisible to a later lookup
  // for "ghosty@x.com" (this silently showed paying users as free at login).
  const emailNorm = typeof email === "string" ? email.trim().toLowerCase() : email;

  if (!paymentMethodId || !email || !plan || !billing) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (!["pro", "student"].includes(plan)) {
    return res.status(400).json({ error: `Unknown plan: ${plan}` });
  }
  if (!["monthly", "yearly"].includes(billing)) {
    return res.status(400).json({ error: `Unknown billing interval: ${billing}` });
  }

  const PRICES = {
    pro: {
      intro:   process.env.STRIPE_PRICE_PRO_MONTHLY,
      regular: process.env.STRIPE_PRICE_PRO_REGULAR,
      yearly:  process.env.STRIPE_PRICE_PRO_YEARLY,
    },
    student: {
      intro:   process.env.STRIPE_PRICE_MASTER_MONTHLY,
      regular: process.env.STRIPE_PRICE_MASTER_REGULAR,
      yearly:  process.env.STRIPE_PRICE_MASTER_YEARLY || process.env.STRIPE_PRICE_STUDENT_YEARLY,
    },
  };

  // Edge case: fail fast with a clear message if an env var is missing,
  // instead of letting Stripe return an opaque "No such price: undefined".
  const needed =
    billing === "yearly"
      ? [PRICES[plan].yearly]
      : [PRICES[plan].intro, PRICES[plan].regular];
  if (needed.some((p) => !p)) {
    return res.status(500).json({
      error: `Server misconfiguration: missing Stripe price env var for ${plan}/${billing}.`,
    });
  }

  try {
    // ── 1. Find or create the Stripe Customer by email ─────────────
    let customer;
    let existing = await stripe.customers.list({ email: emailNorm, limit: 1 });
    if (existing.data.length === 0 && email !== emailNorm) {
      // fallback: customer created before normalization existed
      existing = await stripe.customers.list({ email, limit: 1 });
    }
    customer =
      existing.data.length > 0
        ? existing.data[0]
        : await stripe.customers.create({
            email: emailNorm,
            name: name || emailNorm,
            metadata: { source: "ghostwriterme" },
          });

    // ── 2. Guard against duplicate subscriptions ────────────────────
    // Double-clicking Confirm must never create a second live subscription.
    // A different requested plan is a legitimate Pro <-> Master change and
    // must update the current subscription in place. "student" remains the
    // internal entitlement id for backward compatibility.
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });
    const alreadyActive = subs.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );
    if (alreadyActive) {
      const currentPriceId = alreadyActive.items?.data?.[0]?.price?.id;
      const masterAndLegacyPriceIds = [
        PRICES.student.intro,
        PRICES.student.regular,
        PRICES.student.yearly,
        process.env.STRIPE_PRICE_STUDENT_MONTHLY,
        process.env.STRIPE_PRICE_STUDENT_REGULAR,
        process.env.STRIPE_PRICE_STUDENT_YEARLY,
      ].filter(Boolean);
      const currentPlan = alreadyActive.metadata?.plan ||
        (masterAndLegacyPriceIds.includes(currentPriceId) ? "student" : "pro");
      const currentBilling = alreadyActive.metadata?.billing ||
        ([
          PRICES[currentPlan].yearly,
          currentPlan === "student" ? process.env.STRIPE_PRICE_STUDENT_YEARLY : null,
        ].filter(Boolean).includes(currentPriceId) ? "yearly" : "monthly");

      if (currentPlan === plan && currentBilling === billing) {
        return res.status(409).json({
          error: `Your ${plan} ${billing} subscription is already active.`,
          subscriptionId: alreadyActive.id,
          status: alreadyActive.status,
        });
      }

      // The checkout form has already created a fresh PaymentMethod. Make it
      // the default before invoicing the proration so SCA/3DS can be completed
      // by the existing client-secret flow below.
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // Monthly intro subscriptions are managed by a schedule. Stripe doesn't
      // allow direct item edits while a schedule owns the subscription, so
      // release the schedule first. Releasing keeps the live subscription in
      // place; it does not cancel customer access.
      const scheduleId = typeof alreadyActive.schedule === "string"
        ? alreadyActive.schedule
        : alreadyActive.schedule?.id;
      if (scheduleId) {
        const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
        if (["active", "not_started"].includes(schedule.status)) {
          await stripe.subscriptionSchedules.release(scheduleId);
        }
      }

      // Pending subscription updates only accept invoice/proration-related
      // fields. Apply payment configuration separately so an explicitly set
      // subscription payment method cannot override the fresh customer default,
      // and resume renewal if the customer had previously scheduled a cancel.
      await stripe.subscriptions.update(alreadyActive.id, {
        default_payment_method: paymentMethodId,
        cancel_at_period_end: false,
      });

      const liveSubscription = await stripe.subscriptions.retrieve(alreadyActive.id);
      const itemId = liveSubscription.items?.data?.[0]?.id;
      if (!itemId) throw new Error("The active subscription has no billable item to update.");

      // Existing subscribers switch to the regular monthly price (introductory
      // prices and trials are for new subscriptions). `always_invoice` plus a
      // pending update bills the prorated difference now and applies the plan
      // only when payment succeeds, as recommended by Stripe.
      const targetPrice = billing === "yearly" ? PRICES[plan].yearly : PRICES[plan].regular;
      const updated = await stripe.subscriptions.update(alreadyActive.id, {
        items: [{ id: itemId, price: targetPrice, quantity: 1 }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        metadata: { plan, billing, skipTrial: "true", source: "ghostwriterme", changedFrom: currentPlan },
        expand: ["latest_invoice.payment_intent"],
      });
      const updatePaymentIntent = updated?.latest_invoice?.payment_intent;
      return res.status(200).json({
        subscriptionId: updated.id,
        clientSecret: updatePaymentIntent?.client_secret ?? null,
        status: updated.status,
        changedPlan: true,
      });
    }

    // ── 3. Attach the PaymentMethod and set it as default ──────────
    // attach() is idempotent for an already-attached PM on this customer.
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // ── 4. Create the subscription ──────────────────────────────────
    let subscription;

    if (billing === "yearly") {
      // Single price, no intro phase. Trial only when skipTrial is false.
      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: PRICES[plan].yearly }],
        ...(skipTrial ? {} : { trial_period_days: TRIAL_DAYS }),
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
        metadata: { plan, billing, skipTrial: String(skipTrial), source: "ghostwriterme" },
      });
    } else {
      // Monthly: two-phase schedule — intro price for N cycles, then
      // regular price indefinitely. end_behavior:"release" means once the
      // phases finish, the subscription keeps renewing at the last price
      // with no further schedule management needed.
      const schedule = await stripe.subscriptionSchedules.create({
        customer: customer.id,
        start_date: "now",
        end_behavior: "release",
        phases: [
          {
            items: [{ price: PRICES[plan].intro, quantity: 1 }],
            iterations: INTRO_CYCLES[plan],
            // Edge case: trial_end must fall inside this phase. 3 days is
            // safely within the 2-3 month intro window. Omitted entirely
            // when skipTrial — first invoice then charges immediately.
            ...(skipTrial
              ? {}
              : { trial_end: Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60 }),
          },
          {
            items: [{ price: PRICES[plan].regular, quantity: 1 }],
          },
        ],
        expand: ["subscription.latest_invoice.payment_intent"],
        metadata: { plan, billing, skipTrial: String(skipTrial), source: "ghostwriterme" },
      });
      subscription = schedule.subscription;
    }

    // ── 5. Respond ───────────────────────────────────────────────────
    // clientSecret is non-null when the bank requires 3D Secure — the
    // frontend already handles that via stripe.confirmCardPayment().
    // With skipTrial:true the first invoice charges NOW, so 3DS is far
    // more likely here than on a $0 trial start.
    const paymentIntent = subscription?.latest_invoice?.payment_intent;

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
      status: subscription.status, // "trialing" (with trial) or "active"/"incomplete" (skipTrial)
    });
  } catch (err) {
    console.error("[create-subscription]", err.message);
    // 402 keeps the frontend's error path simple: card-level failures and
    // Stripe rejections both surface as a user-visible message.
    return res.status(402).json({ error: err.message || "Payment failed." });
  }
};

// Extend the execution budget: this handler makes 6+ sequential Stripe API
// calls, which can exceed Vercel's default 10s function limit on a slow
// moment — the timeout page is non-JSON and looked like a "network error"
// to the payment form. Harmless if the platform ignores this property.
module.exports.config = { maxDuration: 30 };
