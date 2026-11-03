import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

// Creates a one-time Stripe Checkout session for a venue ad placement.
// The ad campaign record must already exist in 'draft' status; it only goes
// live after payment + admin approval. We snapshot the price onto the campaign.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaignId, successUrl, cancelUrl } = await req.json();
    if (!campaignId) return Response.json({ error: 'campaignId is required' }, { status: 400 });

    const campaign = await base44.entities.AdCampaign.get(campaignId).catch(() => null);
    if (!campaign) return Response.json({ error: 'Ad campaign not found' }, { status: 404 });

    // Only the campaign owner (or admin) may pay for it.
    if (campaign.created_by_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'You do not have permission to pay for this ad' }, { status: 403 });
    }

    // Verify the venue is premium/platinum — only paid tiers can buy ads.
    const venue = await base44.entities.Venue.get(campaign.venue_id).catch(() => null);
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });
    if (venue.subscription_tier !== 'premium' && venue.subscription_tier !== 'platinum') {
      return Response.json({ error: 'Only premium or platinum venues can purchase ads' }, { status: 403 });
    }

    // Load admin-configured pricing.
    const pricingList = await base44.asServiceRole.entities.AdPricing.list();
    const pricing = pricingList[0];
    if (!pricing) return Response.json({ error: 'Ad pricing has not been configured yet' }, { status: 400 });

    const isWeekend = campaign.tier === 'weekend';
    const priceId = isWeekend ? pricing.weekend_stripe_price_id : pricing.weekday_stripe_price_id;
    const amount = isWeekend ? pricing.weekend_price : pricing.weekday_price;
    if (!priceId) {
      return Response.json({ error: `No Stripe price configured for the ${campaign.tier} tier` }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        base44_user_id: user.id,
        purchase_type: 'ad_campaign',
        ad_campaign_id: campaignId,
        venue_id: campaign.venue_id,
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    // Snapshot the price we charged onto the campaign.
    await base44.entities.AdCampaign.update(campaignId, {
      price_paid: amount,
      stripe_session_id: session.id,
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});