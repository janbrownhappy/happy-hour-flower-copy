import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { processLocation } from '@/functions/processLocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import ArrivalResultTable from './ArrivalResultTable';

// Simulates sequential GPS readings at a chosen distance (due north) from a venue.
// Calls the same production endpoint/engine; test visits are isolated from real ones.
export default function ArrivalTestMode({ onRun }) {
  const [venues, setVenues] = useState([]);
  const [f, setF] = useState({ venue_id: '', distance: '42', accuracy: '20', simulate_time: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    base44.entities.Venue.filter({ status: 'active' }, 'name', 5000).then((vs) => setVenues(vs.filter((v) => typeof v.lat === 'number' && v.lat !== 0)));
  }, []);

  const send = async () => {
    const v = venues.find((x) => x.id === f.venue_id);
    setLoading(true);
    const res = await processLocation({
      latitude: v.lat + Number(f.distance) / 111320, longitude: v.lng,
      accuracy: f.accuracy === '' ? null : Number(f.accuracy), timestamp: new Date().toISOString(),
      test_mode: true, arrival_test: true, simulate_time: f.simulate_time ? new Date(f.simulate_time).toISOString() : undefined,
    });
    const arrival = res?.data?.arrival;
    if (!arrival) {
      setLoading(false);
      setHistory((h) => [...h, `Error: ${res?.data?.error || 'no arrival result returned'}`]);
      return;
    }
    setResult(arrival);
    const mine = arrival.visits.find((x) => x.venue_id === v.id);
    setHistory((h) => [...h, `${f.distance} m @ ±${f.accuracy || '?'} m → ${mine?.current_state || 'OUTSIDE'}${mine?.suppression_reason ? ` (${mine.suppression_reason})` : ''}`]);
    setLoading(false); onRun?.();
  };

  const reset = async () => {
    await processLocation({ test_mode: true, action: 'reset_arrival_test' });
    setResult(null); setHistory([]); onRun?.();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm">Arrival Engine Test Mode</p>
        <p className="text-xs text-muted-foreground">Uses the production Arrival Engine with an isolated test identity. Set a simulated time to test happy hours, cooldowns and the 24h limit.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2"><Label className="text-xs">Venue</Label>
          <select className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={f.venue_id} onChange={set('venue_id')}>
            <option value="">Select a venue…</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div><Label className="text-xs">Distance from venue (m)</Label><Input type="number" value={f.distance} onChange={set('distance')} /></div>
        <div><Label className="text-xs">GPS accuracy (m)</Label><Input type="number" value={f.accuracy} onChange={set('accuracy')} /></div>
        <div className="col-span-2"><Label className="text-xs">Simulated time (optional, your local time)</Label><Input type="datetime-local" value={f.simulate_time} onChange={set('simulate_time')} /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={send} disabled={loading || !f.venue_id}>{loading && <Loader2 className="animate-spin" />} Send reading</Button>
        <Button variant="outline" onClick={reset}>Reset test session</Button>
      </div>
      {history.length > 0 && <ol className="text-xs list-decimal pl-5 text-muted-foreground">{history.map((h, i) => <li key={i}>{h}</li>)}</ol>}
      <ArrivalResultTable arrival={result} />
    </div>
  );
}