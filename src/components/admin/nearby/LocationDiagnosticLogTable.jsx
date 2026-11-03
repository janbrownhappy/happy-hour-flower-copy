import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function LocationDiagnosticLogTable({ refreshKey }) {
  const [logs, setLogs] = useState(null);
  const load = () => base44.entities.LocationDiagnosticLog.list('-created_date', 50).then(setLogs);
  useEffect(() => { load(); }, [refreshKey]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm">Recent location diagnostics (latest 50)</p>
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>
      {!logs ? <p className="text-sm text-muted-foreground">Loading…</p> : logs.length === 0 ? <p className="text-sm text-muted-foreground">No location updates logged yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground"><tr>
              <th className="p-1.5">Time</th><th className="p-1.5">Source</th><th className="p-1.5">User</th><th className="p-1.5">Lat, Lng</th><th className="p-1.5">Accuracy</th><th className="p-1.5">Radius</th><th className="p-1.5">Found</th><th className="p-1.5">Closest</th><th className="p-1.5">Status</th>
            </tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-1.5 whitespace-nowrap">{new Date(l.created_date).toLocaleString()}</td>
                  <td className="p-1.5">{l.source}</td>
                  <td className="p-1.5">{l.user_id?.slice(-6)}</td>
                  <td className="p-1.5">{l.latitude?.toFixed(5)}, {l.longitude?.toFixed(5)}</td>
                  <td className="p-1.5">{l.accuracy_meters != null ? `${l.accuracy_meters} m` : '—'}</td>
                  <td className="p-1.5">{l.search_radius_meters ?? '—'}</td>
                  <td className="p-1.5">{l.nearby_count ?? '—'}</td>
                  <td className="p-1.5">{l.closest_distance_meters != null ? `${l.closest_distance_meters} m` : '—'}</td>
                  <td className="p-1.5">{l.status}{l.error ? ` (${l.error})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}