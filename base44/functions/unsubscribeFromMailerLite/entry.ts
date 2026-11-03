import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

/**
 * Marks a subscriber as UNSUBSCRIBED in MailerLite (status -> "unsubscribed").
 * This is a soft action — the subscriber record is kept in MailerLite for history,
 * it is never hard-deleted. Wired to Venue/Profile delete automations so that
 * removing a record in the app deactivates the matching MailerLite subscriber.
 *
 * Triggered by an entity DELETE automation, so it reads the email from the
 * deleted record's payload (event + data / old_data).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const apiKey = Deno.env.get('MAILERLITE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'MAILERLITE_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();

    // Resolve the email from either a direct call or a delete automation payload.
    let email = body.email || '';
    const event = body.event;
    if (event && event.entity_name) {
      let data = body.data || body.old_data;
      if (body.payload_too_large && event.entity_id) {
        // Record is already deleted on a delete event, so old_data is the source of truth.
        data = body.old_data || data;
      }
      if (data) email = data.email || '';
    }

    email = (email || '').trim();
    if (!email) {
      return Response.json({ success: false, skipped: 'no_email' });
    }

    // 1. Look up the subscriber by email to get their MailerLite id.
    const lookupRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (lookupRes.status === 404) {
      return Response.json({ success: true, skipped: 'not_in_mailerlite', email });
    }

    const lookupBody = await lookupRes.json().catch(() => ({}));
    if (!lookupRes.ok) {
      return Response.json({ success: false, status: lookupRes.status, error: lookupBody?.message || 'MailerLite lookup error', details: lookupBody }, { status: lookupRes.status });
    }

    const subscriberId = lookupBody?.data?.id;
    if (!subscriberId) {
      return Response.json({ success: true, skipped: 'not_in_mailerlite', email });
    }

    // 2. Set status to "unsubscribed" (soft — keeps the record, no hard delete).
    const updateRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ status: 'unsubscribed' }),
      }
    );

    const updateBody = await updateRes.json().catch(() => ({}));
    if (!updateRes.ok) {
      return Response.json({ success: false, status: updateRes.status, error: updateBody?.message || 'MailerLite update error', details: updateBody }, { status: updateRes.status });
    }

    return Response.json({ success: true, email, subscriber_id: subscriberId, status: 'unsubscribed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});