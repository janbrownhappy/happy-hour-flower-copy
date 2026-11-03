import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import DiscrepancyRow from '@/components/admin/enrichment/DiscrepancyRow';

const PAGE_SIZE = 20;

// Findings automated enrichment was NOT allowed to write (protected owner/admin values,
// or claimed-venue suggestions). Preserved so nothing an automated source found is lost.
export default function EnrichmentDiscrepancyList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    base44.entities.EnrichmentDiscrepancy.filter({ status: 'pending' }, '-detected_at', 2000)
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const dismiss = async (id) => {
    await base44.entities.EnrichmentDiscrepancy.update(id, { status: 'dismissed' });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" /> Enrichment Discrepancies
        </h3>
        <Badge variant="outline">{rows.length} pending</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Findings automated enrichment found but was not allowed to save, because the value is
        owner/admin-controlled or the venue is claimed. The venue record was left unchanged.
      </p>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No pending discrepancies.</p>
      ) : (
        <>
          <div className="divide-y divide-border rounded-xl border border-border">
            {pageRows.map((r) => <DiscrepancyRow key={r.id} row={r} onDismiss={() => dismiss(r.id)} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}