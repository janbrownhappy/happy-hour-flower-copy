import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { createResend } from '../../shared/resendClient.ts';
import { format, subWeeks } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    // Get the admin user who owns this automation
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUser = allUsers.find(u => u.role === 'admin');
    if (!adminUser?.email) {
      return Response.json({ error: 'No admin user with email found' }, { status: 400 });
    }

    const oneWeekAgo = subWeeks(new Date(), 1);
    const weekLabel = `${format(oneWeekAgo, 'MMM d')} – ${format(new Date(), 'MMM d, yyyy')}`;

    // Fetch all data in parallel
    const [venues, listings, favorites, profiles, reviews, claims, sessions] = await Promise.all([
      base44.asServiceRole.entities.Venue.list(),
      base44.asServiceRole.entities.Listing.list(),
      base44.asServiceRole.entities.Favorite.list(),
      base44.asServiceRole.entities.Profile.list(),
      base44.asServiceRole.entities.Review.list(),
      base44.asServiceRole.entities.VenueClaimRequest.list().catch(() => []),
      base44.asServiceRole.entities.AppSession.list('-started_at', 5000).catch(() => []),
    ]);

    // This week's new records
    const isNew = (record) => record.created_date && new Date(record.created_date) >= oneWeekAgo;

    const newVenues      = venues.filter(isNew).length;
    const newListings    = listings.filter(isNew).length;
    const newFavorites   = favorites.filter(isNew).length;
    const newUsers       = profiles.filter(isNew).length;
    const newReviews     = reviews.filter(isNew).length;
    const pendingClaims  = claims.filter(c => c.status === 'pending').length;

    // App usage this week
    const weekSessions = sessions.filter(s => s.started_at && new Date(s.started_at) >= oneWeekAgo);
    const appOpens = weekSessions.length;
    const logins = weekSessions.filter(s => s.event_type === 'login').length;
    const activeUsers = new Set(weekSessions.map(s => s.user_id).filter(Boolean)).size;
    const totalSeconds = weekSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgSeconds = appOpens > 0 ? Math.round(totalSeconds / appOpens) : 0;
    const fmtDuration = (secs) => {
      if (!secs || secs < 1) return '0s';
      const m = Math.floor(secs / 60);
      const s = Math.round(secs % 60);
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    // Subscription breakdown
    const premiumVenues   = venues.filter(v => v.subscription_tier === 'premium').length;
    const platinumVenues  = venues.filter(v => v.subscription_tier === 'platinum').length;
    const premiumUsers    = profiles.filter(p => p.is_premium).length;

    // Top 5 venues by view count
    const top5 = [...venues]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);

    const topVenuesRows = top5.map((v, i) =>
      `<tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 12px;color:#6b7280">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:600">${v.name || 'Unnamed'}</td>
        <td style="padding:8px 12px;text-align:center">${v.view_count || 0}</td>
        <td style="padding:8px 12px;text-align:center">${v.subscription_tier || 'free'}</td>
      </tr>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f9fafb;margin:0;padding:0">
  <div style="max-width:620px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px">📊 Admin Weekly Summary</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px">${weekLabel}</p>
    </div>

    <div style="padding:30px">

      <h2 style="font-size:16px;margin:0 0 16px;color:#374151">New This Week</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
        ${[
          ['🏢', 'Venues', newVenues],
          ['📋', 'Listings', newListings],
          ['❤️', 'Favorites', newFavorites],
          ['👤', 'Users', newUsers],
          ['⭐', 'Reviews', newReviews],
          ['🔔', 'Pending Claims', pendingClaims],
        ].map(([icon, label, val]) => `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:24px">${icon}</div>
            <div style="font-size:26px;font-weight:700;color:#f59e0b;margin:4px 0">${val}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size:16px;margin:0 0 16px;color:#374151">App Usage This Week</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
        ${[
          ['📱', 'App Opens', appOpens.toLocaleString()],
          ['🔑', 'Logins', logins.toLocaleString()],
          ['👥', 'Active Users', activeUsers.toLocaleString()],
          ['⏱️', 'Avg. Session', fmtDuration(avgSeconds)],
          ['🕒', 'Total Time', fmtDuration(totalSeconds)],
        ].map(([icon, label, val]) => `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:24px">${icon}</div>
            <div style="font-size:22px;font-weight:700;color:#f59e0b;margin:4px 0">${val}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size:16px;margin:0 0 16px;color:#374151">Platform Totals</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px">
        ${[
          ['Total Venues', venues.length],
          ['Premium Venues', premiumVenues],
          ['Platinum Venues', platinumVenues],
          ['Total Users', profiles.length],
          ['Premium Users', premiumUsers],
          ['Total Listings', listings.length],
          ['Total Favorites', favorites.length],
        ].map(([label, val]) => `
          <tr style="border-bottom:1px solid #f3f4f6">
            <td style="padding:10px 0;color:#6b7280">${label}</td>
            <td style="padding:10px 0;text-align:right;font-weight:600">${val.toLocaleString()}</td>
          </tr>
        `).join('')}
      </table>

      <h2 style="font-size:16px;margin:0 0 16px;color:#374151">Top 5 Venues by Views</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px">
        <thead>
          <tr style="background:#f9fafb;text-align:left">
            <th style="padding:8px 12px;color:#6b7280;font-weight:600">#</th>
            <th style="padding:8px 12px;color:#6b7280;font-weight:600">Venue</th>
            <th style="padding:8px 12px;color:#6b7280;font-weight:600;text-align:center">Views</th>
            <th style="padding:8px 12px;color:#6b7280;font-weight:600;text-align:center">Tier</th>
          </tr>
        </thead>
        <tbody>${topVenuesRows}</tbody>
      </table>

      ${pendingClaims > 0 ? `
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:28px">
          <strong>⚠️ ${pendingClaims} pending venue claim${pendingClaims > 1 ? 's' : ''}</strong> need your review.
        </div>
      ` : ''}

      <div style="text-align:center">
        <a href="https://happyhourflower.com/admin" style="background:#f59e0b;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block">
          Open Admin Dashboard
        </a>
      </div>
    </div>

    <div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">
      © ${new Date().getFullYear()} Happy Hour Flower — Admin Weekly Summary
    </div>
  </div>
</body>
</html>`;

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const { error: sendError } = await resend.emails.send({
      from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
      to: [adminUser.email],
      subject: `📊 Admin Weekly Summary — ${weekLabel}`,
      html,
    });

    if (sendError) {
      return Response.json({ success: false, error: sendError.message }, { status: 500 });
    }

    return Response.json({ success: true, sentTo: adminUser.email, weekLabel });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});