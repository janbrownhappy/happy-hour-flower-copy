import { useState, useEffect } from 'react';
import { getRetentionAccount } from '@/functions/getRetentionAccount';
import { recalcRetentionAccount } from '@/functions/recalcRetentionAccount';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RefreshCw, Store, Users, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { riskMeta, money, LIFECYCLE_META } from './riskUtils';
import { format } from 'date-fns';

export default function RetentionProfileDrawer({ accountRefId, open, onClose, onRecalced }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recalcing, setRecalcing] = useState(false);

  const load = () => {
    if (!accountRefId) return;
    setLoading(true);
    getRetentionAccount({ account_ref_id: accountRefId })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (open && accountRefId) load(); }, [open, accountRefId]);

  const recalc = async () => {
    if (!data?.profile) return;
    setRecalcing(true);
    try {
      await recalcRetentionAccount({ entity_type: data.profile.entity_type, account_ref_id: accountRefId, reason: 'manual' });
      load();
      onRecalced?.();
    } finally {
      setRecalcing(false);
    }
  };

  const profile = data?.profile;
  const m = profile ? riskMeta(profile.risk_category) : null;
  const life = profile?.lifecycle_status ? LIFECYCLE_META[profile.lifecycle_status] : null;

  const chartData = (data?.history || []).map(h => ({
    date: h.recorded_at ? format(new Date(h.recorded_at), 'MMM d') : '',
    score: h.churn_score,
  }));

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {profile?.entity_type === 'venue' ? <Store className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            {profile?.display_name || 'Retention Profile'}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No retention profile found for this account.</p>
        ) : (
          <div className="space-y-5 mt-4">
            {/* Score header */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-semibold border rounded-full px-2.5 py-1 ${m.badge}`}>{m.label} · {profile.churn_score}</span>
                <p className="text-xs text-muted-foreground mt-1.5">{profile.primary_risk_reason}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={recalc} disabled={recalcing}>
                <RefreshCw className={`w-3.5 h-3.5 ${recalcing ? 'animate-spin' : ''}`} />Recalculate
              </Button>
            </div>

            {/* Subscription + revenue */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">Subscription</p>
                <p className="text-sm font-semibold capitalize">{profile.subscription_tier || 'free'}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">Revenue at Risk</p>
                <p className="text-sm font-semibold">{money(profile.revenue_at_risk)}</p>
              </div>
              {life && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Lifecycle</p>
                  <p className={`text-sm font-semibold ${life.color}`}>{life.label}</p>
                </div>
              )}
              {profile.conversion_score != null && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Conversion Score</p>
                  <p className="text-sm font-semibold">{profile.conversion_score}</p>
                </div>
              )}
            </div>

            {/* Score history */}
            {chartData.length > 1 && (
              <div className="bg-card border border-border rounded-xl p-3">
                <h4 className="text-xs font-semibold mb-3">Score History</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Active signals */}
            <div>
              <h4 className="text-xs font-semibold mb-2">Active Signals</h4>
              <div className="space-y-1.5">
                {(data.signals || []).filter(s => s.is_active).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active risk signals.</p>
                ) : (
                  (data.signals || []).filter(s => s.is_active).map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-xs text-red-800 truncate">{s.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 shrink-0">+{s.points}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resolved signals */}
            {(data.signals || []).some(s => !s.is_active) && (
              <div>
                <h4 className="text-xs font-semibold mb-2">Recently Resolved</h4>
                <div className="space-y-1.5">
                  {(data.signals || []).filter(s => !s.is_active).slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consumer engagement rollups */}
            {(data.rollups || []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2">Weekly Engagement</h4>
                <div className="space-y-1">
                  {data.rollups.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs px-3 py-1.5 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Week of {r.week_start}</span>
                      <span className="font-medium">{r.total_activity} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.last_scored_at && (
              <p className="text-[11px] text-muted-foreground">Last scored {format(new Date(profile.last_scored_at), 'MMM d, yyyy h:mm a')}</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}