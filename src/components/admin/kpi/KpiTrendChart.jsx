import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function KpiTrendChart({ history, metricKey, label }) {
  const points = history.map((s) => ({ date: s.snapshot_date.slice(5), value: s.metrics?.[metricKey] ?? null }));
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
        <p className="font-semibold">{label} trend</p>
      </div>
      {points.length < 2 ? (
        <div className="py-10 text-center rounded-xl border border-dashed border-border bg-muted/30">
          <p className="text-sm font-medium">Trend builds over time</p>
          <p className="text-xs text-muted-foreground mt-1">Appears after two or more daily snapshots.</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} width={48} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#trendFill)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}