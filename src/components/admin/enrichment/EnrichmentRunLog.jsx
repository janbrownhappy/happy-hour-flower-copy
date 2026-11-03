import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { History, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import RunLogVenueList, { venueOutcome } from '@/components/admin/enrichment/RunLogVenueList';

const PAGE = 20;

export default function EnrichmentRunLog() {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.EnrichmentBatch.list('-created_date', PAGE, page * PAGE),
      base44.entities.EnrichmentBatch.count({}),
    ]).then(([r, c]) => { setRuns(r); setTotal(c); }).finally(() => setLoading(false));
  }, [page]);

  const counts = (b) => {
    const c = { updated: 0, failed: 0, skipped: 0 };
    (b.results || []).forEach(r => { const o = venueOutcome(b, r); if (c[o] != null) c[o]++; });
    c.failed = Math.max(c.failed, (b.failed_venue_ids || []).length);
    return c;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Enrichment Run Log <span className="text-xs text-muted-foreground font-normal">({total} runs)</span></h3>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : !runs.length ? (
        <p className="text-sm text-muted-foreground">No enrichment runs recorded yet.</p>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border">
          {runs.map(b => {
            const c = counts(b);
            const isOpen = open === b.id;
            return (
              <div key={b.id}>
                <button onClick={() => setOpen(isOpen ? null : b.id)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-medium">Phase {b.phase_id} · Batch {b.batch_number}</span>
                  <span className="text-xs text-muted-foreground">{new Date(b.start_time || b.created_date).toLocaleString()}</span>
                  <span className="ml-auto text-xs flex gap-3">
                    <span className="text-emerald-700">{c.updated} updated</span>
                    <span className="text-destructive">{c.failed} failed</span>
                    <span className="text-muted-foreground">{c.skipped} skipped</span>
                  </span>
                </button>
                {isOpen && <div className="bg-muted/20"><RunLogVenueList batch={b} /></div>}
              </div>
            );
          })}
        </div>
      )}
      {total > PAGE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {Math.ceil(total / PAGE)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}