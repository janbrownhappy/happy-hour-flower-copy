import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.5.0';

// Opens a Stripe customer portal session for the signed-in user's email.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { returnUrl } = await req.json().catch(() => ({}));
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return Response.json({ error: 'No billing account found for your email yet.' }, { status: 404 });
    const session = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: returnUrl || undefined });
    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}