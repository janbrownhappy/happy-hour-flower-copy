import { Link } from 'react-router-dom';

const STYLES = {
  updated: 'bg-emerald-500/10 text-emerald-700',
  failed: 'bg-destructive/10 text-destructive',
  skipped: 'bg-muted text-muted-foreground',
  'no changes': 'bg-amber-500/10 text-amber-700',
};

export function venueOutcome(batch, r) {
  if ((batch.failed_venue_ids || []).includes(r.venue_id) || r.error) return 'failed';
  if ((batch.skipped_venue_ids || []).includes(r.venue_id)) return 'skipped';
  if ((r.fields_updated || []).length || r.amen_added > 0 || (r.auto_saved || []).length) return 'updated';
  return 'no changes';
}

export default function RunLogVenueList({ batch }) {
  const results = batch.results || [];
  const seen = new Set(results.map(r => r.venue_id));
  const missingFailed = (batch.failed_venue_ids || []).filter(id => !seen.has(id)).map(id => ({ venue_id: id, error: 'Failed (no details recorded)' }));
  const rows = [...results, ...missingFailed];
  if (!rows.length) return <p className="text-xs text-muted-foreground px-3 py-2">No venue-level results recorded for this run.</p>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((r, i) => {
        const o = venueOutcome(batch, r);
        const detail = r.error || (r.fields_updated || []).join(', ') || (r.amen_added ? `${r.amen_added} amenities added` : '');
        return (
          <li key={r.venue_id || i} className="flex items-start gap-3 px-3 py-2 text-sm">
            <span className={`text-[11px] font-semibold rounded-md px-2 py-0.5 shrink-0 ${STYLES[o]}`}>{o}</span>
            <div className="min-w-0 flex-1">
              <Link to={`/venue/${r.venue_id}`} className="font-medium hover:underline">{r.venue_name || 'Unnamed venue'}</Link>
              {detail && <p className={`text-xs ${o === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}