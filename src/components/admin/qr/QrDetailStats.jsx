import { pct } from './qrConstants';

function Cell({ label, value, sub }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}{sub ? ` · ${sub}` : ''}</p>
    </div>
  );
}

export default function QrDetailStats({ s }) {
  const a = s || { scans: 0, sessions: 0, users: 0, anonymous: 0, signups: 0, venue_views: 0, special_views: 0, directions: 0, arrivals: 0, premium: 0 };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Cell label="Total Scans" value={a.scans} /><Cell label="Unique Sessions" value={a.sessions} />
        <Cell label="Known Users" value={a.users} /><Cell label="Anonymous Scans" value={a.anonymous} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Cell label="Signups" value={a.signups} sub={`Scan→Signup ${pct(a.signups, a.scans)}`} />
        <Cell label="Venue Views" value={a.venue_views} />
        <Cell label="Special Views" value={a.special_views} />
        <Cell label="Directions Clicks" value={a.directions} sub={`Scan→Directions ${pct(a.directions, a.scans)}`} />
        <Cell label="Detected Arrivals" value={a.arrivals} sub={`Scan→Arrival ${pct(a.arrivals, a.scans)}`} />
        <Cell label="Premium Conversions" value={a.premium} sub={`Scan→Premium ${pct(a.premium, a.scans)}`} />
      </div>
      <p className="text-xs text-muted-foreground">Conversions count only signed-in users whose last QR touch was this code within 7 days (venue events also require the same venue).</p>
    </div>
  );
}