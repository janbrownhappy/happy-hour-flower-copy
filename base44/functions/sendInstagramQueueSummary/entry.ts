import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { INSTAGRAM_POSTER_EMAIL } from '../../shared/instagramVenuePost.ts';

const QUEUE_URL = 'https://happyhourflower.com/admin?tab=instagram-queue';

// Daily email to the account owner: what's waiting in the Instagram review queue
// and what was decided in the last 24 hours.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const Post = base44.asServiceRole.entities.InstagramPost;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [pending, posted, skipped, failed] = await Promise.all([
      Post.count({ status: 'pending' }),
      Post.count({ status: 'posted', reviewed_at: { $gte: since } }),
      Post.count({ status: 'skipped', reviewed_at: { $gte: since } }),
      Post.count({ status: 'failed' }),
    ]);
    if (!pending && !posted && !skipped && !failed) return Response.json({ sent: false, reason: 'nothing to report' });

    const preview = pending
      ? (await Post.filter({ status: 'pending' }, { sort: 'queued_at', limit: 10 })).items || []
      : [];
    const cell = (n, label, color) => `<td style="padding:12px;text-align:center;border:1px solid #e5e7eb"><div style="font-size:24px;font-weight:700;color:${color}">${n}</div><div style="font-size:12px;color:#6b7280">${label}</div></td>`;
    const list = preview.map((p) => `<li style="margin-bottom:6px"><strong>${p.venue_name || 'Venue'}</strong>${p.venue_city ? ` <span style="color:#6b7280">· ${p.venue_city}</span>` : ''}</li>`).join('');

    const html = `<div style="font-family:Nunito,Arial,sans-serif;color:#111827;max-width:600px">
      <div style="background:#db8b0a;padding:16px 20px;display:flex;align-items:center">
        <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png" width="40" height="40" style="border-radius:50%;margin-right:10px" alt="">
        <strong style="color:#000;font-size:18px">Happy Hour Flower</strong>
      </div>
      <div style="padding:24px 20px">
        <h2 style="font-family:'Playfair Display',Georgia,serif;margin:0 0 6px">Instagram review queue</h2>
        <p style="color:#6b7280;margin:0 0 20px">${pending} new venue${pending === 1 ? ' is' : 's are'} waiting for your review.</p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px"><tr>
          ${cell(pending, 'Pending', '#db8b0a')}${cell(posted, 'Approved (24h)', '#059669')}${cell(skipped, 'Skipped (24h)', '#6b7280')}${cell(failed, 'Failed', '#dc2626')}
        </tr></table>
        ${list ? `<ul style="padding-left:18px;margin:0 0 20px">${list}</ul>${pending > preview.length ? `<p style="color:#6b7280">and ${pending - preview.length} more</p>` : ''}` : ''}
        <a href="${QUEUE_URL}" style="display:inline-block;background:#db8b0a;color:#000;padding:12px 24px;text-decoration:none;font-weight:700">Review the queue</a>
      </div>
    </div>`;

    const { error } = await createResend(Deno.env.get('RESEND_API_KEY')).emails.send({
      to: INSTAGRAM_POSTER_EMAIL,
      subject: `Instagram queue: ${pending} venue${pending === 1 ? '' : 's'} to review`,
      html,
    });
    if (error) throw new Error(error.message);
    return Response.json({ sent: true, pending, posted, skipped, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}