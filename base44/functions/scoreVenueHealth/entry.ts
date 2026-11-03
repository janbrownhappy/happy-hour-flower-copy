import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { createResend } from '../../shared/resendClient.ts';

// Scores every owned, active venue listing 0-100 based on profile completeness.
// Owners whose score is below 60 get a "boost your listing" nudge, throttled to once/14 days.
// Returns a summary; can be invoked manually (admin) or by a scheduled automation.

function scoreVenue(v) {
  const checks = [
    { key: 'description', label: 'Add a description', ok: !!(v.description && v.description.trim().length >= 40), weight: 15 },
    { key: 'photos', label: 'Add at least 3 photos', ok: (v.photo_urls || []).length >= 3, weight: 20 },
    { key: 'deals', label: 'Add happy hour deals', ok: (v.deals || []).length > 0 || Object.keys(v.deals_by_day || {}).length > 0, weight: 20 },
    { key: 'hours', label: 'Set your happy hour times', ok: !!(v.happy_hour_start && v.happy_hour_end) || Object.keys(v.day_schedules || {}).length > 0, weight: 15 },
    { key: 'contact', label: 'Add phone & website', ok: !!(v.phone && v.website), weight: 10 },
    { key: 'social', label: 'Link a social profile', ok: !!(v.instagram_url || v.facebook_url || v.tiktok_url || v.x_url), weight: 10 },
    { key: 'category', label: 'Set a category', ok: !!v.category, weight: 5 },
    { key: 'location', label: 'Pin your location on the map', ok: !!(v.lat && v.lng), weight: 5 },
  ];
  const score = checks.reduce((acc, c) => acc + (c.ok ? c.weight : 0), 0);
  const missing = checks.filter(c => !c.ok).map(c => c.label);
  return { score, missing };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const sendEmails = body.sendEmails !== false; // default true

    const venues = await base44.asServiceRole.entities.Venue.filter({ status: 'active' }, '-created_date', 5000);
    const owned = venues.filter(v => v.owner_id);

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const results = [];
    let nudged = 0;

    for (const v of owned) {
      const { score, missing } = scoreVenue(v);

      // Persist the score so the dashboard can show it
      if (v.health_score !== score) {
        await base44.asServiceRole.entities.Venue.update(v.id, { health_score: score }).catch(() => {});
      }

      results.push({ venue_id: v.id, name: v.name, score });

      if (!sendEmails || score >= 60) continue;

      // Throttle
      if (v.health_nudge_sent_at) {
        const last = new Date(v.health_nudge_sent_at).getTime();
        if (Date.now() - last < fourteenDays) continue;
      }

      const owner = await base44.asServiceRole.entities.User.get(v.owner_id).catch(() => null);
      if (!owner?.email) continue;

      const tips = missing.map(m => `<li>${m}</li>`).join('');
      await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: owner.email,
        subject: `Your ${v.name} listing is ${score}% complete — let's boost it`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <p style="color:#666;">Hi ${owner.full_name || 'there'},</p>
    <h2 style="color:#f5a623;margin:8px 0 8px;">${v.name} is ${score}% complete</h2>
    <p style="color:#555;">Listings with complete profiles get significantly more views and favorites. Here's what's left to finish yours:</p>
    <div style="margin:20px 0;padding:16px;background:#fef9f0;border-left:3px solid #f5a623;border-radius:6px;">
      <ul style="margin:0;padding-left:20px;line-height:1.9;color:#5a4a20;">${tips}</ul>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://happyhourflower.com/venue-owner" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Boost My Listing</a>
    </div>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>`,
      });

      await base44.asServiceRole.entities.Venue.update(v.id, {
        health_nudge_sent_at: new Date().toISOString(),
      });
      nudged++;
    }

    return Response.json({ success: true, scored: results.length, nudged, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});