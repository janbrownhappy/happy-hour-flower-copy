import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatKpi } from '@/lib/kpiDefinitions';
import downloadCsv from './downloadCsv';

const COLS = [
  ['venues_active', 'Active venues'], ['venues_paid', 'Paid'], ['venues_paid_pct', 'Paid %', 'pct'],
  ['venues_fresh_pct', 'Fresh %', 'pct'], ['specials_total', 'Specials'], ['profiles_total', 'Profiles'], ['consumers_paid', 'Paid consumers'],
];
const CHILD = { all: 'state', state: 'market', market: 'area' };

// Marketplace drill-down: child geographies of the current scope from the latest snapshot.
export default function KpiGeoBreakdown({ scope, snapshotDate, onDrill }) {
  const childLevel = CHILD[scope.level];
  const { data: rows = [] } = useQuery({
    queryKey: ['kpi-geo', scope.level, scope.id, snapshotDate],
    enabled: !!childLevel && !!snapshotDate,
    queryFn: () => base44.entities.KpiSnapshot.filter({ snapshot_date: snapshotDate, scope_level: childLevel,
      ...(scope.level === 'all' ? {} : { parent_id: scope.id }) }, 'scope_name', 500),
  });
  if (!childLevel) return null;
  const sorted = [...rows].sort((a, b) => (b.metrics?.venues_active || 0) - (a.metrics?.venues_active || 0));
  const exportCsv = () => downloadCsv(`hhf-${childLevel}-kpis-${snapshotDate}.csv`, ['Name', ...COLS.map((c) => c[1])],
    sorted.map((r) => [r.scope_name, ...COLS.map((c) => r.metrics?.[c[0]] ?? '')]));
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <p className="text-sm font-semibold capitalize">{childLevel} breakdown ({sorted.length})</p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv} disabled={!sorted.length}><Download className="w-3.5 h-3.5" />CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground">
            <th className="p-3">Name</th>{COLS.map((c) => <th key={c[0]} className="p-3 text-right whitespace-nowrap">{c[1]}</th>)}
          </tr></thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/50 cursor-pointer" onClick={() => onDrill(childLevel, r)}>
                <td className="p-3 font-medium">{r.scope_name}</td>
                {COLS.map((c) => <td key={c[0]} className="p-3 text-right">{formatKpi(r.metrics?.[c[0]], c[2])}</td>)}
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan={COLS.length + 1} className="p-6 text-center text-muted-foreground">No geography snapshots yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}