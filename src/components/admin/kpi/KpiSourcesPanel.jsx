import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { collectKpiSnapshots } from '@/functions/collectKpiSnapshots';

const LABELS = { hhf_internal: 'HHF internal data', stripe: 'Stripe', partnero: 'Partnero', meta: 'Meta Ads', website_analytics: 'Website analytics' };
const TONE = { success: 'bg-emerald-100 text-emerald-800', failed: 'bg-red-100 text-red-800', not_connected: 'bg-muted text-muted-foreground' };

export default function KpiSourcesPanel({ sources }) {
  const [running, setRunning] = useState(false);
  const qc = useQueryClient();
  const run = async () => {
    setRunning(true);
    await collectKpiSnapshots({}).finally(() => setRunning(false));
    qc.invalidateQueries({ queryKey: ['kpi'] });
    qc.invalidateQueries({ queryKey: ['kpi-geo'] });
  };
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div><p className="text-sm font-semibold">Data sources</p><p className="text-xs text-muted-foreground">Collected daily at 5:00 AM ET</p></div>
        <Button size="sm" onClick={run} disabled={running} className="gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />{running ? 'Collecting…' : 'Collect now'}</Button>
      </div>
      <div className="divide-y divide-border">
        {sources.map((s) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0"><p className="font-medium text-sm">{LABELS[s.source] || s.source}</p><p className="text-xs text-muted-foreground truncate">{s.message}</p></div>
            <div className="text-right">
              <Badge className={TONE[s.status]}>{s.status === 'not_connected' ? 'Not connected' : s.status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{s.last_success_at ? `Last success ${new Date(s.last_success_at).toLocaleString()}` : 'Never collected'}</p>
            </div>
          </div>
        ))}
        {!sources.length && <p className="p-6 text-center text-sm text-muted-foreground">No collection has run yet.</p>}
      </div>
    </div>
  );
}