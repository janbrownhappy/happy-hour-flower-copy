import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { format, subWeeks, startOfWeek } from 'npm:date-fns@3.6.0';
import { createResend } from '../../shared/resendClient.ts';

const PARTNERO_API = 'https://api.partnero.com/v1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const apiKey = Deno.env.get('PARTNERO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Missing PARTNERO_API_KEY' }, { status: 500 });
    }
    const resend = createResend(Deno.env.get('RESEND_API_KEY'));

    const partneroHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Get all venues with an active ambassador link
    const allVenues = await base44.asServiceRole.entities.Venue.list();
    const ambassadorVenues = allVenues.filter(v => v.partnero_partner_id && v.partnero_referral_link && v.owner_id);

    if (ambassadorVenues.length === 0) {
      return Response.json({ success: true, message: 'No ambassador venues found' });
    }

    // Get all users once
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));

    const now = new Date();
    const weekStart = startOfWeek(subWeeks(now, 1));
    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(now, 'MMM d, yyyy')}`;

    const results = [];

    for (const venue of ambassadorVenues) {
      try {
        const owner = usersById[venue.owner_id];
        if (!owner?.email) {
          results.push({ venueId: venue.id, success: false, error: 'Owner email not found' });
          continue;
        }

        // Fetch Partnero stats
        const [partnerRes, customersRes] = await Promise.all([
          fetch(`${PARTNERO_API}/partners/${encodeURIComponent(venue.partnero_partner_id)}`, { headers: partneroHeaders }),
          fetch(`${PARTNERO_API}/partners/${encodeURIComponent(venue.partnero_partner_id)}/customers?limit=100`, { headers: partneroHeaders }),
        ]);

        const partnerData = await partnerRes.json();
        if (!partnerRes.ok) {
          results.push({ venueId: venue.id, success: false, error: 'Partnero fetch failed' });
          continue;
        }

        const partner = partnerData.data;
        let customers = [];
        if (customersRes.ok) {
          const cd = await customersRes.json();
          customers = cd.data || [];
        }

        // New sign-ups this week
        const newThisWeek = customers.filter(c => {
          if (!c.created_at) return false;
          return new Date(c.created_at) >= weekStart;
        });

        const totalSignUps = customers.length;
        const signUpsThisWeek = newThisWeek.length;
        const totalClicks = partner.clicks || 0;
        const earnings = partner.earnings || 0;
        const referralLink = venue.partnero_referral_link;

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}&bgcolor=ffffff&color=b45309&margin=10`;

        const signUpsTableRows = newThisWeek.length > 0
          ? newThisWeek.map(c => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${c.name || 'Unknown'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${c.email || '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${c.created_at ? format(new Date(c.created_at), 'MMM d') : '—'}</td>
              </tr>`).join('')
          : `<tr><td colspan="3" style="padding:16px 12px;text-align:center;color:#9ca3af;">No new sign-ups this week — keep sharing your link!</td></tr>`;

        const subject = `🎯 Your Ambassador Summary – ${venue.name} (${weekLabel})`;

        const body = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 30px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600;">Happy Hour Flower</p>
      <h1 style="margin:0;font-size:26px;color:#fff;font-family:Georgia,serif;">Ambassador Weekly Summary</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${weekLabel}</p>
    </div>

    <!-- Venue name -->
    <div style="padding:24px 30px 0;text-align:center;">
      <h2 style="margin:0;font-size:20px;font-family:Georgia,serif;">${venue.name}</h2>
      <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Your referral performance at a glance</p>
    </div>

    <!-- Metric cards -->
    <div style="display:flex;gap:12px;padding:20px 30px;justify-content:center;">
      <div style="flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#b45309;">${signUpsThisWeek}</p>
        <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#92400e;">New Sign-ups</p>
        <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">This week</p>
      </div>
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#15803d;">${totalSignUps}</p>
        <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#166534;">Total Sign-ups</p>
        <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">All time</p>
      </div>
      <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#334155;">${totalClicks}</p>
        <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#475569;">Link Clicks</p>
        <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">All time</p>
      </div>
    </div>

    ${earnings > 0 ? `
    <!-- Earnings banner -->
    <div style="margin:0 30px;background:linear-gradient(90deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:10px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:14px;color:#92400e;font-weight:600;">💰 Total Rewards Earned</span>
      <span style="font-size:20px;font-weight:700;color:#b45309;">$${(earnings / 100).toFixed(2)}</span>
    </div>` : ''}

    <!-- New sign-ups table -->
    <div style="padding:24px 30px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;font-family:Georgia,serif;">New Sign-ups This Week (${signUpsThisWeek})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Name</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Email</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Joined</th>
          </tr>
        </thead>
        <tbody>${signUpsTableRows}</tbody>
      </table>
    </div>

    <!-- QR Code section -->
    <div style="margin:24px 30px;border:2px solid #fde68a;border-radius:12px;padding:20px;text-align:center;background:#fffbeb;">
      <h3 style="margin:0 0 4px;font-size:15px;font-family:Georgia,serif;">Your Referral QR Code</h3>
      <p style="margin:0 0 16px;font-size:12px;color:#6b7280;">Print and display this anywhere to keep earning</p>
      <img src="${qrUrl}" alt="Referral QR Code" width="160" height="160" style="border-radius:8px;border:3px solid #fde68a;display:block;margin:0 auto 16px;" />
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">Your referral link:</p>
      <a href="${referralLink}" style="font-size:13px;color:#b45309;word-break:break-all;">${referralLink}</a>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:0 30px 24px;">
      <a href="https://happyhourflower.com/venue-dashboard/${venue.id}#ambassador"
         style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:15px;">
        View Ambassador Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e5e7eb;padding:20px 30px;text-align:center;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">Questions? Contact <a href="mailto:support@happyhourflower.com" style="color:#b45309;">support@happyhourflower.com</a></p>
      <p style="margin:6px 0 0;">© ${now.getFullYear()} Happy Hour Flower. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

        const { error: sendError } = await resend.emails.send({
          from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
          to: [owner.email],
          subject,
          html: body,
        });

        if (sendError) {
          results.push({ venueId: venue.id, venueName: venue.name, success: false, error: sendError.message || 'Email send failed' });
        } else {
          results.push({ venueId: venue.id, venueName: venue.name, ownerEmail: owner.email, success: true, signUpsThisWeek, totalSignUps });
        }
      } catch (err) {
        results.push({ venueId: venue.id, success: false, error: err.message });
      }
    }

    const sent = results.filter(r => r.success).length;
    return Response.json({ success: true, message: `Sent ${sent}/${results.length} ambassador emails`, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});