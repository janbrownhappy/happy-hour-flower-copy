import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { localDate } from '@/lib/truckStops';
import { truckStopAction } from '@/lib/truckStopApi';
import RepeatPicker from './RepeatPicker';

const blank = () => ({ location_name: '', address: '', lat: '', lng: '', instructions: '', date: localDate(), start_time: '11:00', end_time: '14:00' });

export default function StopForm({ venueId, initial, onDone, onCancel }) {
  const [s, setS] = useState(initial || blank());
  const [rec, setRec] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

  const geocode = async () => {
    setError(''); setBusy(true);
    try {
      const { result } = await truckStopAction('geocode', { query: s.address });
      if (!result) setError('Address not found — check it or enter coordinates');
      else setS({ ...s, lat: result.lat, lng: result.lng, address: result.formatted || s.address });
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const save = async () => {
    setError(''); setBusy(true);
    const stop = { ...s, lat: Number(s.lat), lng: Number(s.lng), end_date: s.end_time <= s.start_time ? undefined : s.date };
    if (s.end_time <= s.start_time) { const d = new Date(`${s.date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); stop.end_date = d.toISOString().slice(0, 10); }
    try {
      if (initial?.id) await truckStopAction('update', { stop_id: initial.id, stop });
      else await truckStopAction('create', { venue_id: venueId, stop, recurrence: rec, request_id: crypto.randomUUID() });
      onDone();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-3 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100">
      <div><Label>Location name</Label><Input value={s.location_name} onChange={set('location_name')} placeholder="Birds Fly South Ale Project" /></div>
      <div><Label>Street address</Label>
        <div className="flex gap-2"><Input value={s.address} onChange={set('address')} /><Button type="button" variant="outline" onClick={geocode} disabled={busy || !s.address}><MapPin /> Find</Button></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Latitude</Label><Input value={s.lat} onChange={set('lat')} /></div>
        <div><Label>Longitude</Label><Input value={s.lng} onChange={set('lng')} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Date</Label><Input type="date" value={s.date} onChange={set('date')} /></div>
        <div><Label>Start</Label><Input type="time" value={s.start_time} onChange={set('start_time')} /></div>
        <div><Label>End</Label><Input type="time" value={s.end_time} onChange={set('end_time')} /></div>
      </div>
      <div><Label>Instructions (optional)</Label><Input value={s.instructions || ''} onChange={set('instructions')} placeholder="Behind the brewery" /></div>
      {!initial?.id && <RepeatPicker value={rec} onChange={setRec} />}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save stop</Button>
      </div>
    </div>
  );
}