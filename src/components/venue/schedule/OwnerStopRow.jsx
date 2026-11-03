import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatStopTime, stopLabel, stopPhase } from '@/lib/truckStops';
import { truckStopAction } from '@/lib/truckStopApi';
import { useToast } from '@/components/ui/use-toast';

export default function OwnerStopRow({ stop, now, onEdit, onChanged }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const phase = stopPhase(stop, now);
  const f = formatStopTime(stop);
  const live = phase === 'upcoming' || phase === 'scheduled_now' || phase === 'serving';

  const run = async (action, extra = {}) => {
    setBusy(true);
    try {
      await truckStopAction(action, { stop_id: stop.id, ...extra });
      const msgs = { finish: extra.reason === 'sold_out' ? 'Marked sold out — you\'re off the map for today' : 'Stop ended — you\'re off the map for today', checkin: 'You\'re live! Followers were notified', confirm: 'Stop confirmed', cancel: 'Stop canceled' };
      if (msgs[action]) toast({ title: msgs[action] });
      onChanged?.();
    }
    catch (e) {
      if (e.code === 'EARLY' && window.confirm('This stop has not started yet. Start serving now?')) await run('checkin', { start_now: true });
      else toast({ title: e.message, variant: 'destructive' });
    }
    setBusy(false);
  };
  const cancel = () => {
    const future = stop.series_id && window.confirm('Cancel all future stops in this series? (Cancel = only this one)');
    run('cancel', { scope: future ? 'future' : 'this' });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100">
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-semibold">{stop.location_name}</p>
          <p className="text-xs text-slate-400">{stop.address}</p>
          <p className="text-sm">{f.day} · {f.hours}</p>
        </div>
        <span className="text-xs text-amber-300 text-right">{stopLabel(stop, now).text}{stop.confirmed_at && phase === 'upcoming' ? ' · confirmed' : ''}</span>
      </div>
      {live && (
        <div className="flex flex-wrap gap-2 mt-2">
          {phase !== 'serving' && <Button size="sm" disabled={busy} onClick={() => run('checkin')}>We're Here</Button>}
          {phase === 'upcoming' && !stop.confirmed_at && <Button size="sm" variant="outline" disabled={busy} onClick={() => run('confirm')}>Confirm</Button>}
          {phase === 'serving' && <>
            <span className="inline-flex items-center gap-1 px-3 h-8 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Notification Sent</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run('finish', { reason: 'sold_out' })}>Sold out</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run('finish', { reason: 'finished_early' })}>Finish early</Button>
          </>}
          {phase === 'upcoming' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(stop)}>Edit</Button>}
          {phase !== 'serving' && <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel stop</Button>}
        </div>
      )}
    </div>
  );
}