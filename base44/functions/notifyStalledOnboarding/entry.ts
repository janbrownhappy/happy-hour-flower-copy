import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Daily scheduled task: find venue owners who were approved 48h+ ago but still
// have an incomplete listing (status not 'active' / draft / pending), and nudge them.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const now = Date.now();
    const TWO_DAYS = 48 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    // Approved claims — these owners should have finished setup
    const approvedClaims = await base44.asServiceRole.entities.VenueClaimRequest.filter({ status: 'approved' });

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    let nudged = 0;

    for (const claim of approvedClaims) {
      const reviewedAt = claim.reviewed_at ? new Date(claim.reviewed_at).getTime() : null;
      if (!reviewedAt) continue;

      const elapsed = now - reviewedAt;
      // Only nudge between 48h and 7 days after approval (avoid pestering forever)
      if (elapsed < TWO_DAYS || elapsed > SEVEN_DAYS) continue;

      // Don't re-send if we already nudged this claim
      if (claim.onboarding_nudge_sent_at) continue;

      // Check whether the venue listing looks incomplete
      const venue = await base44.asServiceRole.entities.Venue.get(claim.venue_id).catch(() => null);
      if (!venue) continue;

      const hasPhotos = Array.isArray(venue.photo_urls) && venue.photo_urls.length > 0;
      const hasDeals = (Array.isArray(venue.deals) && venue.deals.length > 0) ||
        (venue.deals_by_day && Object.keys(venue.deals_by_day).length > 0);
      const hasDescription = venue.description && venue.description.trim().length > 0;
      const isComplete = venue.status === 'active' && hasPhotos && hasDeals && hasDescription;
      if (isComplete) continue;

      if (!claim.claimant_email) continue;

      await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: claim.claimant_email,
        subject: `Let's finish setting up ${claim.venue_name} 🌸`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/c16180f90_Untitled1024x1024px512x512px256x256px.gif" alt="Happy Hour Flower" style="width:64px;height:64px;border-radius:50%;" />
    </div>
    <p style="color:#666;">Hi ${esc(claim.claimant_name || 'there')},</p>
    <h2 style="color:#f5a623;margin:8px 0 16px;">Your venue is almost ready!</h2>
    <p>You claimed <strong>${esc(claim.venue_name)}</strong> but haven't finished setting up your listing yet. A complete profile gets discovered far more often — here's what's left:</p>
    <ul style="padding-left:20px;line-height:2;">
      ${hasDescription ? '' : '<li>✏️ Add a short <strong>description</strong> of your venue</li>'}
      ${hasDeals ? '' : '<li>🍸 Set your <strong>happy hour deals &amp; schedule</strong></li>'}
      ${hasPhotos ? '' : '<li>📸 Upload <strong>photos</strong> to attract customers</li>'}
      <li>✅ Submit your listing for review</li>
    </ul>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://happyhourflower.com/venue-owner" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Finish My Setup</a>
    </div>
    <p style="font-size:14px;color:#666;">It only takes a few minutes, and we're here if you need help.</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>`,
      });

      await base44.asServiceRole.entities.VenueClaimRequest.update(claim.id, {
        onboarding_nudge_sent_at: new Date().toISOString(),
      });
      nudged++;
    }

    return Response.json({ success: true, nudged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});