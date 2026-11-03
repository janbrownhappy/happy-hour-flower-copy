import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';
import { createResend } from '../../shared/resendClient.ts';
import { withConsumerFooterHtml } from '../../shared/consumerEmailFooter.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();

    const { email, first_name } = body.data || {};

    if (!email) {
      return Response.json({ error: 'No email provided' }, { status: 400 });
    }

    const firstName = first_name || 'there';

    // Fetch template from DB so it can be edited in the admin dashboard
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ name: 'waitlist_confirmation' });
    const template = templates[0];

    if (!template || !template.is_active) {
      return Response.json({ skipped: true, reason: 'Template not found or inactive' });
    }

    // Replace {{first_name}} variable
    const subject = template.subject.replace(/\{\{first_name\}\}/g, firstName);
    const htmlBody = withConsumerFooterHtml(template.body.replace(/\{\{first_name\}\}/g, esc(firstName)));

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

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});