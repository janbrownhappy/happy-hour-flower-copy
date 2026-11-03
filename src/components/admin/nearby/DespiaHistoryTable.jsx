import { useState } from 'react';

const R = 6371000, rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => 2 * R * Math.asin(Math.sqrt(Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2));

// Per-user session stats (update count, avg interval, avg distance, accuracy range) + raw history.
function stats(rows) {
  const s = [...rows].sort((a, b) => (a.client_timestamp || a.created_date).localeCompare(b.client_timestamp || b.created_date));
  let t = 0, d = 0;
  for (let i = 1; i < s.length; i++) {
    t += (new Date(s[i].client_timestamp || s[i].created_date) - new Date(s[i - 1].client_timestamp || s[i - 1].created_date)) / 1000;
    d += dist(s[i - 1], s[i]);
  }
  const acc = s.map((r) => r.accuracy_meters).filter((n) => Number.isFinite(n));
  const n = s.length - 1;
  return { count: s.length, avgSec: n ? Math.round(t / n) : null, avgM: n ? Math.round(d / n) : null, acc: acc.length ? `${Math.round(Math.min(...acc))}–${Math.round(Math.max(...acc))} m` : '—' };
}

export default function DespiaHistoryTable({ logs }) {
  const [page, setPage] = useState(0);
  if (!logs) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (!logs.length) return <p className="text-xs text-muted-foreground">No Despia location updates received yet.</p>;
  const st = stats(logs);
  const rows = logs.slice(page * 25, page * 25 + 25);
  const fmtS = (x) => x == null ? '—' : x >= 60 ? `${Math.round(x / 60)} min` : `${x}s`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[['Updates', st.count], ['Avg time between', fmtS(st.avgSec)], ['Avg distance between', st.avgM == null ? '—' : `${st.avgM} m`], ['Accuracy range', st.acc]].map(([k, v]) => (
          <div key={k} className="bg-muted rounded-lg p-2"><p className="text-muted-foreground">{k}</p><p className="font-semibold text-sm">{v}</p></div>
        ))}
      </div>
      <div className="overflow-x-auto"><table className="w-full text-xs">
        <thead><tr className="text-left text-muted-foreground">{['Time', 'Lat / Lng', 'Acc.', 'Closest venue', 'Dist.', 'Arrival state', 'Eligible', 'Suppression', 'Backend'].map((h) => <th key={h} className="p-1.5">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="p-1.5 whitespace-nowrap">{new Date(r.client_timestamp || r.created_date).toLocaleString()}</td>
            <td className="p-1.5">{r.latitude?.toFixed(5)}, {r.longitude?.toFixed(5)}</td>
            <td className="p-1.5">{r.accuracy_meters != null ? Math.round(r.accuracy_meters) : '—'}</td>
            <td className="p-1.5">{r.closest_venue_name || '—'}</td>
            <td className="p-1.5">{r.closest_distance_meters ?? '—'}</td>
            <td className="p-1.5">{r.arrival_state || '—'}</td>
            <td className="p-1.5">{r.notification_eligible ? 'Yes' : 'No'}</td>
            <td className="p-1.5">{r.suppression_reason || '—'}</td>
            <td className="p-1.5">{r.status}{r.error ? `: ${r.error}` : ''}</td>
          </tr>))}</tbody>
      </table></div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{logs.length} updates</span>
        <span className="space-x-2"><button disabled={!page} onClick={() => setPage(page - 1)}>Prev</button><button disabled={(page + 1) * 25 >= logs.length} onClick={() => setPage(page + 1)}>Next</button></span>
      </div>
    </div>
  );
}