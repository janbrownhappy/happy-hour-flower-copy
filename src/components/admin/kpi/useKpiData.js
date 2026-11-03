import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Resolves the active territory filter to a snapshot scope.
export function scopeFromFilter(f) {
  if (f?.area_id) return { level: 'area', id: f.area_id };
  if (f?.market_id) return { level: 'market', id: f.market_id };
  if (f?.state_code) return { level: 'state', id: f.state_code };
  return { level: 'all', id: 'all' };
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function useKpiData(filter, rangeDays) {
  const scope = scopeFromFilter(filter);
  return useQuery({
    queryKey: ['kpi', scope.level, scope.id, rangeDays],
    queryFn: async () => {
      const [scoped, global, targets, sources] = await Promise.all([
        base44.entities.KpiSnapshot.filter({ scope_level: scope.level, scope_id: scope.id }, '-snapshot_date', 400),
        scope.level === 'all' ? null : base44.entities.KpiSnapshot.filter({ scope_level: 'all' }, '-snapshot_date', 400),
        base44.entities.KpiTarget.list('-effective_from', 500),
        base44.entities.KpiSourceSync.list(),
      ]);
      const allSnaps = global || scoped;
      const pick = (rows) => {
        const latest = rows[0] || null;
        const cutoff = latest ? new Date(new Date(latest.snapshot_date).getTime() - rangeDays * 86400000).toISOString().slice(0, 10) : null;
        const prior = latest ? rows.find((r) => r.snapshot_date <= cutoff) || null : null;
        const history = rows.filter((r) => r.snapshot_date >= daysAgo(Math.max(rangeDays, 30))).reverse();
        return { latest, prior, history };
      };
      const today = new Date().toISOString().slice(0, 10);
      const activeTargets = targets.filter((t) => t.effective_from <= today && (!t.effective_to || t.effective_to >= today)
        && ((t.scope_level || 'all') === 'all' ? scope.level === 'all' : t.scope_id === scope.id));
      return { scope, scoped: pick(scoped), global: pick(allSnaps), targets: activeTargets, allTargets: targets, sources };
    },
  });
}