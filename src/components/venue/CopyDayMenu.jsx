import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

/**
 * Inline "Copy to other days" control shown inside a single day's card.
 * Lets the owner pick which other days should receive THIS day's times & deals.
 */
export default function CopyDayMenu({ sourceDay, onCopy }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);

  const toggle = (d) => {
    setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const close = () => { setOpen(false); setSelected([]); };

  const confirm = () => {
    if (selected.length) onCopy(selected);
    close();
  };

  const others = DAYS.filter(d => d !== sourceDay);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" /> Copy these times & deals to other days
      </button>
    );
  }

  return (
    <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-3 space-y-2.5">
      <p className="text-xs text-slate-300 font-medium">
        Apply <span className="text-amber-300 font-semibold">{DAY_FULL[sourceDay]}</span>'s times & deals to:
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {others.map(d => (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              selected.includes(d)
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {selected.includes(d) && <Check className="w-3 h-3" />}
            {DAY_FULL[d]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={confirm}
          disabled={selected.length === 0}
          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Apply to {selected.length || 0} day{selected.length !== 1 ? 's' : ''}
        </button>
        <button
          onClick={close}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
}