import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { createResend } from '../../shared/resendClient.ts';
import { esc } from '../../shared/htmlEscape.ts';
import { canActForVenue } from '../../shared/venueAccess.ts';

// Emails a newly issued wallet pass to its consumer. Recipient and content come
// from the stored PassInstance; only the issuer or a venue manager may send it, once.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { passInstanceId } = await req.json().catch(() => ({}));
    if (!passInstanceId) return Response.json({ error: 'passInstanceId is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const inst = await svc.entities.PassInstance.get(passInstanceId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!inst) return Response.json({ error: 'Not found' }, { status: 404 });
    const allowed = inst.created_by_id === user.id || (await canActForVenue(svc, user, inst.venue_id));
    if (!allowed) return Response.json({ error: 'Not found' }, { status: 404 });
    if (inst.delivery_status === 'sent') return Response.json({ error: 'This pass was already emailed' }, { status: 409 });
    if (!inst.consumer_email) return Response.json({ error: 'Pass has no consumer email' }, { status: 400 });

    const template = await svc.entities.WalletPass.get(inst.wallet_pass_id).catch(() => null);
    const venueName = template?.venue_name || 'Your venue';
    const label = inst.pass_type === 'coupon' ? 'Coupon' : 'Loyalty Card';
    const passUrl = /^https:\/\//i.test(inst.apple_pass_url || '') ? inst.apple_pass_url : '';

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;">
        <h2 style="color:#1a1a2e;">Your Happy Hour Flower Pass is Ready!</h2>
        <p>Hi ${esc(inst.consumer_name || 'there')},</p>
        <p><strong>${esc(venueName)}</strong> has issued you a <strong>${label}</strong>: <em>${esc(template?.title || '')}</em></p>
        ${passUrl ? `
        <div style="text-align:center;margin:24px 0;">
          <a href="${esc(passUrl)}" style="background:#f5a623;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">Add to Apple Wallet or Google Wallet</a>
        </div>
        <p style="font-size:13px;color:#666;">Tap the button above on your phone to save the pass. Works on both iPhone (Apple Wallet) and Android (Google Wallet).</p>
        ` : ''}
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-size:13px;color:#444;">Your redemption code:</p>
          <p style="font-size:22px;font-family:monospace;font-weight:bold;color:#f5a623;letter-spacing:4px;margin:8px 0;">${esc(inst.redemption_code)}</p>
          <p style="margin:0;font-size:12px;color:#888;">Present this at the venue to redeem.</p>
        </div>
        <p style="font-size:12px;color:#999;">Happy Hour Flower. Find your happy place, FAST.</p>
      </div>`;

    const resend = createResend(secrets.get('RESEND_API_KEY'));
    const { error } = await resend.emails.send({
      to: [inst.consumer_email],
      subject: `Your ${label} from ${venueName}`,
      html,
    });
    if (error) {
      await svc.entities.PassInstance.update(inst.id, { delivery_status: 'failed' });
      return Response.json({ error: error.message || 'Failed to send email' }, { status: 502 });
    }
    await svc.entities.PassInstance.update(inst.id, { delivery_status: 'sent' });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}