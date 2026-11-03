import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * One-time import: pulls subscribers from the MailerLite "PreLaunch Subscribers"
 * group and adds any that aren't already in the app's Waitlist entity.
 *
 * Admin-only. Idempotent — re-running it will only add emails that are missing,
 * so it's safe to run twice without creating duplicates.
 */
const GROUP_ID = '190806259391268797'; // PreLaunch Subscribers

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = Deno.env.get('MAILERLITE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'MAILERLITE_API_KEY not configured' }, { status: 500 });
    }

    // 1. Fetch all subscribers in the group (paginate through MailerLite's cursor API)
    const subscribers = [];
    let cursor = null;
    do {
      const url = new URL(`https://connect.mailerlite.com/api/groups/${GROUP_ID}/subscribers`);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return Response.json({ error: body?.message || 'MailerLite error', details: body }, { status: res.status });
      }
      (body.data || []).forEach((s) => subscribers.push(s));
      cursor = body?.meta?.next_cursor || null;
    } while (cursor);

    // 2. Build a set of emails already in the Waitlist (lowercased)
    const existing = await base44.asServiceRole.entities.Waitlist.list('-created_date', 10000);
    const existingEmails = new Set(
      existing.map((w) => (w.email || '').trim().toLowerCase()).filter(Boolean)
    );

    // 3. Create Waitlist records for subscribers not already present
    let imported = 0;
    let skipped = 0;
    for (const sub of subscribers) {
      const email = (sub.email || '').trim().toLowerCase();
      if (!email) { skipped++; continue; }
      if (existingEmails.has(email)) { skipped++; continue; }

      const f = sub.fields || {};
      await base44.asServiceRole.entities.Waitlist.create({
        email,
        first_name: f.name || f.first_name || '',
        last_name: f.last_name || '',
        zip_code: f.zip || f.zip_code || '',
        source: 'mailerlite_prelaunch_import',
        email_consent: true,
        submitted_at: sub.subscribed_at || new Date().toISOString(),
      });
      existingEmails.add(email);
      imported++;
    }

    return Response.json({
      success: true,
      total_in_group: subscribers.length,
      imported,
      skipped,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});