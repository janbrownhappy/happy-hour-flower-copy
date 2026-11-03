import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const show = (v) => (v === '' || v == null ? '—' : v);

export default function DiscrepancyRow({ row, onDismiss }) {
  return (
    <div className="p-3 text-sm space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{row.venue_name || row.venue_id}</span>
          <Badge variant="secondary" className="text-[10px] shrink-0">{row.field}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="shrink-0">
          <X className="w-3.5 h-3.5 mr-1" /> Dismiss
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Current{row.current_source ? ` · ${row.current_source}` : ''}</p>
          <p className="break-all">{show(row.current_value)}</p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Found · {row.proposed_source}</p>
          <p className="break-all font-medium">{show(row.proposed_value)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {row.reason}{row.evidence ? ` · Evidence: ${row.evidence}` : ''}
        {row.detected_at ? ` · ${new Date(row.detected_at).toLocaleDateString()}` : ''}
      </p>
    </div>
  );
}