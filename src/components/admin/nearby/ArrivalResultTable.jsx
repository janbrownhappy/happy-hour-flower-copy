import { Badge } from '@/components/ui/badge';

export default function ArrivalResultTable({ arrival }) {
  if (!arrival) return null;
  const ev = arrival.notification_event;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Reading accuracy {arrival.accuracy_ok ? 'qualifies' : <b className="text-destructive">does NOT qualify (POOR_GPS_ACCURACY)</b>}
        {' · '}Notification event: {ev ? <b>{ev.id} ({ev.processing_status})</b> : 'none this cycle'}
      </p>
      {!arrival.visits.length ? <p className="text-sm text-muted-foreground">No open visits — state OUTSIDE.</p> : (
        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted text-left text-muted-foreground"><tr>
              <th className="p-2">Venue</th><th className="p-2">Distance</th><th className="p-2">State</th><th className="p-2">Arr. reads</th><th className="p-2">Dep. reads</th><th className="p-2">Active special</th><th className="p-2">Eligible</th><th className="p-2">Suppression</th><th className="p-2">Notification</th>
            </tr></thead>
            <tbody>
              {arrival.visits.map((v) => (
                <tr key={v.visit_id} className="border-t border-border">
                  <td className="p-2 font-medium">{v.venue_name}</td>
                  <td className="p-2">{v.distance_meters ?? '—'} m</td>
                  <td className="p-2"><Badge variant="secondary">{v.previous_state} → {v.current_state}</Badge></td>
                  <td className="p-2">{v.qualifying_arrival_readings}</td>
                  <td className="p-2">{v.qualifying_departure_readings}</td>
                  <td className="p-2">{v.active_special || '—'}</td>
                  <td className="p-2">{v.notification_eligible ? 'Yes' : 'No'}</td>
                  <td className="p-2">{v.suppression_reason || '—'}</td>
                  <td className="p-2">{v.notification_status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}