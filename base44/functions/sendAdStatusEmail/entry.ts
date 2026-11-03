import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { createResend } from '../../shared/resendClient.ts';

// Sends ad lifecycle emails to a venue owner using editable EmailTemplate records.
//   kind = 'received' -> template 'ad_received'  (after successful payment)
//   kind = 'approved' -> template 'ad_approved'  (after admin approval)
// For 'received', also notifies the admin that a new ad is awaiting review.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const { campaign_id, kind } = await req.json();
    if (!campaign_id || !kind) {
      return Response.json({ error: 'campaign_id and kind are required' }, { status: 400 });
    }

    const campaign = await base44.asServiceRole.entities.AdCampaign.get(campaign_id).catch(() => null);
    if (!campaign) return Response.json({ error: 'Ad campaign not found' }, { status: 404 });

    // Resolve owner email
    let email = campaign.owner_email || '';
    let ownerName = '';
    const ownerId = campaign.owner_id || campaign.created_by_id;
    if (ownerId) {
      const owners = await base44.asServiceRole.entities.User.filter({ id: ownerId });
      if (owners[0]) {
        email = email || owners[0].email || '';
        ownerName = owners[0].full_name || '';
      }
    }
    if (!email) return Response.json({ skipped: true, reason: 'No owner email found' });

    const templateName = kind === 'approved' ? 'ad_approved' : kind === 'rejected' ? 'ad_rejected' : 'ad_received';
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ name: templateName });
    const template = templates[0];
    if (!template || !template.is_active) {
      return Response.json({ skipped: true, reason: 'Template not found or inactive' });
    }

    const firstName = (ownerName || '').split(' ')[0] || 'there';
    const venueName = campaign.venue_name || 'your venue';
    const fill = (s) => (s || '')
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{venue_name\}\}/g, venueName)
      .replace(/\{\{ad_title\}\}/g, campaign.title || 'your ad')
      .replace(/\{\{tier\}\}/g, campaign.tier === 'weekend' ? 'Weekend' : 'Weekday')
      .replace(/\{\{admin_note\}\}/g, campaign.admin_note || '');

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const { error: sendError } = await resend.emails.send({
      from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
      to: [email],
      subject: fill(template.subject),
      html: fill(template.body),
    });
    if (sendError) return Response.json({ error: sendError.message }, { status: 500 });

    // On 'received', also ping the admin that a new ad needs review.
    if (kind === 'received') {
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        await resend.emails.send({
          from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
          to: [adminEmail],
          subject: `New ad awaiting review — ${venueName}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
            <h2>New ad submitted for review</h2>
            <p><strong>${venueName}</strong> purchased a <strong>${campaign.tier === 'weekend' ? 'Weekend' : 'Weekday'}</strong> ad placement.</p>
            ${campaign.image_url ? `<img src="${campaign.image_url}" alt="Ad creative" style="max-width:100%;border-radius:8px;margin:12px 0" />` : ''}
            <p>Review and approve it in the Admin dashboard under <strong>Ads → Approvals</strong>.</p>
          </div>`,
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, email, kind });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});