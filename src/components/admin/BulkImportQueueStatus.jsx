import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import BulkWebsiteResults from '@/components/admin/BulkWebsiteResults';

const STATES = ['queued', 'working', 'done', 'partial', 'failed', 'skipped'];

export default function BulkImportQueueStatus({ refreshKey }) {
  const [counts, setCounts] = useState({});
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [agg, page] = await Promise.all([
        base44.entities.WebsiteImportJob.aggregate({ groupBy: 'status' }),
        base44.entities.WebsiteImportJob.filter({ status: { $in: ['working', 'done', 'partial', 'failed', 'skipped'] } }, { sort: '-updated_date', limit: 25 }),
      ]);
      setCounts(Object.fromEntries((agg.rows || []).map(r => [r.status, r.count])));
      setRecent(page.items);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [refreshKey]);

  const total = STATES.reduce((s, k) => s + (counts[k] || 0), 0);
  if (!total) return null;
  const left = (counts.queued || 0) + (counts.working || 0);
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-sm font-medium">Background queue: {(total - left).toLocaleString()} of {total.toLocaleString()} processed</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {STATES.map(s => <span key={s} className="bg-muted rounded-full px-2.5 py-1 capitalize">{s}: {(counts[s] || 0).toLocaleString()}</span>)}
      </div>
      {left > 0 && <p className="text-xs text-muted-foreground">About 6 sites every 5 minutes. Updates every 30 seconds.</p>}
      <BulkWebsiteResults jobs={recent} />
    </div>
  );
}