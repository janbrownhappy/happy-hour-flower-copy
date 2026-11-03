import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterSection({ label, selectedCount = 0, open, onToggle, children }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {selectedCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium leading-none">
              {selectedCount}
            </span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="px-3 pb-3 pt-2 border-t border-border space-y-3">{children}</div>}
    </div>
  );
}