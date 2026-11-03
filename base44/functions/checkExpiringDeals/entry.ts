import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Fetch all approved listings that have an expiry date
    const allListings = await base44.asServiceRole.entities.Listing.list();
    const expiring = allListings.filter(l => {
      if (!l.expires_at) return false;
      if (l.status !== 'approved') return false;
      const exp = new Date(l.expires_at);
      // Within the next 48 hours and not already expired
      if (exp < now || exp > in48h) return false;
      // De-duplicate: skip if we already sent a notification today
      if (l.expiry_notified_at) {
        const lastNotified = new Date(l.expiry_notified_at);
        const hoursSince = (now - lastNotified) / (1000 * 60 * 60);
        if (hoursSince < 20) return false; // don't re-notify within 20 hours
      }
      return true;
    });

    if (expiring.length === 0) {
      return Response.json({ success: true, checked: allListings.length, expiring: 0 });
    }

    // Resolve venue owners for each expiring listing
    const allVenues = await base44.asServiceRole.entities.Venue.list();
    const venuesById = Object.fromEntries(allVenues.map(v => [v.id, v]));

    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));

    const apiKey = Deno.env.get('MAILERSEND_API_KEY');
    let notified = 0;
    const errors = [];

    for (const listing of expiring) {
      // Resolve venue: prefer venue_ref_id (Base44 id), fall back to matching venue_id
      const venue = listing.venue_ref_id
        ? venuesById[listing.venue_ref_id]
        : allVenues.find(v => String(v.venue_id) === String(listing.venue_id));

      const venueName = venue?.name || listing.venue_name || 'your venue';
      const expiresFormatted = new Date(listing.expires_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });

      // Determine recipients: venue owner + admin fallback
      const recipients = [];
      if (venue?.owner_id && usersById[venue.owner_id]?.email) {
        recipients.push(usersById[venue.owner_id]);
      }
      // Always CC the admin contact
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@happyhourflower.com';
      recipients.push({ email: adminEmail, full_name: 'Admin' });

      const subject = `⏰ Deal expiring soon: "${listing.name}" at ${venueName}`;
      const htmlBody = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#d97706">⏰ Deal Expiring in 48 Hours</h2>
          <p>Hi ${recipients[0]?.full_name || 'there'},</p>
          <p>The following deal at <strong>${venueName}</strong> is set to expire on <strong>${expiresFormatted}</strong>:</p>
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;font-size:16px;font-weight:bold">${listing.name}</p>
            ${listing.deals?.length ? `<ul style="margin:8px 0 0">${listing.deals.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
            ${listing.days?.length ? `<p style="margin:8px 0 0;color:#6b7280;font-size:14px">Days: ${listing.days.join(', ')}</p>` : ''}
          </div>
          <p>Please log in to <strong>Happy Hour Flower</strong> and update or renew this listing before it expires.</p>
          <p style="color:#6b7280;font-size:13px">This is an automated reminder. If this deal has already been updated, you can ignore this message.</p>
          <p>— Happy Hour Flower 🌸</p>
        </div>
      `;

      for (const recipient of recipients) {
        if (!recipient.email) continue;
        try {
          const res = await fetch('https://api.mailersend.com/v1/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              from: { email: 'noreply@happyhourflower.com', name: 'Happy Hour Flower' },
              to: [{ email: recipient.email }],
              subject,
              html: htmlBody
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errors.push(`Failed to email ${recipient.email}: ${err.message || res.status}`);
          }
        } catch (e) {
          errors.push(`Email error for ${recipient.email}: ${e.message}`);
        }
      }

      // Mark as notified to avoid duplicate sends
      await base44.asServiceRole.entities.Listing.update(listing.id, {
        expiry_notified_at: now.toISOString()
      });
      notified++;
    }

    return Response.json({ success: true, checked: allListings.length, expiring: expiring.length, notified, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});