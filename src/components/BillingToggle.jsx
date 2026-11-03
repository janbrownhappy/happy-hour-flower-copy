// Segmented Monthly / Annual control shared by the plan pages.
// `savingsPct` (optional) renders a "Save ~N%" badge on the Annual segment.
export default function BillingToggle({ value, onChange, savingsPct, dark = false }) {
  const trackBase = dark ? 'bg-slate-800 border-slate-700' : 'bg-secondary border-border';
  const activeBg = dark ? 'bg-slate-700 text-white' : 'bg-card text-foreground shadow-sm';
  const idleText = dark ? 'text-slate-400 hover:text-slate-200' : 'text-muted-foreground hover:text-foreground';

  const Segment = ({ id, label }) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={`relative flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        value === id ? activeBg : idleText
      }`}
    >
      {label}
      {id === 'annual' && savingsPct > 0 && (
        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white align-middle">
          Save ~{savingsPct}%
        </span>
      )}
    </button>
  );

  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border p-1 ${trackBase}`}>
      <Segment id="monthly" label="Monthly" />
      <Segment id="annual" label="Annual" />
    </div>
  );
}