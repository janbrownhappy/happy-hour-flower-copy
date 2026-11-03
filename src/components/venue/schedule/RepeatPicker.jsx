import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Weekly repeat: weekdays (0=Sun) until an end date (max 12 weeks, enforced server-side).
export default function RepeatPicker({ value, onChange }) {
  const on = !!value;
  const toggleDay = (i) => {
    const w = new Set(value.weekdays);
    w.has(i) ? w.delete(i) : w.add(i);
    onChange({ ...value, weekdays: [...w] });
  };
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={on} onCheckedChange={(c) => onChange(c ? { weekdays: [], until: '' } : null)} /> Repeat weekly
      </label>
      {on && (
        <div className="space-y-2 pl-6">
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => toggleDay(i)}
                className={`px-2 py-1 rounded-full text-xs border ${value.weekdays.includes(i) ? 'bg-amber-500 text-black border-amber-500' : 'border-slate-600'}`}>{d}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">Until <Input type="date" className="w-44" value={value.until} onChange={(e) => onChange({ ...value, until: e.target.value })} /></div>
        </div>
      )}
    </div>
  );
}