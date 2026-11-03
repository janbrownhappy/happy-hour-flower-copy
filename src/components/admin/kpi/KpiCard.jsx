import { ArrowDownRight, ArrowUpRight, Info, Target } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatKpi, pctChange } from '@/lib/kpiDefinitions';

export default function KpiCard({ kpi, value, prior, hasPrior, target, outOfScope, spark = [] }) {
  const unavailable = kpi.missing || (outOfScope ? 'Company-wide only' : null) || (value == null ? 'Insufficient Data' : null);
  const change = !unavailable && hasPrior ? pctChange(value, prior) : null;
  const up = change != null && change >= 0;
  const progress = target && value != null ? Math.min(100, Math.round((value / target) * 100)) : null;
  const gid = `spark-${kpi.key}`;
  return (
    <div className="group relative overflow-hidden bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 min-h-[150px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-snug">{kpi.label}</p>
        {kpi.def && <span title={kpi.def}><Info className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" /></span>}
      </div>
      {unavailable ? (
        <div className="mt-auto">
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{unavailable}</span>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <p className="font-heading text-3xl font-bold leading-none tracking-tight">{formatKpi(value, kpi.fmt)}</p>
            {change != null && (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(change)}%
              </span>
            )}
          </div>
          {spark.length > 1 ? (
            <div className="h-10 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark.map((v, i) => ({ i, v }))}>
                  <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#${gid})`} dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{hasPrior ? (change == null ? 'Change N/A' : 'vs prior period') : 'No prior snapshot yet'}</p>
          )}
          {progress != null && (
            <div className="mt-auto space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Target className="w-3 h-3" />Target {formatKpi(target, kpi.fmt)}</span><span>{progress}%</span></div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}