import KpiCard from './KpiCard';

// Renders KPI cards, choosing scoped values for geo metrics and company-wide values otherwise.
export default function KpiGrid({ kpis, data }) {
  const geoScoped = data.scope.level !== 'all';
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => {
        const src = k.geo ? data.scoped : data.global;
        const t = data.targets.find((x) => x.metric_key === k.key);
        return (
          <KpiCard key={k.key} kpi={k}
            value={src.latest?.metrics?.[k.key]} prior={src.prior?.metrics?.[k.key]} hasPrior={!!src.prior}
            target={t?.target_value} spark={src.history.map((s) => s.metrics?.[k.key] ?? null)} outOfScope={geoScoped && !k.geo && !k.missing} />
        );
      })}
    </div>
  );
}