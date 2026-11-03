import { useState, useEffect, useCallback } from 'react';
import { getRetentionQueue } from '@/functions/getRetentionQueue';
import { Store, Users, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { RISK_ORDER, riskMeta, money } from './riskUtils';
import { LIFECYCLE_META } from './riskUtils';

export default function RetentionQueue({ onOpenAccount }) {
  const [risk, setRisk] = useState('at_risk');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('-churn_score');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, page_size: 25 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getRetentionQueue({ risk_category: risk, entity_type: type, sort, page, page_size: 25 })
      .then(res => setData(res.data))
      .catch(() => setData({ rows: [], total: 0, page: 1, page_size: 25 }))
      .finally(() => setLoading(false));
  }, [risk, type, sort, page]);
  useEffect(load, [load]);

  useEffect(() => { setPage(1); }, [risk, type, sort]);

  const totalPages = Math.max(1, Math.ceil(data.total / (data.page_size || 25)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-heading font-bold">At-Risk Queue</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              {RISK_ORDER.map(c => <SelectItem key={c} value={c}>{riskMeta(c).label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="venue">Venues</SelectItem>
              <SelectItem value="consumer">Consumers</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40 h-9"><ArrowUpDown className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-churn_score">Highest score</SelectItem>
              <SelectItem value="churn_score">Lowest score</SelectItem>
              <SelectItem value="-revenue_at_risk">Most $ at risk</SelectItem>
              <SelectItem value="-score_change">Fastest rising</SelectItem>
              <SelectItem value="-last_scored_at">Recently scored</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{data.total.toLocaleString()} matching account{data.total === 1 ? '' : 's'}</p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : data.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No accounts match these filters.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {data.rows.map(r => {
              const m = riskMeta(r.risk_category);
              const life = r.lifecycle_status ? LIFECYCLE_META[r.lifecycle_status] : null;
              return (
                <button key={r.id} onClick={() => onOpenAccount?.(r.account_ref_id)} className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/50 text-left transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {r.entity_type === 'venue' ? <Store className="w-4 h-4 text-muted-foreground shrink-0" /> : <Users className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.display_name || r.email || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.primary_risk_reason}
                        {life && <span className={`ml-1 ${life.color}`}>· {life.label}</span>}
                        {r.is_paid && <span className="ml-1 capitalize">· {r.subscription_tier}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {r.mrr > 0 && <span className="hidden sm:inline text-xs text-muted-foreground">{money(r.revenue_at_risk)}</span>}
                    {r.score_change !== 0 && (
                      <span className={`text-[11px] ${r.score_change > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {r.score_change > 0 ? '+' : ''}{r.score_change}
                      </span>
                    )}
                    <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${m.badge}`}>{r.churn_score}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" />Prev</button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">Next<ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}