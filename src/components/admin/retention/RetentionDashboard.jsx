import { useState, useEffect } from 'react';
import { getRetentionOverview } from '@/functions/getRetentionOverview';
import { runRetentionOutreach } from '@/functions/runRetentionOutreach';
import {
  DollarSign, TrendingDown, AlertTriangle, Users, Store, Activity, RefreshCw, Send, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { RISK_META, RISK_ORDER, riskMeta, money } from './riskUtils';
import { Button } from '@/components/ui/button';

function Kpi({ icon: Icon, value, label, tone = 'default', sub }) {
  const tones = {
    default: 'bg-card border-border',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <div className={`border rounded-xl p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-80" />
        <span className="text-2xl font-bold leading-none">{value}</span>
      </div>
      <p className="text-xs opacity-80">{label}</p>
      {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RetentionDashboard({ onOpenAccount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    getRetentionOverview({})
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const sendOutreach = async () => {
    setBusy(true); setMsg('');
    try {
      const res = await runRetentionOutreach({});
      const s = res.data?.sent || {};
      setMsg(`Sent ${s.venue_nudge || 0} venue nudges, ${s.winback || 0} win-backs, ${s.payment_recovery || 0} payment recoveries.`);
    } catch {
      setMsg('Outreach run failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No retention data yet. Run scoring from the Settings tab.</p>;
  }

  const { totals, revenue, by_category, lifecycle, top_at_risk, last_run } = data;

  const catChart = RISK_ORDER.map(cat => ({ name: riskMeta(cat).label, cat, count: by_category[cat] || 0 }));
  const mrrRisk = revenue.live_mrr != null ? revenue.live_mrr : revenue.rules_mrr_total;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-heading font-bold">Retention Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
          <Button size="sm" className="gap-1.5" onClick={sendOutreach} disabled={busy}><Send className="w-3.5 h-3.5" />{busy ? 'Sending…' : 'Run Outreach'}</Button>
        </div>
      </div>

      {msg && <p className="text-xs bg-primary/10 text-primary rounded-lg px-3 py-2">{msg}</p>}

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={DollarSign} value={money(mrrRisk)} label="Total Paid MRR" tone="green" sub={revenue.live_mrr != null ? 'Live from Stripe' : 'Rules estimate'} />
        <Kpi icon={TrendingDown} value={money(revenue.mrr_at_risk)} label="MRR at Risk" tone="amber" />
        <Kpi icon={AlertTriangle} value={money(revenue.predicted_30d_loss)} label="Predicted 30-Day Loss" tone="red" sub="Rules-based, not ML" />
        <Kpi icon={DollarSign} value={money(revenue.venue_mrr)} label="Venue MRR" sub={`Consumer ${money(revenue.consumer_mrr)}`} />
      </div>

      {/* Account KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={AlertTriangle} value={totals.critical} label="Critical Accounts" tone="red" />
        <Kpi icon={AlertTriangle} value={totals.high_risk} label="High-Risk Accounts" tone="amber" />
        <Kpi icon={Activity} value={totals.avg_churn_score} label="Avg Churn Score" />
        <Kpi icon={Users} value={totals.accounts} label="Scored Accounts" sub={`${totals.venues} venues · ${totals.consumers} consumers`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Risk distribution */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {catChart.map(entry => <Cell key={entry.cat} fill={RISK_META[entry.cat].dot} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Consumer lifecycle */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Free Consumer Lifecycle</h3>
          <div className="grid grid-cols-5 gap-2">
            {['active', 'cooling', 'dormant', 'churned', 'reactivated'].map(k => (
              <div key={k} className="text-center bg-muted rounded-lg p-3">
                <p className="text-xl font-bold leading-none">{lifecycle[k] || 0}</p>
                <p className="text-[11px] text-muted-foreground mt-1 capitalize">{k}</p>
              </div>
            ))}
          </div>
          {last_run && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-4">
              <Info className="w-3 h-3" />
              Last scoring run: {last_run.processed} accounts ({last_run.phase}{last_run.completed_cycle ? ', cycle complete' : ''}) · {last_run.at ? new Date(last_run.at).toLocaleString() : ''}
            </p>
          )}
        </div>
      </div>

      {/* Accounts requiring attention */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Accounts Requiring Attention</h3>
        </div>
        {top_at_risk.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No high-risk or critical accounts right now.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {top_at_risk.map(a => {
              const m = riskMeta(a.risk_category);
              return (
                <button key={a.id} onClick={() => onOpenAccount?.(a.account_ref_id)} className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/50 text-left transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {a.entity_type === 'venue' ? <Store className="w-4 h-4 text-muted-foreground shrink-0" /> : <Users className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.display_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.primary_risk_reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {a.mrr > 0 && <span className="text-xs text-muted-foreground">{money(a.revenue_at_risk)} at risk</span>}
                    <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${m.badge}`}>{a.churn_score}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}