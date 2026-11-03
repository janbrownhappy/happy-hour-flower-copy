import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Records an impression or click for an ad and bumps the campaign's counters.
// Called by the consumer ad overlay. Best-effort, never blocks the UI.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const { ad_campaign_id, event_type, ad_type } = await req.json();
    if (!ad_campaign_id || !event_type) {
      return Response.json({ error: 'ad_campaign_id and event_type are required' }, { status: 400 });
    }
    if (event_type !== 'impression' && event_type !== 'click') {
      return Response.json({ error: 'invalid event_type' }, { status: 400 });
    }

    const field = event_type === 'click' ? 'click_count' : 'impression_count';

    // House ads (our own promos) — bump the HouseAd counters only, no billing/impression FK.
    if (ad_type === 'house') {
      const houseAd = await base44.asServiceRole.entities.HouseAd.get(ad_campaign_id).catch(() => null);
      if (!houseAd) return Response.json({ error: 'House ad not found' }, { status: 404 });
      await base44.asServiceRole.entities.HouseAd.update(ad_campaign_id, {
        [field]: (houseAd[field] || 0) + 1,
      });
      return Response.json({ ok: true });
    }

    const campaign = await base44.asServiceRole.entities.AdCampaign.get(ad_campaign_id).catch(() => null);
    if (!campaign) return Response.json({ error: 'Ad campaign not found' }, { status: 404 });

    await base44.asServiceRole.entities.AdImpression.create({
      ad_campaign_id,
      venue_id: campaign.venue_id,
      owner_id: campaign.owner_id || '',
      consumer_id: user?.id || '',
      event_type,
      shown_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AdCampaign.update(ad_campaign_id, {
      [field]: (campaign[field] || 0) + 1,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});