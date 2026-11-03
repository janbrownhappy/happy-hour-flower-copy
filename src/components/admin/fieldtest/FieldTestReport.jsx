import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FieldTestTimeline from './FieldTestTimeline';
import { modeLabel, m, loadReadings } from './fieldTestUtils';

const yn = (v) => (v ? 'Yes' : 'No');
const secs = (v) => (v == null ? '—' : `${Math.round(v)}s`);

export default function FieldTestReport({ session, onClose }) {
  const [readings, setReadings] = useState(null);
  useEffect(() => { if (session) loadReadings(session.id).then(setReadings); }, [session?.id]);
  if (!session) return null;
  const s = session.summary || {};
  const sec = (title, rows) => (
    <div><p className="text-xs font-bold tracking-wide mb-1">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><b>{v ?? '—'}</b></div>)}</div>
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>{session.test_session_id} — Field Test Report</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {sec('TEST CONFIGURATION', [['Test venue', session.test_venue_name || 'Closest venue'], ['Test mode', modeLabel(session.test_modes)], ['Duration', s.duration_seconds != null ? `${Math.round(s.duration_seconds / 60)} min` : 'In progress'], ['Despia movement threshold', `${session.despia_location_movement_meters}m`], ['Arrival radius', `${session.arrival_radius_meters}m`], ['Departure radius', `${session.departure_radius_meters}m`], ['Required arrival readings', session.required_arrival_readings], ['Max arrival GPS accuracy', `${session.max_arrival_accuracy_meters}m`], ['Platform', session.platform], ['Push delivery', session.notification_delivery_status]])}
          {sec('GPS PERFORMANCE', [['Total GPS readings', s.total_readings], ['Avg seconds between', secs(s.avg_seconds_between)], ['Longest gap', secs(s.max_seconds_between)], ['Avg distance between', m(s.avg_meters_between)], ['Largest distance between', m(s.max_meters_between)], ['Best accuracy', m(s.best_accuracy)], ['Worst accuracy', m(s.worst_accuracy)], ['Avg accuracy', m(s.avg_accuracy)]])}
          {sec('ARRIVAL PERFORMANCE', [['Within 500m', s.within_500], ['Within 250m', s.within_250], ['Within 100m', s.within_100], ['Within 75m', s.within_75], ['Within 50m', s.within_50], ['Within 25m', s.within_25], ['Closest approach', m(s.closest_approach_meters)], ['Readings inside arrival radius', s.readings_inside_radius], ['Arrival detected', yn(s.arrival_detected)], ['ARRIVED state reached', yn(s.arrived_reached)], ['Notification eligibility reached', yn(s.notification_eligible_reached)], ['Possible missed arrival', yn(s.possible_missed_arrival)]])}
          {s.confirmation_failed_message && <p className="text-sm font-semibold text-destructive">{s.confirmation_failed_message}</p>}
          {s.possible_missed_arrival && <p className="text-sm font-semibold text-destructive">POSSIBLE MISSED ARRIVAL — {s.missed_arrival_note}</p>}
          <div><p className="text-xs font-bold tracking-wide mb-1">TIMELINE</p>
            {readings === null ? <p className="text-xs text-muted-foreground">Loading…</p> : readings.length ? <FieldTestTimeline readings={readings} required={session.required_arrival_readings} /> : <p className="text-xs text-muted-foreground">Detailed readings are not available (expired under the location retention window). Summary retained.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}