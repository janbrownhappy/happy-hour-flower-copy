import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

const DONE = ['COMPLETED', 'COMPLETED_WITH_REVIEW_ITEMS', 'SKIPPED'];
const STOPPED = ['STOPPED_BY_SAFETY_RULE', 'PAUSED_INFRASTRUCTURE', 'FAILED'];
const handledCount = (b) => (b.completed_venue_ids?.length || 0) + (b.failed_venue_ids?.length || 0) + (b.skipped_venue_ids?.length || 0);

export default function BatchRunnerProgress() {
  const [batches, setBatches] = useState(null);

  useEffect(() => {
    const load = () => base44.entities.EnrichmentBatch.filter({ phase_id: '2.5' }, 'batch_number', 200).then(setBatches);
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (!batches) return <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">Loading batch progress…</div>;
  if (!batches.length) return null;

  const totalVenues = batches.reduce((s, b) => s + (b.venue_ids?.length || 0), 0);
  const handled = batches.reduce((s, b) => s + (DONE.includes(b.batch_status) ? (b.venue_ids?.length || 0) : handledCount(b)), 0);
  const doneBatches = batches.filter((b) => DONE.includes(b.batch_status)).length;
  const current = batches.find((b) => !DONE.includes(b.batch_status));
  const stopped = current && STOPPED.includes(current.batch_status);
  const pct = totalVenues ? Math.round((handled / totalVenues) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Batch Runner Progress</h3>
        <span className="text-sm text-muted-foreground">{doneBatches} of {batches.length} batches · {handled} of {totalVenues} venues</span>
      </div>
      <Progress value={pct} />
      {current ? (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span>Current: Batch {current.batch_number}</span>
            <Badge variant={stopped ? 'destructive' : 'secondary'}>{current.batch_status}</Badge>
            <span className="text-muted-foreground">{handledCount(current)} / {current.venue_ids?.length || 0} venues</span>
          </div>
          {stopped && <p className="text-destructive text-xs break-words">{(current.stop_reason || current.integrity_result || '').slice(0, 300)}</p>}
        </div>
      ) : <p className="text-sm text-muted-foreground">All batches finished.</p>}
      <p className="text-xs text-muted-foreground">Refreshes every 30 seconds. The runner advances every 5 minutes.</p>
    </div>
  );
}