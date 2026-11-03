import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Sends a welcome email to the owner of a newly-created venue.
// Fired by the "Send Venue Welcome Email" entity automation on Venue create.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();

    // Always load the stored venue — never trust venue fields from the request body.
    const venueId = body.event?.entity_id || body.data?.id;
    const venue = venueId ? await base44.asServiceRole.entities.Venue.get(venueId).catch(() => null) : null;
    if (!venue) {
      return Response.json({ error: 'Missing venue data' }, { status: 400 });
    }

    // Resolve the owner's email — prefer the linked owner, fall back to creator
    const ownerId = venue.owner_id || venue.created_by_id;
    let email = '';
    let ownerName = '';
    if (ownerId) {
      const owners = await base44.asServiceRole.entities.User.filter({ id: ownerId });
      if (owners[0]) {
        email = owners[0].email || '';
        ownerName = owners[0].full_name || '';
      }
    }
    if (!email) {
      return Response.json({ skipped: true, reason: 'No owner email found' });
    }

    const firstName = (ownerName || '').split(' ')[0] || 'there';
    const venueName = venue.name || 'your venue';

    // Pull the editable template from the DB
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ name: 'venue_welcome' });
    const template = templates[0];
    if (!template || !template.is_active) {
      return Response.json({ skipped: true, reason: 'Template not found or inactive' });
    }

    const fill = (s, escape = true) => s
      .replace(/\{\{first_name\}\}/g, escape ? esc(firstName) : firstName)
      .replace(/\{\{venue_name\}\}/g, escape ? esc(venueName) : venueName);

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const { error: sendError } = await resend.emails.send({
      from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
      to: [email],
      subject: fill(template.subject, false),
      html: fill(template.body),
    });

    if (sendError) {
      return Response.json({ error: sendError.message }, { status: 500 });
    }

    return Response.json({ success: true, email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});