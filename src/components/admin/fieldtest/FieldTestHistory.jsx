import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { modeLabel } from './fieldTestUtils';

const PAGE = 20;
const yn = (v) => (v ? 'Yes' : 'No');

export default function FieldTestHistory({ sessions, onOpen }) {
  const [page, setPage] = useState(0);
  if (!sessions) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (!sessions.length) return <p className="text-xs text-muted-foreground">No field tests yet.</p>;
  const pages = Math.ceil(sessions.length / PAGE);
  const rows = sessions.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div className="space-y-2">
      <div className="overflow-auto border border-border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted text-left"><tr>{['Date/time', 'Test venue', 'Mode', 'Movement', 'Readings', 'Inside 50m', 'Arrival', 'Missed?', ''].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-2 py-1.5">{new Date(s.started_at).toLocaleString()}</td>
                <td className="px-2">{s.test_venue_name || '—'}</td>
                <td className="px-2">{modeLabel(s.test_modes)}</td>
                <td className="px-2">{s.despia_location_movement_meters}m</td>
                <td className="px-2">{s.status === 'active' ? 'Active' : s.readings_count ?? 0}</td>
                <td className="px-2">{s.readings_inside_radius ?? '—'}</td>
                <td className="px-2">{s.status === 'active' ? '—' : yn(s.arrival_detected)}</td>
                <td className={`px-2 ${s.possible_missed_arrival ? 'text-destructive font-semibold' : ''}`}>{s.status === 'active' ? '—' : yn(s.possible_missed_arrival)}</td>
                <td className="px-2"><Button size="sm" variant="outline" onClick={() => onOpen(s)}>Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{sessions.length} sessions</span>
        {pages > 1 && <div className="flex gap-2 items-center"><Button size="sm" variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>Prev</Button>{page + 1}/{pages}<Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
      </div>
    </div>
  );
}