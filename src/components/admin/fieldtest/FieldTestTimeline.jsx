import { fmtTime, m } from './fieldTestUtils';

// Chronological reading timeline for one session.
export default function FieldTestTimeline({ readings, required = 2 }) {
  if (!readings?.length) return <p className="text-xs text-muted-foreground">No readings received yet.</p>;
  const note = (r) => {
    if (r.new_state === 'NEARBY') return `Reading ${r.qualifying_arrival_readings}/${required}`;
    if (r.new_state === 'ARRIVED' && r.previous_state !== 'ARRIVED') return `Reading ${r.qualifying_arrival_readings}/${required}`;
    if (r.qualifying_departure_readings > 0 && r.new_state !== 'DEPARTED') return `departure reading ${r.qualifying_departure_readings}/${required}`;
    return '';
  };
  return (
    <div className="max-h-80 overflow-auto border border-border rounded-lg font-mono text-xs divide-y divide-border">
      {readings.map((r) => (
        <div key={r.id} className={`flex flex-wrap gap-x-3 px-3 py-1.5 ${r.inside_arrival_radius ? 'bg-primary/10' : ''}`}>
          <span>{fmtTime(r.reading_at)}</span>
          <b>{m(r.target_distance_meters)}</b>
          <span>{r.new_state}</span>
          {note(r) && <span className="text-muted-foreground">{note(r)}</span>}
          <span className="text-muted-foreground">±{m(r.accuracy_meters)}</span>
          {r.notification_eligible && <span className="text-primary">{r.suppression_reason}</span>}
          {r.test_venue_id && r.closest_venue_id && r.closest_venue_id !== r.test_venue_id && (
            <span className="text-muted-foreground">closest: {r.closest_venue_name} {m(r.closest_distance_meters)}</span>
          )}
        </div>
      ))}
    </div>
  );
}