import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { safeEqual } from '../../shared/automationAuth.ts';
import { createResend } from '../../shared/resendClient.ts';

/**
 * Inbound webhook receiver for Featurebase events (new feedback, comments,
 * status changes). Called WITHOUT app-user auth — so we verify authenticity
 * with the FEATUREBASE_WEBHOOK_SECRET before doing anything, then:
 *   1. write an admin-visible ActivityLog record (idempotent-ish, best effort)
 *   2. email the admin for high-signal events (new post / status change)
 *   3. append a note on the matching GHL contact (reuses syncToGHL)
 *
 * Register this endpoint in Featurebase → webhook settings:
 *   https://happyhourflower.base44.app/functions/featurebaseWebhook
 *
 * Featurebase can send the secret either as a signature header or as a bearer
 * token — we accept the shared secret via header only.
 */
export default async function (req) {
  try {
    const webhookSecret = secrets.get('FEATUREBASE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return Response.json({ error: 'FEATUREBASE_WEBHOOK_SECRET not configured' }, { status: 500 });
    }

    // Verify authenticity: accept the shared secret from a signature header,
    // or an Authorization bearer token. Never from the URL (query strings end up in logs).
    const provided =
      req.headers.get('x-featurebase-signature') ||
      req.headers.get('featurebase-signature') ||
      (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
      '';
    if (!safeEqual(provided, webhookSecret)) {
      return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    // Featurebase event shape varies by topic; normalize the common fields.
    const topic = body.topic || body.type || body.event || 'unknown';
    const data = body.data || body.object || body;
    const title = data?.title || data?.content || data?.post?.title || 'Featurebase activity';
    const status = data?.status || data?.state || '';
    const authorName = data?.user?.name || data?.author?.name || data?.submittedByName || 'A user';
    const authorEmail = data?.user?.email || data?.author?.email || data?.submittedByEmail || '';
    const permalink = data?.permalink || data?.url || data?.post?.permalink || '';

    const isNewPost = /post\.created|feedback\.created|post_created|new_post/i.test(topic);
    const isStatusChange = /status/i.test(topic);
    const isComment = /comment/i.test(topic);

    const summary =
      isNewPost
        ? `New feedback from ${authorName}: "${title}"`
        : isStatusChange
        ? `Status changed to "${status}" on: "${title}"`
        : isComment
        ? `New comment from ${authorName} on: "${title}"`
        : `Featurebase event (${topic}): "${title}"`;

    // 1. Admin-visible activity record (best effort — never block the webhook)
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        venue_id: 'featurebase',
        user_id: 'featurebase',
        user_name: authorName,
        action: 'settings_changed',
        description: summary,
        changes: { topic, status, permalink, email: authorEmail },
      });
    } catch (_) { /* logging optional */ }

    // 2. Email the admin for high-signal events
    if (isNewPost || isStatusChange) {
      try {
        const adminEmail = secrets.get('ADMIN_EMAIL');
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (adminEmail && resendKey) {
          const resend = createResend(resendKey);
          await resend.emails.send({
            from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
            to: [adminEmail],
            subject: `📣 ${summary}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
                <h2 style="color:#d97706;">Featurebase Update</h2>
                <p style="font-size:16px;color:#1c1917;">${summary}</p>
                ${authorEmail ? `<p style="color:#78716c;">From: ${authorName} (${authorEmail})</p>` : ''}
                ${status ? `<p style="color:#78716c;">Status: <strong>${status}</strong></p>` : ''}
                ${permalink ? `<p><a href="${permalink}" style="background:#d97706;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">View in Featurebase</a></p>` : ''}
              </div>`,
          });
        }
      } catch (_) { /* email optional — never block the webhook */ }
    }

    // 3. Append a note on the matching GHL contact (reuse syncToGHL)
    if (authorEmail) {
      try {
        await base44.asServiceRole.functions.invoke('syncToGHL', {
          email: authorEmail,
          name: authorName,
          trigger_key: 'featurebase_activity',
          internal_key: secrets.get('HHF_WEBHOOK_KEY'),
          fields: {
            featurebase_last_event: topic,
            featurebase_last_summary: summary,
            featurebase_last_permalink: permalink,
          },
        });
      } catch (_) { /* GHL sync optional */ }
    }

    return Response.json({ success: true, topic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}