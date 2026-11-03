import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

// Stripe webhook handler. Called by Stripe (no app-user auth), so we verify
// authenticity by re-fetching the event from Stripe's API using our secret key
// before acting on anything — a spoofed payload won't have a real event id.
//
// Handles:
//   invoice.payment_failed         -> mark venue billing_status = past_due, email owner
//   customer.subscription.deleted  -> downgrade venue to free, billing_status = canceled
//   customer.subscription.updated  -> if status past_due/unpaid -> past_due; if active -> active


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // Try both live and test signing secrets — Stripe live-mode and test-mode
    // endpoints each have their own secret, and the same event must verify
    // against whichever one signed it.
    const secrets = [
      Deno.env.get('STRIPE_WEBHOOK_SECRET_LIVE'),
      webhookSecret,
    ].filter(Boolean);

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event = null;

    // Primary: verify the Stripe signature against each configured signing secret.
    // Deno's crypto is async, so use constructEventAsync (not constructEvent).
    if (secrets.length && signature) {
      for (const secret of secrets) {
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
          break;
        } catch {
          // try the next secret
        }
      }
      if (!event) {
        return Response.json({ error: 'Signature verification failed' }, { status: 403 });
      }
    } else {
      // Fallback: no signing secret/signature available — re-fetch the event from
      // Stripe by id. A spoofed payload won't have a real event id.
      const incoming = JSON.parse(rawBody || 'null');
      if (!incoming || !incoming.id || !incoming.type) {
        return Response.json({ error: 'Invalid event payload' }, { status: 400 });
      }
      event = await stripe.events.retrieve(incoming.id).catch(() => null);
      if (!event || event.type !== incoming.type) {
        return Response.json({ error: 'Event could not be verified with Stripe' }, { status: 403 });
      }
    }

    // Subscription access (Venue tier/billing/geofence add-on, Profile premium) is
    // owned by RevenueCat (see revenuecatWebhook). This endpoint stays live for
    // one-time purchases (AdCampaign ads, PlatinumPlus setup fee), which are
    // confirmed by their own verify* functions, so subscription events are ignored.
    const isSubscriptionEvent = ['invoice.payment_failed', 'customer.subscription.deleted', 'customer.subscription.updated'].includes(event.type);
    const action = isSubscriptionEvent ? 'ignored_subscription_event_revenuecat_owns_access' : 'ignored';

    return Response.json({ received: true, event_type: event.type, action });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});