import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { trustedCollaborators } from '../../shared/venueAccess.ts';

// Beacon & Geofencing add-on checkout (Platinum venues only).
//
// The purchase is TWO separate payments:
//   step 'setup' -> a one-time $249.90 setup-fee payment (mode: payment)
//   step 'subscription' -> the recurring add-on ($99.95/mo or $999.95/yr)
//
// The client calls this once with step='setup', completes that checkout, and
// on return calls again with step='subscription'. verifyGeofenceAddonCheckout
// confirms each leg and updates the venue's add-on status.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { venueId, billingCycle = 'monthly', step = 'setup', successUrl, cancelUrl } = await req.json();
    if (!venueId) return Response.json({ error: 'venueId is required' }, { status: 400 });

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';

    // Load the venue and verify permission + Platinum gating.
    const venue = await base44.entities.Venue.get(venueId).catch(() => null);
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });

    const isOwner = venue.owner_id === user.id;
    let isCollaborator = false;
    if (!isOwner && user.role !== 'admin') {
      const collabs = await trustedCollaborators(base44.asServiceRole, venue, { user_id: user.id });
      isCollaborator = collabs.some(c => c.role === 'owner' || c.role === 'editor');
    }
    if (!isOwner && !isCollaborator && user.role !== 'admin') {
      return Response.json({ error: 'You do not have permission to manage this venue' }, { status: 403 });
    }

    if (venue.subscription_tier !== 'platinum') {
      return Response.json({ error: 'The Beacon & Geofencing add-on is only available to Platinum venues.' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

    if (step === 'setup') {
      const setupPriceId = Deno.env.get('STRIPE_PRICE_GEOFENCE_SETUP_FEE');
      if (!setupPriceId) {
        return Response.json({ error: 'The setup-fee Stripe price is not configured yet.' }, { status: 400 });
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: setupPriceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          base44_user_id: user.id,
          purchase_type: 'geofence_addon_setup',
          venue_id: venueId,
          billing_cycle: cycle,
        },
        success_url: `${successUrl}?geofence_step=setup&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
      });
      return Response.json({ url: session.url, sessionId: session.id });
    }

    if (step === 'subscription') {
      // Must have paid the setup fee first.
      if (!venue.geofence_setup_fee_paid) {
        return Response.json({ error: 'The one-time setup fee must be paid before starting the subscription.' }, { status: 400 });
      }
      const subEnv = cycle === 'annual' ? 'STRIPE_PRICE_GEOFENCE_ADDON_ANNUAL' : 'STRIPE_PRICE_GEOFENCE_ADDON_MONTHLY';
      const subPriceId = Deno.env.get(subEnv);
      if (!subPriceId) {
        return Response.json({ error: `The ${cycle} add-on subscription price is not configured yet.` }, { status: 400 });
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: subPriceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          base44_user_id: user.id,
          purchase_type: 'geofence_addon_subscription',
          venue_id: venueId,
          billing_cycle: cycle,
        },
        subscription_data: {
          metadata: {
            base44_user_id: user.id,
            purchase_type: 'geofence_addon_subscription',
            venue_id: venueId,
            billing_cycle: cycle,
          },
        },
        success_url: `${successUrl}?geofence_step=subscription&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      });
      return Response.json({ url: session.url, sessionId: session.id });
    }

    return Response.json({ error: `Unknown step: ${step}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});