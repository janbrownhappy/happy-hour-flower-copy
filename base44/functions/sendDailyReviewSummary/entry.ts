import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { createResend } from '../../shared/resendClient.ts';

const ADMIN_URL = 'https://happyhourflower.com/admin';
const TZ = 'America/New_York';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Start/end (UTC ISO) of yesterday's calendar day in New York time.
function yesterdayWindow() {
  const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const offset = (d) => {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName').value;
    const m = name.match(/GMT([+-]\d+)(?::(\d+))?/);
    const sign = m && m[1].startsWith('-') ? '-' : '+';
    return m ? `${sign}${String(Math.abs(+m[1])).padStart(2, '0')}:${m[2] || '00'}` : '+00:00';
  };
  const now = new Date();
  const today = ymd(now);
  const yDate = ymd(new Date(now.getTime() - 24 * 3600 * 1000));
  const start = new Date(`${yDate}T00:00:00${offset(new Date(`${yDate}T12:00:00Z`))}`).toISOString();
  const end = new Date(`${today}T00:00:00${offset(now)}`).toISOString();
  return { start, end, label: new Date(`${yDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) };
}

const cell = (n, label, color) => `<td style="padding:10px;text-align:center;border:1px solid #e5e7eb"><div style="font-size:22px;font-weight:700;color:${color}">${n}</div><div style="font-size:12px;color:#6b7280">${label}</div></td>`;
const section = (title, cells, items, tab) => `
  <h3 style="font-family:'Playfair Display',Georgia,serif;margin:28px 0 10px;font-size:18px">${title}</h3>
  <table style="border-collapse:collapse;width:100%"><tr>${cells.join('')}</tr></table>
  ${items.length ? `<ul style="padding-left:18px;margin:12px 0 0">${items.map((i) => `<li style="margin-bottom:6px">${i}</li>`).join('')}</ul>` : ''}
  <p style="margin:10px 0 0"><a href="${ADMIN_URL}?tab=${tab}" style="color:#db8b0a;font-weight:700">Open in Admin</a></p>`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const ownerEmails = [secrets.get('ADMIN_EMAIL'), 'jan.brown@happyhourflower.com'].filter(Boolean).map((e) => e.toLowerCase());
    if (user.role !== 'admin' && !ownerEmails.includes((user.email || '').toLowerCase())) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { start, end, label } = yesterdayWindow();
    const day = { $gte: start, $lt: end };
    const { Review, VenueClaimRequest: Claim, Venue, InstagramPost: Post } = base44.asServiceRole.entities;

    const [rvNew, rvApproved, rvRejected, rvPending, clNew, clApproved, clRejected, clPending, drNew, drTotal, igQueued, igPosted, igSkipped, igPending, igFailed] = await Promise.all([
      Review.filter({ created_date: day }, { sort: '-created_date', limit: 10 }),
      Review.count({ status: 'approved', updated_date: day }),
      Review.count({ status: 'rejected', updated_date: day }),
      Review.count({ status: 'pending' }),
      Claim.filter({ created_date: day }, { sort: '-created_date', limit: 10 }),
      Claim.count({ status: 'approved', reviewed_at: day }),
      Claim.count({ status: 'rejected', reviewed_at: day }),
      Claim.count({ status: 'pending' }),
      Venue.filter({ status: 'draft', created_date: day }, { sort: '-created_date', limit: 10, fields: ['name', 'city'] }),
      Venue.count({ status: 'draft' }),
      Post.count({ queued_at: day }),
      Post.count({ status: 'posted', reviewed_at: day }),
      Post.count({ status: 'skipped', reviewed_at: day }),
      Post.count({ status: 'pending' }),
      Post.count({ status: 'failed' }),
    ]);
    const [rvNewCount, clNewCount, drNewCount] = await Promise.all([
      Review.count({ created_date: day }), Claim.count({ created_date: day }), Venue.count({ status: 'draft', created_date: day }),
    ]);

    // Venue names for the new reviews.
    const venueIds = [...new Set(rvNew.items.map((r) => r.venue_id).filter(Boolean))];
    const venues = venueIds.length ? (await Venue.filter({ id: { $in: venueIds } }, { limit: 50, fields: ['name'] })).items : [];
    const vName = Object.fromEntries(venues.map((v) => [v.id, v.name]));

    const more = (shown, total) => (total > shown ? [`<span style="color:#6b7280">and ${total - shown} more</span>`] : []);
    const reviewItems = [...rvNew.items.map((r) => `<strong>${esc(vName[r.venue_id] || 'Venue')}</strong> · ${'★'.repeat(Math.round(r.rating || 0))} <span style="color:#6b7280">${esc(r.user_name || '')} (${esc(r.status)})</span>${r.comment ? `<br><span style="color:#6b7280">"${esc(r.comment.slice(0, 140))}"</span>` : ''}`), ...more(rvNew.items.length, rvNewCount)];
    const claimItems = [...clNew.items.map((c) => `<strong>${esc(c.venue_name || 'New business')}</strong> <span style="color:#6b7280">· ${c.request_type === 'add' ? 'add request' : 'claim'} by ${esc(c.claimant_name)} (${esc(c.status)})</span>`), ...more(clNew.items.length, clNewCount)];
    const draftItems = [...drNew.items.map((v) => `<strong>${esc(v.name)}</strong>${v.city ? ` <span style="color:#6b7280">· ${esc(v.city)}</span>` : ''}`), ...more(drNew.items.length, drNewCount)];

    const html = `<div style="font-family:Nunito,Arial,sans-serif;color:#111827;max-width:600px">
      <div style="background:#db8b0a;padding:16px 20px">
        <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png" width="40" height="40" style="border-radius:50%;vertical-align:middle;margin-right:10px" alt="">
        <strong style="color:#000;font-size:18px;vertical-align:middle">Happy Hour Flower</strong>
      </div>
      <div style="padding:24px 20px">
        <h2 style="font-family:'Playfair Display',Georgia,serif;margin:0 0 6px">Daily review summary</h2>
        <p style="color:#6b7280;margin:0">Venue reviews and approval queue activity for ${label}.</p>
        ${section('Venue reviews', [cell(rvNewCount, 'New', '#db8b0a'), cell(rvApproved, 'Approved', '#059669'), cell(rvRejected, 'Rejected', '#dc2626'), cell(rvPending, 'Pending now', '#111827')], reviewItems, 'reviews')}
        ${section('Venue claims', [cell(clNewCount, 'New', '#db8b0a'), cell(clApproved, 'Approved', '#059669'), cell(clRejected, 'Rejected', '#dc2626'), cell(clPending, 'Pending now', '#111827')], claimItems, 'claims')}
        ${section('Imported venues awaiting review', [cell(drNewCount, 'New drafts', '#db8b0a'), cell(drTotal, 'Waiting now', '#111827')], draftItems, 'import-review')}
        ${section('Instagram queue', [cell(igQueued, 'Queued', '#db8b0a'), cell(igPosted, 'Approved', '#059669'), cell(igSkipped, 'Skipped', '#6b7280'), cell(igPending, 'Pending now', '#111827'), cell(igFailed, 'Failed', '#dc2626')], [], 'instagram-queue')}
      </div>
    </div>`;

    const to = secrets.get('ADMIN_EMAIL') || 'jan.brown@happyhourflower.com';
    const waiting = rvPending + clPending + drTotal + igPending;
    const { error } = await createResend(secrets.get('RESEND_API_KEY')).emails.send({
      to, subject: `Daily review summary for ${label}: ${waiting} waiting`, html,
    });
    if (error) throw new Error(error.message);
    return Response.json({ sent: true, to, window: { start, end }, reviews: { new: rvNewCount, approved: rvApproved, rejected: rvRejected, pending: rvPending }, claims: { new: clNewCount, approved: clApproved, rejected: clRejected, pending: clPending }, drafts: { new: drNewCount, total: drTotal }, instagram: { queued: igQueued, posted: igPosted, skipped: igSkipped, pending: igPending, failed: igFailed } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}