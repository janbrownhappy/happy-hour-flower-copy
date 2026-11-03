import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns a single random ad to show a FREE consumer, or null when none apply.
// Eligibility:
//   - Caller must be a non-paying consumer (Profile.subscription_tier not premium/platinum).
//   - Ad must be approved, paid, within its date window, and match today's day type
//     (weekday ads on Mon-Fri, weekend ads on Sat/Sun).
// Rotation is uniformly random across the eligible pool (both tiers mixed).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ad: null });

    // Admins and venue owners never see consumer ads.
    if (user.role === 'admin' || user.role === 'venue_owner') {
      return Response.json({ ad: null, reason: 'not a consumer' });
    }

    // Free-tier check via Profile.
    let tier = 'free';
    let profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
    if (profiles.length === 0) profiles = await base44.entities.Profile.filter({ email: user.email });
    if (profiles[0]?.subscription_tier) tier = profiles[0].subscription_tier.toLowerCase();
    if (tier === 'premium' || tier === 'platinum') {
      return Response.json({ ad: null, reason: 'paying consumer' });
    }

    // Today's date + day type.
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dow = now.getDay(); // 0 Sun ... 6 Sat
    const todayTier = dow === 0 || dow === 6 ? 'weekend' : 'weekday';

    // Pull the approved/paid pool (service role — consumers can read approved ads,
    // but using service role keeps it simple and avoids RLS edge cases).
    const approved = await base44.asServiceRole.entities.AdCampaign.filter({
      status: 'approved',
      payment_status: 'paid',
      tier: todayTier,
    });

    const eligiblePaid = approved
      .filter((ad) => {
        const startOk = !ad.start_date || ad.start_date <= today;
        const endOk = !ad.end_date || ad.end_date >= today;
        return startOk && endOk && ad.image_url;
      })
      .map((ad) => ({
        type: 'paid',
        id: ad.id,
        venue_id: ad.venue_id,
        venue_name: ad.venue_name,
        title: ad.title,
        image_url: ad.image_url,
        click_url: ad.click_url || '',
      }));

    // Our own house ads (e.g. Happy Hour Flower) — no billing, mixed into the same pool.
    const houseAds = await base44.asServiceRole.entities.HouseAd.filter({ is_active: true });
    const eligibleHouse = houseAds
      .filter((ad) => ad.image_url)
      .map((ad) => ({
        type: 'house',
        id: ad.id,
        venue_id: '',
        venue_name: '',
        title: ad.title,
        image_url: ad.image_url,
        click_url: ad.click_url || '',
      }));

    const pool = [...eligiblePaid, ...eligibleHouse];
    if (pool.length === 0) return Response.json({ ad: null, reason: 'empty pool' });

    const pick = pool[Math.floor(Math.random() * pool.length)];
    return Response.json({ ad: pick });
  } catch (error) {
    return Response.json({ ad: null, error: error.message });
  }
});