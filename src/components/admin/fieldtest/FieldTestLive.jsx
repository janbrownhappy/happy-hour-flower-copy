import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import FieldTestTimeline from './FieldTestTimeline';
import { modeLabel, m, fieldTestAction, loadReadings } from './fieldTestUtils';

// Live admin panel for the active session; polls captured readings.
export default function FieldTestLive({ session, onStopped }) {
  const [readings, setReadings] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const load = () => loadReadings(session.id).then(setReadings);
    load();
    const a = setInterval(load, 5000); const b = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [session.id]);

  const last = readings[readings.length - 1];
  const R = session.arrival_radius_meters;
  const row = (k, v) => <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><b>{v ?? '—'}</b></div>;
  const block = (title, children) => <div className="border border-border rounded-lg p-3 space-y-1"><p className="text-xs font-bold tracking-wide">{title}</p>{children}</div>;
  const stop = async () => { setBusy(true); const res = await fieldTestAction({ action: 'stop' }); setBusy(false); onStopped(res.session); };

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-4 gap-3">
        {block('FIELD TEST', <>{row('Session', 'Active')}{row('Mode', modeLabel(session.test_modes))}{row('Test Venue', session.test_venue_name || 'Closest venue')}{row('Readings', readings.length)}</>)}
        {block('CURRENT LOCATION', <>{row('GPS Accuracy', m(last?.accuracy_meters))}{row('Last Update', last ? `${Math.round((now - new Date(last.reading_at).getTime()) / 1000)}s ago` : null)}{row('Distance Since Previous', m(last?.meters_since_previous))}</>)}
        {block(session.test_venue_id ? 'TEST VENUE' : 'CLOSEST VENUE', <>{!session.test_venue_id && row('Venue', last?.closest_venue_name)}{row('Distance', m(last?.target_distance_meters))}{row('Arrival Radius', `${R}m`)}{row('Inside Arrival Radius', last ? (last.inside_arrival_radius ? 'Yes' : 'No') : null)}{session.test_venue_id && last?.closest_venue_id !== session.test_venue_id && row('Closest Venue', last ? `${last.closest_venue_name || '—'} ${m(last.closest_distance_meters)}` : null)}</>)}
        {block('ARRIVAL ENGINE', <>{row('State', last?.new_state || 'OUTSIDE')}{row('Qualifying Readings', `${last?.qualifying_arrival_readings || 0} / ${session.required_arrival_readings}`)}{row('Notification Eligible', last ? (last.notification_eligible ? 'Yes' : 'No') : null)}{row('Push Delivery', 'DISABLED — PHASE 5')}</>)}
      </div>
      <FieldTestTimeline readings={readings} required={session.required_arrival_readings} />
      <Button variant="destructive" onClick={stop} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Stop field test &amp; generate report</Button>
    </div>
  );
}