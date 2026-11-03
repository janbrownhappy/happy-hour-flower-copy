import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { secrets } from 'base44:runtime';
import { esc } from '../../shared/htmlEscape.ts';
import { DAY_MS, OUTREACH_RISK_CATEGORIES, RISK_LABELS } from '../../shared/churnScoring.ts';

// Score-driven prevention outreach. Runs on a schedule AFTER scoring. Sends, using the
// existing sendEmail function and throttled per account:
//   - Venue owners whose RetentionProfile is At Risk / High Risk / Critical  -> retention nudge
//   - Free consumers who entered Dormant or Churned                          -> win-back nudge
//   - Paid consumers flagged past_due (payment_failed signal)                -> payment recovery
// No other automated outbound. Admin/scheduled only.

const THROTTLE_MS = 14 * DAY_MS;
const APP_URL = 'https://happyhourflower.com';

function venueEmail(name, category, reason) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <h2 style="color:#b45309">Let's keep ${name} thriving</h2>
    <p>We noticed activity on <strong>${name}</strong> has slowed down (${RISK_LABELS[category] || category}).</p>
    <p style="margin:12px 0;padding:12px 16px;background:#fef9f0;border-left:3px solid #f5a623;border-radius:6px;color:#5a4a20">
      ${reason || 'Refresh your listing to bring customers back.'}</p>
    <p>A few minutes updating your deals and photos can make a real difference in views and visits.</p>
    <p style="text-align:center;margin:24px 0"><a href="${APP_URL}/venue-owner" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:700;display:inline-block">Update My Listing</a></p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— The Happy Hour Flower team</p>
  </div>`;
}

function winbackEmail(name) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <h2 style="color:#b45309">We miss you${name && name !== '—' ? ', ' + name : ''}!</h2>
    <p>The best happy hours near you are still pouring — and there are new deals since you last stopped by.</p>
    <p style="text-align:center;margin:24px 0"><a href="${APP_URL}/explore" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:700;display:inline-block">See What's New</a></p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— The Happy Hour Flower team</p>
  </div>`;
}

function paymentRecoveryEmail(name) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <h2 style="color:#b45309">Your payment didn't go through</h2>
    <p>Hi${name && name !== '—' ? ' ' + name : ''}, we couldn't process your latest Happy Hour Flower premium payment.</p>
    <p>Update your payment method to keep your premium perks — we'll retry automatically.</p>
    <p style="text-align:center;margin:24px 0"><a href="${APP_URL}/settings" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:700;display:inline-block">Update Payment</a></p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— The Happy Hour Flower team</p>
  </div>`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const dryRun = body.dryRun === true;
    const now = Date.now();
    const nowIso = new Date().toISOString();

    // Only accounts in an outreach risk band, or dormant/churned consumers.
    const atRisk = [];
    for (const cat of OUTREACH_RISK_CATEGORIES) {
      const rows = await base44.asServiceRole.entities.RetentionProfile.filter(
        { risk_category: cat }, '-churn_score', 5000
      ).catch(() => []);
      atRisk.push(...rows);
    }
    const dormant = await base44.asServiceRole.entities.RetentionProfile.filter(
      { entity_type: 'consumer', lifecycle_status: 'dormant' }, '-churn_score', 5000
    ).catch(() => []);
    const churned = await base44.asServiceRole.entities.RetentionProfile.filter(
      { entity_type: 'consumer', lifecycle_status: 'churned' }, '-churn_score', 5000
    ).catch(() => []);

    const sent = { venue_nudge: 0, winback: 0, payment_recovery: 0 };

    const throttled = (ts) => ts && (now - new Date(ts).getTime()) < THROTTLE_MS;

    const send = async (to, subject, html) => {
      if (dryRun || !to) return false;
      await base44.asServiceRole.functions.invoke('sendEmail', {
        to, from_name: 'Happy Hour Flower', subject, body: html, internal_key: secrets.get('HHF_WEBHOOK_KEY'),
      }).catch(() => {});
      return true;
    };

    // Venue owners in a risk band.
    for (const rp of atRisk) {
      if (rp.entity_type !== 'venue') continue;
      if (throttled(rp.winback_nudge_sent_at)) continue;
      const ok = await send(rp.email, `Let's keep ${rp.display_name || 'your venue'} thriving`,
        venueEmail(esc(rp.display_name || 'your venue'), rp.risk_category, esc(rp.primary_risk_reason || '')));
      if (ok) { sent.venue_nudge++; await base44.asServiceRole.entities.RetentionProfile.update(rp.id, { winback_nudge_sent_at: nowIso }).catch(() => {}); }
    }

    // Paid-consumer payment recovery (past due) — from risk band with payment_failed reason.
    for (const rp of atRisk) {
      if (rp.entity_type !== 'consumer' || !rp.is_paid) continue;
      const hasPaymentFail = (rp.primary_risk_reason || '').toLowerCase().includes('payment');
      if (!hasPaymentFail) continue;
      if (throttled(rp.payment_recovery_sent_at)) continue;
      const ok = await send(rp.email, 'Action needed: your Happy Hour Flower payment', paymentRecoveryEmail(rp.display_name && esc(rp.display_name)));
      if (ok) { sent.payment_recovery++; await base44.asServiceRole.entities.RetentionProfile.update(rp.id, { payment_recovery_sent_at: nowIso }).catch(() => {}); }
    }

    // Free-consumer win-back (dormant + churned).
    for (const rp of [...dormant, ...churned]) {
      if (rp.is_paid) continue;
      if (throttled(rp.winback_nudge_sent_at)) continue;
      const ok = await send(rp.email, 'We miss you at Happy Hour Flower', winbackEmail(rp.display_name && esc(rp.display_name)));
      if (ok) { sent.winback++; await base44.asServiceRole.entities.RetentionProfile.update(rp.id, { winback_nudge_sent_at: nowIso }).catch(() => {}); }
    }

    return Response.json({ success: true, dry_run: dryRun, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}