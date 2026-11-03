import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a3ab5990d62e026281b855e';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { check_in_id } = await req.json();
    if (!check_in_id) return Response.json({ error: 'Missing check_in_id' }, { status: 400 });

    // Load the shared crew check-in (RLS allows reading shared_with_crew records).
    const checkIn = await base44.entities.CheckIn.get(check_in_id);
    if (!checkIn) return Response.json({ error: 'Check-in not found' }, { status: 404 });
    if (!checkIn.shared_with_crew) {
      return Response.json({ error: 'This check-in is not shared with your crew' }, { status: 403 });
    }

    // Use the current app user's own Google Calendar connection.
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ error: 'not_connected' }, { status: 412 });
    }

    const start = checkIn.checked_in_at ? new Date(checkIn.checked_in_at) : new Date();
    const end = new Date(start.getTime() + 90 * 60 * 1000); // 90-minute event

    const friend = checkIn.user_name || 'A friend';
    const venue = checkIn.venue_name || 'a venue';
    const event = {
      summary: `${friend} @ ${venue}`,
      description: checkIn.note
        ? `Crew check-in from ${friend}: "${checkIn.note}"`
        : `${friend} checked in at ${venue} with your crew.`,
      location: venue,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: 'Failed to create calendar event', details: errText }, { status: 502 });
    }

    const created = await res.json();
    return Response.json({ success: true, event_link: created.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});