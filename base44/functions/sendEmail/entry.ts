import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { withConsumerFooterHtml } from '../../shared/consumerEmailFooter.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin / internal server-to-server use only — never a general-purpose relay.
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const payload = await req.json();
    const { to, subject, body, from_name, template_name, variables, audience } = payload;

    // If template_name provided, fetch and render template
    let emailSubject = subject;
    let emailBody = body;

    if (template_name) {
      const template = await base44.entities.EmailTemplate.filter({ name: template_name, is_active: true });
      if (!template || template.length === 0) {
        return Response.json({ error: `Template '${template_name}' not found` }, { status: 404 });
      }
      const t = template[0];
      emailSubject = t.subject;
      emailBody = t.body;

      // Replace variables
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailBody = emailBody.replace(regex, esc(value));
          emailSubject = emailSubject.replace(regex, String(value ?? ''));
        });
      }
    }

    // Consumer emails get the two required web links in the footer.
    if (audience === 'consumer') {
      emailBody = withConsumerFooterHtml(emailBody);
    }

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const { error: sendError } = await resend.emails.send({
      from: `${from_name || 'Happy Hour Flower'} <happy@updates.happyhourflower.com>`,
      to: [to],
      subject: emailSubject,
      html: emailBody,
    });

    if (sendError) {
      return Response.json({ error: sendError.message || 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});