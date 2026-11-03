import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { secrets } from 'base44:runtime';

// Verifies a one-time ad purchase after the owner returns from Stripe Checkout.
// On success: marks the campaign paid + pending (awaiting admin approval) and
// fires the "ad received" confirmation email. Idempotent.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return Response.json({ error: 'sessionId is required' }, { status: 400 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.base44_user_id !== user.id) {
      return Response.json({ error: 'Session does not belong to this user' }, { status: 403 });
    }
    if (session.metadata?.purchase_type !== 'ad_campaign') {
      return Response.json({ error: 'Not an ad purchase session' }, { status: 400 });
    }
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return Response.json({ paid: false, status: session.payment_status });
    }

    const campaignId = session.metadata?.ad_campaign_id;
    if (!campaignId) return Response.json({ error: 'Session missing ad_campaign_id' }, { status: 400 });

    const campaign = await base44.entities.AdCampaign.get(campaignId).catch(() => null);
    if (!campaign) return Response.json({ error: 'Ad campaign not found' }, { status: 404 });

    // Idempotency — if already paid, just return success.
    if (campaign.payment_status === 'paid') {
      return Response.json({ paid: true, status: campaign.status, already: true });
    }

    const now = new Date().toISOString();
    await base44.entities.AdCampaign.update(campaignId, {
      payment_status: 'paid',
      status: 'pending',
      paid_at: now,
    });

    // Fire the confirmation email + admin notification (best effort).
    await base44.asServiceRole.functions.invoke('sendAdStatusEmail', {
      campaign_id: campaignId,
      kind: 'received',
      internal_key: secrets.get('HHF_WEBHOOK_KEY'),
    }).catch(() => {});

    return Response.json({ paid: true, status: 'pending' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});