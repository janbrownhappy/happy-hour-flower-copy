import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { trustedCollaborators } from '../../shared/venueAccess.ts';

// Verifies a Beacon & Geofencing add-on checkout leg and updates the venue.
//
//   step 'setup'        -> confirm the one-time setup fee was paid, mark
//                          geofence_setup_fee_paid + status 'pending_setup'
//   step 'subscription' -> confirm the recurring subscription is active, mark
//                          status 'active' with the period-end expiration
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return Response.json({ error: 'sessionId is required' }, { status: 400 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    if (session.metadata?.base44_user_id !== user.id) {
      return Response.json({ error: 'Session does not belong to this user' }, { status: 403 });
    }
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return Response.json({ paid: false, status: session.payment_status });
    }

    const venueId = session.metadata?.venue_id;
    const cycle = session.metadata?.billing_cycle === 'annual' ? 'annual' : 'monthly';
    if (!venueId) return Response.json({ error: 'Session is missing its venue_id' }, { status: 400 });

    // Verify permission to touch this venue.
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

    const now = new Date().toISOString();
    // The step comes only from what the Stripe session was actually created for.
    const purchaseType = session.metadata?.purchase_type;
    const resolvedStep = purchaseType === 'geofence_addon_setup' && session.mode === 'payment' ? 'setup'
      : purchaseType === 'geofence_addon_subscription' && session.mode === 'subscription' ? 'subscription'
      : null;
    if (!resolvedStep) {
      return Response.json({ error: 'This checkout is not a geofence add-on purchase' }, { status: 400 });
    }

    if (resolvedStep === 'setup') {
      if (session.payment_status !== 'paid') {
        return Response.json({ paid: false, status: session.payment_status });
      }
      await base44.asServiceRole.entities.Venue.update(venueId, {
        geofence_setup_fee_paid: true,
        geofence_setup_fee_paid_at: now,
        geofence_addon_status: 'pending_setup',
        geofence_addon_billing_cycle: cycle,
      });
      return Response.json({ paid: true, step: 'setup', next: 'subscription' });
    }

    // subscription leg
    let expiration = null;
    const sub = session.subscription;
    if (!sub || typeof sub !== 'object' || !['active', 'trialing'].includes(sub.status)) {
      return Response.json({ paid: false, status: sub?.status || 'no_subscription' });
    }
    if (sub.current_period_end) {
      expiration = new Date(sub.current_period_end * 1000).toISOString();
    }
    await base44.asServiceRole.entities.Venue.update(venueId, {
      geofence_addon_status: 'active',
      geofence_addon_billing_cycle: cycle,
      geofence_addon_expires_at: expiration,
    });
    return Response.json({ paid: true, step: 'subscription', addon_active: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});