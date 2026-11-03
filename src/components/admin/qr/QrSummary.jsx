import { labelize } from './qrConstants';

const MIN_SAMPLE = 10; // rankings hidden below this many scans

function Stat({ label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-2xl font-bold text-primary">{value ?? '—'}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Ranking({ title, rows }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="font-semibold text-sm mb-2">{title}</p>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">Not enough data yet (needs {MIN_SAMPLE}+ scans).</p> : (
        <ol className="space-y-1 text-sm">{rows.slice(0, 5).map(([k, v]) => <li key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="font-semibold">{v}</span></li>)}</ol>
      )}
    </div>
  );
}

function group(campaigns, byQr, keyFn, metric = 'scans') {
  const m = {};
  campaigns.forEach((c) => { const k = keyFn(c); if (k) m[k] = (m[k] || 0) + (byQr[c.qr_id]?.[metric] || 0); });
  const total = Object.values(m).reduce((a, b) => a + b, 0);
  return total < MIN_SAMPLE ? [] : Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
}

export default function QrSummary({ summary, byQr, campaigns, venueName }) {
  const s = summary || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <Stat label="Active QR Codes" value={s.active} /><Stat label="Total Scans" value={s.total_scans} />
        <Stat label="Scans Last 7 Days" value={s.last7} /><Stat label="Scans Last 30 Days" value={s.last30} />
        <Stat label="Signups Attributed" value={s.signups} /><Stat label="Arrivals Attributed" value={s.arrivals} />
        <Stat label="Premium Attributed" value={s.premium} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Ranking title="Top QR Codes by Scans" rows={group(campaigns, byQr, (c) => c.qr_id)} />
        <Ranking title="Top QR Codes by Arrivals" rows={(s.total_scans || 0) < MIN_SAMPLE ? [] : group(campaigns, byQr, (c) => c.qr_id, 'arrivals')} />
        <Ranking title="Top Placement Types" rows={group(campaigns, byQr, (c) => labelize(c.placement_type))} />
        <Ranking title="Top Venues" rows={group(campaigns, byQr, (c) => venueName(c.venue_id))} />
      </div>
    </div>
  );
}