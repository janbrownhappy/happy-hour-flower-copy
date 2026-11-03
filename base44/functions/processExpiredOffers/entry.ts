import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Runs daily. Two-stage handling of EXPIRED venue offers/specials (Listings):
//  Stage 1 — offer just expired (no email sent yet): email the venue owner, stamp expired_notified_at.
//  Stage 2 — offer expired >24h ago, owner was notified, and the offer was NOT changed/removed
//            since the notification: flag it for manual admin removal.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    // This is a backend maintenance job run by a daily scheduled automation (and
    // occasionally triggered by an admin). It is NOT exposed in any user-facing UI
    // and reads/writes exclusively via asServiceRole below. The previous version
    // gated on `user.role === 'admin'`, but this app does not use the built-in role
    // field for admin access (admins are elevated through the two-factor admin flow,
    // so every stored user has role 'user'). That guard therefore rejected the
    // scheduled invocation itself with a 403. No role gate is needed here.

    const now = new Date();
    const apiKey = Deno.env.get('MAILERSEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@happyhourflower.com';

    const allListings = await base44.asServiceRole.entities.Listing.list();

    // Only approved offers that have an expiry date already in the past
    const expired = allListings.filter(l => {
      if (!l.expires_at) return false;
      if (l.status !== 'approved') return false;
      if (l.flagged_for_removal) return false; // already flagged, nothing more to do
      // expires_at is a date (YYYY-MM-DD); treat end-of-day as the expiry moment
      const exp = new Date(`${l.expires_at}T23:59:59`);
      return exp < now;
    });

    if (expired.length === 0) {
      return Response.json({ success: true, checked: allListings.length, notified: 0, flagged: 0 });
    }

    const allVenues = await base44.asServiceRole.entities.Venue.list();
    const venuesById = Object.fromEntries(allVenues.map(v => [v.id, v]));
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));

    let notified = 0;
    let flagged = 0;
    const errors = [];

    for (const listing of expired) {
      const venue = listing.venue_ref_id
        ? venuesById[listing.venue_ref_id]
        : allVenues.find(v => String(v.venue_id) === String(listing.venue_id));
      const venueName = venue?.name || listing.venue_name || 'your venue';
      const expiresFormatted = new Date(`${listing.expires_at}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });

      // STAGE 2: already notified — has the 24h grace window elapsed without an update/removal?
      if (listing.expired_notified_at) {
        const notifiedAt = new Date(listing.expired_notified_at);
        const hoursSinceNotice = (now - notifiedAt) / (1000 * 60 * 60);
        if (hoursSinceNotice < 24) continue; // still within grace window

        // Was the listing changed since we notified? updated_date moving past the notice = owner acted.
        const lastUpdated = listing.updated_date ? new Date(listing.updated_date) : null;
        if (lastUpdated && lastUpdated > notifiedAt) {
          // Owner updated it but it's still expired — re-stamp so we give another 24h before flagging
          await base44.asServiceRole.entities.Listing.update(listing.id, {
            expired_notified_at: now.toISOString()
          });
          continue;
        }

        // Untouched for 24h+ → flag for manual admin removal + notify admin
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          flagged_for_removal: true,
          flagged_for_removal_at: now.toISOString()
        });
        flagged++;

        if (apiKey) {
          const subject = `🚩 Action needed: expired offer "${listing.name}" at ${venueName} flagged for removal`;
          const html = `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#dc2626">🚩 Expired Offer Flagged for Removal</h2>
              <p>The following offer expired on <strong>${expiresFormatted}</strong> and was not updated or removed within 24 hours of notifying the venue owner:</p>
              <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0;font-size:16px;font-weight:bold">${listing.name}</p>
                <p style="margin:8px 0 0;color:#6b7280;font-size:14px">Venue: ${venueName}</p>
                ${listing.deals?.length ? `<ul style="margin:8px 0 0">${listing.deals.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
              </div>
              <p>Please review it in the admin dashboard and remove it if appropriate.</p>
              <p>— Happy Hour Flower 🌸</p>
            </div>`;
          try {
            const res = await fetch('https://api.mailersend.com/v1/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({
                from: { email: 'noreply@happyhourflower.com', name: 'Happy Hour Flower' },
                to: [{ email: adminEmail }],
                subject, html
              })
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              errors.push(`Admin flag email failed for ${listing.name}: ${err.message || res.status}`);
            }
          } catch (e) {
            errors.push(`Admin flag email error for ${listing.name}: ${e.message}`);
          }
        }
        continue;
      }

      // STAGE 1: just expired, owner not yet notified → email owner, start the 24h window
      const owner = venue?.owner_id ? usersById[venue.owner_id] : null;
      if (apiKey && owner?.email) {
        const subject = `⚠️ Your offer "${listing.name}" at ${venueName} has expired`;
        const html = `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#d97706">⚠️ Your Offer Has Expired</h2>
            <p>Hi ${owner.full_name || 'there'},</p>
            <p>The following offer at <strong>${venueName}</strong> expired on <strong>${expiresFormatted}</strong>:</p>
            <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;font-size:16px;font-weight:bold">${listing.name}</p>
              ${listing.deals?.length ? `<ul style="margin:8px 0 0">${listing.deals.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
            </div>
            <p>Please log in to <strong>Happy Hour Flower</strong> and update, renew, or remove this offer within <strong>24 hours</strong>. Offers left unchanged will be flagged for removal.</p>
            <p style="color:#6b7280;font-size:13px">This is an automated message. If you've already handled this, you can ignore it.</p>
            <p>— Happy Hour Flower 🌸</p>
          </div>`;
        try {
          const res = await fetch('https://api.mailersend.com/v1/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              from: { email: 'noreply@happyhourflower.com', name: 'Happy Hour Flower' },
              to: [{ email: owner.email }],
              subject, html
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errors.push(`Owner email failed for ${listing.name}: ${err.message || res.status}`);
          }
        } catch (e) {
          errors.push(`Owner email error for ${listing.name}: ${e.message}`);
        }
      }

      // Stamp the notification time even if no owner email (so the 24h window still starts and it gets flagged)
      await base44.asServiceRole.entities.Listing.update(listing.id, {
        expired_notified_at: now.toISOString()
      });
      notified++;
    }

    return Response.json({ success: true, checked: allListings.length, notified, flagged, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});