import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Copy } from 'lucide-react';
import useTruckStops from '@/hooks/useTruckStops';
import { stopPhase } from '@/lib/truckStops';
import { truckStopAction } from '@/lib/truckStopApi';
import { useToast } from '@/components/ui/use-toast';
import StopForm from './StopForm';
import OwnerStopRow from './OwnerStopRow';

const toForm = (s) => ({ id: s.id, location_name: s.location_name, address: s.address, lat: s.lat, lng: s.lng, instructions: s.instructions, date: s.local_date, start_time: s.start_time, end_time: s.end_time });

export default function MySchedule({ venue, canEdit }) {
  const { stops, now, loading, reload } = useTruckStops({ venueId: venue.id, pastDays: 14 });
  const [form, setForm] = useState(null); // null | 'new' | stop
  const { toast } = useToast();

  const copyWeek = async () => {
    try {
      const { preview } = await truckStopAction('copy_week', { venue_id: venue.id });
      if (!preview?.length) return toast({ title: 'No stops last week to copy' });
      if (!window.confirm(`Copy ${preview.length} stop(s) from last week into this week?`)) return;
      await truckStopAction('copy_week', { venue_id: venue.id, commit: true, request_id: crypto.randomUUID() });
      reload();
    } catch (e) { toast({ title: e.message, variant: 'destructive' }); }
  };

  const active = stops.filter((s) => ['upcoming', 'scheduled_now', 'serving'].includes(stopPhase(s, now)));
  const past = stops.filter((s) => !active.includes(s)).reverse();
  const done = () => { setForm(null); reload(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-white">My Schedule</h2>
        {canEdit && <div className="flex gap-2">
          <Button variant="outline" onClick={copyWeek}><Copy /> Copy last week</Button>
          <Button onClick={() => setForm('new')}><Plus /> Add stop</Button>
        </div>}
      </div>
      {form && <StopForm venueId={venue.id} initial={form === 'new' ? null : toForm(form)} onDone={done} onCancel={() => setForm(null)} />}
      {loading ? <Loader2 className="animate-spin text-slate-400" /> : (
        <>
          {!active.length && <p className="text-slate-400 text-sm">No upcoming stops. Add one so customers can find you.</p>}
          {active.map((s) => <OwnerStopRow key={s.id} stop={s} now={now} onEdit={setForm} onChanged={reload} />)}
          {past.length > 0 && <h3 className="text-sm font-semibold text-slate-400 pt-2">Past & canceled</h3>}
          {past.map((s) => <OwnerStopRow key={s.id} stop={s} now={now} onEdit={setForm} onChanged={reload} />)}
        </>
      )}
    </div>
  );
}