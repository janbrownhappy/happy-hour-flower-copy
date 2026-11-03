import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

// Computes live Monthly Recurring Revenue from Stripe's active/trialing subscriptions.
// Normalizes yearly plans to a monthly figure.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const ownerEmail = (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase();
    if (!user || (user.role !== 'admin' && user.email?.toLowerCase() !== ownerEmail)) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

    let mrrCents = 0;
    let activeCount = 0;
    let currency = 'usd';
    let hasMore = true;
    let startingAfter = undefined;

    // Page through all active + trialing subscriptions
    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const sub of page.data) {
        activeCount++;
        for (const item of sub.items.data) {
          const price = item.price;
          if (!price || !price.recurring) continue;
          currency = price.currency || currency;
          const qty = item.quantity || 1;
          const amount = (price.unit_amount || 0) * qty;
          const interval = price.recurring.interval;
          const intervalCount = price.recurring.interval_count || 1;

          // Normalize everything to a monthly amount
          let monthly = amount;
          if (interval === 'year') monthly = amount / (12 * intervalCount);
          else if (interval === 'week') monthly = (amount * 52) / 12 / intervalCount;
          else if (interval === 'day') monthly = (amount * 365) / 12 / intervalCount;
          else if (interval === 'month') monthly = amount / intervalCount;

          mrrCents += monthly;
        }
      }

      hasMore = page.has_more;
      if (hasMore) startingAfter = page.data[page.data.length - 1].id;
    }

    return Response.json({
      mrr: Math.round(mrrCents) / 100,
      currency,
      active_subscriptions: activeCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});