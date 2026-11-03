import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Clock, MinusCircle } from 'lucide-react';

const ICONS = {
  queued: <Clock className="w-4 h-4 text-muted-foreground" />,
  working: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  partial: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
  skipped: <MinusCircle className="w-4 h-4 text-muted-foreground" />,
};

export default function BulkWebsiteResults({ jobs }) {
  if (!jobs.length) return null;
  return (
    <ul className="divide-y divide-border border border-border rounded-xl">
      {jobs.map(j => (
        <li key={j.id} className="flex items-start gap-2 px-3 py-2 text-sm">
          <span className="mt-0.5">{ICONS[j.status]}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate">{j.venue_name || j.url}</p>
            {j.venue_id && (
              <p className="text-xs text-muted-foreground">
                {j.updated_existing ? 'Updated existing' : 'Created'}
                {j.status === 'done' && ` · filled ${j.fields_filled || 0} fields, ${j.amenities_added || 0} amenities`}
                {' · '}<Link to={`/venue/${j.venue_id}`} className="underline">View</Link>
              </p>
            )}
            {j.note && <p className={`text-xs ${j.status === 'skipped' ? 'text-muted-foreground' : 'text-destructive'}`}>{j.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}