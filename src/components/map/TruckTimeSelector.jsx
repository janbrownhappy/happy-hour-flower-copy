import { Truck } from 'lucide-react';
import { addDays, localDate } from '@/lib/truckStops';

const MODES = [['now', 'Now'], ['tonight', 'Tonight'], ['tomorrow', 'Tomorrow']];

// Chooses which food-truck stops the map shows. Fixed venues are unaffected.
export default function TruckTimeSelector({ mode, date, onChange, confirmedOnly, onConfirmedOnly }) {
  const today = localDate();
  const chip = (active) => `flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-foreground text-background border-foreground' : 'bg-background border-border'}`;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-1">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 flex-shrink-0">
        <Truck className="w-3.5 h-3.5" /> Trucks
      </span>
      {MODES.map(([m, label]) => (
        <button key={m} className={chip(mode === m)} onClick={() => onChange(m, '')}>{label}</button>
      ))}
      <input
        type="date"
        min={today}
        max={addDays(today, 60)}
        value={mode === 'date' ? date : ''}
        onChange={(e) => e.target.value && onChange('date', e.target.value)}
        className={`${chip(mode === 'date')} h-7`}
        aria-label="Pick a date"
      />
      {mode === 'now' && (
        <button className={chip(confirmedOnly)} onClick={() => onConfirmedOnly(!confirmedOnly)}>
          Serving now (confirmed)
        </button>
      )}
    </div>
  );
}