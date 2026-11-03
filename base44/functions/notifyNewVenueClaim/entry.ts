import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';
import { createResend } from '../../shared/resendClient.ts';
import { renderEmailTemplate } from '../../shared/renderEmailTemplate.ts';

const ADMIN_NOTIFY_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@happyhourflower.com';
const FROM = 'Happy Hour Flower <happy@updates.happyhourflower.com>';

const relationshipLabels = {
  owner: 'Owner',
  general_manager: 'General Manager',
  marketing_manager: 'Marketing Manager',
  authorized_representative: 'Authorized Representative',
  other: 'Other',
};

const row = (label, value) =>
  value ? `<tr><td style="padding:8px 0;color:#666;">${label}</td><td style="padding:8px 0;">${esc(value)}</td></tr>` : '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const payload = await req.json();

    // Triggered by entity automation on VenueClaimRequest create
    const claimId = payload?.event?.entity_id;
    let claim = payload?.data;
    if (!claim && claimId) {
      claim = await base44.asServiceRole.entities.VenueClaimRequest.get(claimId);
    }
    if (!claim) {
      return Response.json({ error: 'No claim data' }, { status: 400 });
    }

    const isAdd = claim.request_type === 'add';
    // Mark the claimed venue as pending so the listing reflects the open claim.
    if (!isAdd && claim.venue_id && claim.status === 'pending') {
      const v = await base44.asServiceRole.entities.Venue.get(claim.venue_id).catch(() => null);
      if (v && v.verification_status !== 'verified') {
        await base44.asServiceRole.entities.Venue.update(v.id, { verification_status: 'pending_approval' });
      }
    }
    const submissionType = isAdd ? 'business submission' : 'venue claim';
    const detailsTable = [
      row(isAdd ? 'Business' : 'Venue', claim.venue_name),
      row('Address', claim.proposed_address),
      row('City', claim.proposed_city),
      row('Category', claim.proposed_category),
      row('Phone', claim.proposed_phone),
    ].join('');

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const results = { admin: 'skipped', claimant: 'skipped' };

    // 1. Admin alert (content editable in Admin → Automatic Emails)
    const adminEmail = await renderEmailTemplate(base44, 'new_venue_claim_alert', {
      venue_name: claim.venue_name || 'Unknown venue',
      claimant_name: claim.claimant_name || '—',
      claimant_email: claim.claimant_email || '—',
      claimant_phone: claim.claimant_phone || '—',
      relationship: relationshipLabels[claim.relationship] || claim.relationship || '—',
      submission_type: submissionType,
      details_table: detailsTable,
      app_url: 'https://happyhourflower.com/admin',
    });
    if (adminEmail) {
      await resend.emails.send({
        from: FROM,
        to: [ADMIN_NOTIFY_EMAIL],
        subject: adminEmail.subject,
        html: adminEmail.html,
      });
      results.admin = 'sent';
    }

    // 2. Acknowledgment to the submitter
    if (claim.claimant_email) {
      const ack = await renderEmailTemplate(base44, 'venue_submission_received', {
        claimant_name: claim.claimant_name || 'there',
        venue_name: claim.venue_name || 'your business',
        submission_type: isAdd ? 'submission' : 'claim',
        details_table: detailsTable,
      });
      if (ack) {
        await resend.emails.send({
          from: FROM,
          to: [claim.claimant_email],
          subject: ack.subject,
          html: ack.html,
        });
        results.claimant = 'sent';
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});