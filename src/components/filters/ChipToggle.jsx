import { Check } from 'lucide-react';

export default function ChipToggle({ label, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background border-border hover:border-primary text-foreground'
      }`}
    >
      {active ? <Check className="w-3 h-3" /> : Icon ? <Icon className="w-3 h-3" /> : null}
      {label}
    </button>
  );
}