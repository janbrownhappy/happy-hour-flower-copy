import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ArrivalDiagnosticTable({ refreshKey }) {
  const [logs, setLogs] = useState(null);
  const load = () => base44.entities.ArrivalDiagnosticLog.list('-created_date', 50).then(setLogs);
  useEffect(() => { load(); }, [refreshKey]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm">Arrival diagnostics (latest 50)</p>
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>
      {!logs ? <p className="text-sm text-muted-foreground">Loading…</p> : !logs.length ? <p className="text-sm text-muted-foreground">No arrival evaluations yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground"><tr>
              <th className="p-1.5">Time</th><th className="p-1.5">User</th><th className="p-1.5">Venue</th><th className="p-1.5">Dist</th><th className="p-1.5">Acc</th><th className="p-1.5">State</th><th className="p-1.5">Arr/Dep</th><th className="p-1.5">Special</th><th className="p-1.5">Eligible</th><th className="p-1.5">Reason</th><th className="p-1.5">Event</th>
            </tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-1.5 whitespace-nowrap">{new Date(l.evaluated_at || l.created_date).toLocaleString()}</td>
                  <td className="p-1.5">{l.is_test ? 'test' : l.user_id?.slice(-6)}</td>
                  <td className="p-1.5">{l.venue_name}</td>
                  <td className="p-1.5">{l.distance_meters ?? '—'}</td>
                  <td className="p-1.5">{l.accuracy_meters ?? '—'}{l.accuracy_ok === false ? ' ✕' : ''}</td>
                  <td className="p-1.5 whitespace-nowrap">{l.previous_state} → {l.new_state}</td>
                  <td className="p-1.5">{l.qualifying_arrival_readings ?? 0}/{l.qualifying_departure_readings ?? 0}</td>
                  <td className="p-1.5">{l.has_active_special ? 'Yes' : 'No'}</td>
                  <td className="p-1.5">{l.notification_eligible ? 'Yes' : 'No'}</td>
                  <td className="p-1.5">{l.suppression_reason || l.note || '—'}</td>
                  <td className="p-1.5">{l.notification_event_id?.slice(-6) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}