import { Input } from '@/components/ui/input';
import { Trash2, MapPin, AlertCircle } from 'lucide-react';
import { dayLabel } from '@/lib/truckSchedule';

const field = 'bg-slate-700 border-slate-600 text-white h-10 text-sm';

export default function TruckStopRow({ stop, index, canEdit, onChange, onRemove }) {
  const set = (key, value) => onChange(index, { ...stop, [key]: value });
  const incomplete = !stop.date || !stop.start_time || !stop.end_time;

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={stop.date || ''}
          disabled={!canEdit}
          onChange={(e) => set('date', e.target.value)}
          className={`${field} w-[150px]`}
        />
        <span className="text-xs font-semibold text-amber-400 w-8">{dayLabel(stop.date)}</span>
        <div className="flex-1" />
        {canEdit && (
          <button
            onClick={() => onRemove(index)}
            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
            aria-label="Remove stop"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <Input
        value={stop.location_name || ''}
        disabled={!canEdit}
        onChange={(e) => set('location_name', e.target.value)}
        className={field}
        placeholder="Where you're parked (e.g. Birds Fly South Ale Project)"
      />
      <Input
        value={stop.address || ''}
        disabled={!canEdit}
        onChange={(e) => set('address', e.target.value)}
        className={field}
        placeholder="Street address — used to drop your pin on the map"
      />

      <div className="flex items-center gap-2">
        <Input
          value={stop.start_time || ''}
          disabled={!canEdit}
          onChange={(e) => set('start_time', e.target.value)}
          className={field}
          placeholder="Start (5:00 PM)"
        />
        <span className="text-slate-500 text-sm">–</span>
        <Input
          value={stop.end_time || ''}
          disabled={!canEdit}
          onChange={(e) => set('end_time', e.target.value)}
          className={field}
          placeholder="End (9:00 PM)"
        />
      </div>

      {incomplete ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" /> Add a date and both times — customers only see confirmed stops.
        </p>
      ) : Number.isFinite(Number(stop.lat)) ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <MapPin className="w-3.5 h-3.5" /> Pinned on the map
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5" /> Pin will be placed from the address when you save
        </p>
      )}
    </div>
  );
}