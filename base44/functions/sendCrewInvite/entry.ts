import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { withConsumerFooterHtml } from '../../shared/consumerEmailFooter.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Normalize a phone number to E.164 (defaults to US +1 when no country code present)
function toE164(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAILY_EMAIL_LIMIT = 10;
const DAILY_SMS_LIMIT = 5;

// Sends a "join my crew" invite to a friend via email or SMS.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { method, email, phone, name } = await req.json();

    // Crew is a premium feature.
    const profiles = await base44.asServiceRole.entities.Profile.filter({ created_by_id: user.id });
    const profile = profiles[0];
    if (!(profile?.is_premium || profile?.subscription_status === 'active')) {
      return Response.json({ error: 'Crew invites are a Premium feature.' }, { status: 403 });
    }
    if (method === 'email' && !EMAIL_RE.test(String(email || '').trim())) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Server-side daily quota (stored where users can't edit it).
    const quotaKey = `crew_invite_quota:${user.id}`;
    const today = new Date().toISOString().slice(0, 10);
    const quotaRow = (await base44.asServiceRole.entities.AppSetting.filter({ key: quotaKey }))[0];
    let quota = { day: today, email: 0, sms: 0 };
    try { const q = JSON.parse(quotaRow?.value_string || '{}'); if (q.day === today) quota = { ...quota, ...q }; } catch { /* reset */ }
    const limit = method === 'sms' ? DAILY_SMS_LIMIT : DAILY_EMAIL_LIMIT;
    if ((quota[method] || 0) >= limit) {
      return Response.json({ error: `You've reached today's limit of ${limit} ${method === 'sms' ? 'text' : 'email'} invites. Try again tomorrow.` }, { status: 429 });
    }
    const countInvite = async () => {
      quota[method] = (quota[method] || 0) + 1;
      const value_string = JSON.stringify(quota);
      if (quotaRow) await base44.asServiceRole.entities.AppSetting.update(quotaRow.id, { value_string });
      else await base44.asServiceRole.entities.AppSetting.create({ key: quotaKey, value_string });
    };

    // Prefer the sender's real name; fall back to their Profile display name, then email.
    let inviterName = user.full_name;
    if (!inviterName) {
      const profiles = await base44.asServiceRole.entities.Profile.filter({ created_by_id: user.id });
      inviterName = profiles[0]?.display_name;
    }
    inviterName = inviterName || user.email || 'A friend';
    const appUrl = 'https://happyhourflower.com';
    const friend = name ? name : 'there';

    if (method === 'email') {
      if (!email) return Response.json({ error: 'An email address is required.' }, { status: 400 });
      const resend = createResend(Deno.env.get('RESEND_API_KEY'));
      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f9fafb;margin:0;padding:0">
  <div style="max-width:520px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px">🌸 You're invited to a Crew!</h1>
    </div>
    <div style="padding:30px;text-align:center">
      <p style="font-size:16px;color:#374151">Hi ${esc(friend)},</p>
      <p style="font-size:15px;color:#374151;line-height:1.6">
        <strong>${esc(inviterName)}</strong>${user.email ? ` (${esc(user.email)})` : ''} wants you to join their crew on <strong>Happy Hour Flower</strong> —
        discover the best happy hours nearby, see where your crew is checking in, and never miss a deal.
      </p>
      <a href="${appUrl}" style="background:#f59e0b;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;margin-top:16px">
        Join the Crew
      </a>
    </div>
    <div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">
      © ${new Date().getFullYear()} Happy Hour Flower
    </div>
  </div>
</body></html>`;
      const { error: sendError } = await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: [email],
        subject: `${inviterName} invited you to their Happy Hour crew 🌸`,
        html: withConsumerFooterHtml(html),
      });
      if (sendError) return Response.json({ success: false, error: sendError.message }, { status: 500 });
      await countInvite();
      return Response.json({ success: true, sentTo: email });
    }

    if (method === 'sms') {
      const to = toE164(phone);
      if (!to || !/^\+\d{10,15}$/.test(to)) return Response.json({ error: 'A valid phone number is required.' }, { status: 400 });
      // Count the attempt up front: SMS is billed even if delivery later fails.
      await countInvite();
      const appId = Deno.env.get('ONESIGNAL_APP_ID');
      const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` };

      // Register/upsert the phone as an SMS subscriber so OneSignal can deliver to it.
      await fetch('https://onesignal.com/api/v1/players', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ app_id: appId, device_type: 14, identifier: to, external_user_id: to }),
      }).catch(() => {});

      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          app_id: appId,
          name: 'Crew Invite',
          contents: { en: `${inviterName} invited you to their Happy Hour crew on Happy Hour Flower! Join here: https://happyhourflower.com` },
          channel_for_external_user_ids: 'sms',
          include_phone_numbers: [to],
        }),
      });
      const result = await res.json();
      const ok = res.status >= 200 && res.status < 300 && !result.errors;
      if (!ok) return Response.json({ success: false, error: 'SMS failed', onesignal: result }, { status: 500 });
      return Response.json({ success: true, sentTo: to });
    }

    return Response.json({ error: 'Invalid invite method.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});