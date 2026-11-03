import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Fires on new/updated Review. If a venue hits 3+ approved 5-star reviews in the
// last 7 days, email the owner a "capitalize on your momentum" nudge (once per week).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const payload = await req.json();

    const { event, data, payload_too_large } = payload;
    const entityId = event?.entity_id;

    let review = data;
    if (payload_too_large && entityId) {
      review = await base44.asServiceRole.entities.Review.get(entityId).catch(() => null);
    }
    if (!review || !review.venue_id) {
      return Response.json({ skipped: true, reason: 'No review data' });
    }

    // Only consider approved 5-star reviews as momentum triggers
    if (review.status !== 'approved' || Number(review.rating) < 5) {
      return Response.json({ skipped: true, reason: 'Not an approved 5-star review' });
    }

    const venue = await base44.asServiceRole.entities.Venue.get(review.venue_id).catch(() => null);
    if (!venue || !venue.owner_id) {
      return Response.json({ skipped: true, reason: 'Venue has no owner' });
    }

    // Count approved 5-star reviews for this venue in the last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allReviews = await base44.asServiceRole.entities.Review.filter({
      venue_id: review.venue_id,
      status: 'approved',
    });
    const recentFiveStar = allReviews.filter(r =>
      Number(r.rating) >= 5 && new Date(r.created_date).getTime() >= sevenDaysAgo
    );

    if (recentFiveStar.length < 3) {
      return Response.json({ skipped: true, reason: `Only ${recentFiveStar.length} recent 5-star reviews` });
    }

    // Throttle: don't email more than once every 7 days per venue
    if (venue.momentum_email_sent_at) {
      const last = new Date(venue.momentum_email_sent_at).getTime();
      if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) {
        return Response.json({ skipped: true, reason: 'Already nudged this week' });
      }
    }

    const owner = await base44.asServiceRole.entities.User.get(venue.owner_id).catch(() => null);
    if (!owner?.email) {
      return Response.json({ skipped: true, reason: 'No owner email' });
    }

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
      to: owner.email,
      subject: `🔥 ${venue.name} is on a roll — capitalize on your momentum!`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/c16180f90_Untitled1024x1024px512x512px256x256px.gif" alt="Happy Hour Flower" style="width:64px;height:64px;border-radius:50%;" />
    </div>
    <p style="color:#666;">Hi ${esc(owner.full_name || 'there')},</p>
    <h2 style="color:#f5a623;margin:8px 0 16px;">${esc(venue.name)} just earned ${recentFiveStar.length} five-star reviews this week! ⭐⭐⭐⭐⭐</h2>
    <p>Your customers are loving you right now — this is the perfect moment to keep the traffic flowing.</p>
    <div style="margin:20px 0;padding:16px;background:#fef9f0;border-left:3px solid #f5a623;border-radius:6px;">
      <p style="margin:0 0 8px;font-weight:700;color:#8a6900;">Ideas to capitalize:</p>
      <ul style="margin:0;padding-left:20px;line-height:1.9;color:#5a4a20;">
        <li>Launch a limited-time special to reward your fans</li>
        <li>Add a new happy hour deal for the coming week</li>
        <li>Promote an upcoming event on your listing</li>
      </ul>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://happyhourflower.com/venue-owner" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Add a New Deal</a>
    </div>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>`,
    });

    await base44.asServiceRole.entities.Venue.update(venue.id, {
      momentum_email_sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true, sentTo: owner.email, count: recentFiveStar.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});