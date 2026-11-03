import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { createResend } from '../../shared/resendClient.ts';
import { withConsumerFooterHtml } from '../../shared/consumerEmailFooter.ts';

// Sends a welcome email to a newly-created consumer profile.
// Fired by the "Send Consumer Welcome Email" entity automation on Profile create.
// Skips venue owners/admins and any profile without an email.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();

    // Resolve the profile data from the automation payload
    let data = body.data;
    if (body.payload_too_large && body.event?.entity_id) {
      data = await base44.asServiceRole.entities.get('Profile', body.event.entity_id);
    }
    if (!data) {
      return Response.json({ error: 'Missing profile data' }, { status: 400 });
    }

    const email = data.email || '';
    if (!email) {
      return Response.json({ skipped: true, reason: 'No email on profile' });
    }

    // Only welcome consumers — skip venue owners and admins
    if (data.role && data.role !== 'user' && data.role !== 'consumer') {
      return Response.json({ skipped: true, reason: `Not a consumer (role: ${data.role})` });
    }

    const firstName = (data.display_name || '').split(' ')[0] || 'there';

    // Pull the editable template from the DB
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ name: 'consumer_welcome' });
    const template = templates[0];
    if (!template || !template.is_active) {
      return Response.json({ skipped: true, reason: 'Template not found or inactive' });
    }

    const subject = template.subject.replace(/\{\{first_name\}\}/g, firstName);
    const htmlBody = withConsumerFooterHtml(template.body.replace(/\{\{first_name\}\}/g, firstName));

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const { error: sendError } = await resend.emails.send({
      from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
      to: [email],
      subject,
      html: htmlBody,
    });

    if (sendError) {
      return Response.json({ error: sendError.message }, { status: 500 });
    }

    return Response.json({ success: true, email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});