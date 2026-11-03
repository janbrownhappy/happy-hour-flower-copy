import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Save, CheckCircle, Truck } from 'lucide-react';
import { saveTruckSchedule } from '@/functions/saveTruckSchedule';
import TruckStopRow from '@/components/venue/TruckStopRow';
import { sortedAppearances, todayIso } from '@/lib/truckSchedule';

export default function TruckScheduleEditor({ venue, canEdit, onSaved }) {
  const [stops, setStops] = useState(() => sortedAppearances(venue));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const updateStop = (index, next) =>
    setStops((prev) => prev.map((s, i) => (i === index ? next : s)));
  const removeStop = (index) => setStops((prev) => prev.filter((_, i) => i !== index));
  const addStop = () =>
    setStops((prev) => [
      ...prev,
      { date: todayIso(), location_name: '', address: '', start_time: '', end_time: '', source: 'owner' },
    ]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await saveTruckSchedule({ venue_id: venue.id, schedule: stops });
      if (res?.data?.success) {
        setStops(sortedAppearances(res.data.venue));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onSaved?.(res.data.venue);
      } else {
        setError(res?.data?.error || 'Could not save your schedule.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not save your schedule.');
    } finally {
      setSaving(false);
    }
  };

  const pending = venue.schedule_pending_confirmation;

  return (
    <div className="space-y-4">
      {pending && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <p className="text-amber-300 text-sm font-semibold">This week's stops need confirming</p>
          <p className="text-amber-200/80 text-xs mt-1">
            We pre-filled them from the weekly food truck roundup. Check each one and save — your truck
            stays hidden from the map until its stops are confirmed.
          </p>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-white font-semibold flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" /> Where You'll Be
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            One stop per date — park somewhere different every day if you like. Add dates as far ahead as you want.
          </p>
        </div>

        {stops.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
            <p className="text-3xl mb-2">🚚</p>
            <p className="text-slate-400 text-sm">No stops scheduled yet.</p>
            <p className="text-slate-500 text-xs mt-1">Add your first stop so customers can find you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stops.map((stop, i) => (
              <TruckStopRow
                key={`${stop.date || 'new'}-${i}`}
                stop={stop}
                index={i}
                canEdit={canEdit}
                onChange={updateStop}
                onRemove={removeStop}
              />
            ))}
          </div>
        )}

        {canEdit && (
          <button
            onClick={addStop}
            className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-sm font-medium text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add a stop
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {canEdit ? (
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 font-semibold text-white rounded-xl ${
            saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Schedule confirmed!</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Confirm &amp; Publish Schedule</>
          )}
        </Button>
      ) : (
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">You have view-only access. Contact an owner or editor to make changes.</p>
        </div>
      )}
    </div>
  );
}