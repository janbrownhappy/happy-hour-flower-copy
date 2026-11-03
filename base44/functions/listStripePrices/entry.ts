import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });

    const result = prices.data.map((p) => ({
      price_id: p.id,
      product_id: typeof p.product === 'object' ? p.product.id : p.product,
      product_name: typeof p.product === 'object' ? p.product.name : null,
      amount: p.unit_amount,
      currency: p.currency,
      interval: p.recurring?.interval || null,
      interval_count: p.recurring?.interval_count || null,
    }));

    return Response.json({ count: result.length, prices: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});