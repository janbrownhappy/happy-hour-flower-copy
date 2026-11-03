import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminLocation } from '@/lib/AdminLocationContext';
import { KPIS, KPI_SECTIONS, DEFAULT_OVERVIEW, kpiByKey } from '@/lib/kpiDefinitions';
import useKpiData from './useKpiData';
import KpiGrid from './KpiGrid';
import KpiTrendChart from './KpiTrendChart';
import KpiGeoBreakdown from './KpiGeoBreakdown';
import KpiLeaderboard from './KpiLeaderboard';
import KpiSourcesPanel from './KpiSourcesPanel';
import KpiTargetsPanel from './KpiTargetsPanel';
import KpiOverviewPicker from './KpiOverviewPicker';

const TRENDS = { consumers: 'profiles_total', engagement: 'mau', venues: 'venues_active', revenue: 'mrr_total', acquisition: 'qr_scans_30d', ambassadors: 'ambassador_referrals' };
const SETTING = 'kpi_overview_cards';

export default function ExecutiveKpiDashboard() {
  const { locationFilter, setLocationFilter } = useAdminLocation();
  const [range, setRange] = useState(30);
  const [cards, setCards] = useState(DEFAULT_OVERVIEW);
  const [settingId, setSettingId] = useState(null);
  const { data, isLoading } = useKpiData(locationFilter, range);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: SETTING }).then(([s]) => {
      if (s) { setSettingId(s.id); try { setCards(JSON.parse(s.value_string)); } catch (_) {} }
    });
  }, []);
  const saveCards = async (next) => {
    setCards(next);
    const value_string = JSON.stringify(next);
    if (settingId) await base44.entities.AppSetting.update(settingId, { value_string });
    else setSettingId((await base44.entities.AppSetting.create({ key: SETTING, value_string })).id);
  };
  const drill = (level, r) => {
    if (level === 'state') setLocationFilter({ state_code: r.scope_id, market_id: null, area_id: null });
    else if (level === 'market') setLocationFilter({ ...locationFilter, market_id: r.scope_id, area_id: null });
    else setLocationFilter({ ...locationFilter, area_id: r.scope_id });
  };

  if (isLoading || !data) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  const latest = data.global.latest;
  const trendSrc = (key) => (kpiByKey[key]?.geo ? data.scoped : data.global).history;

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg flex flex-wrap items-end justify-between gap-4">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">{data.scoped.latest?.scope_name || 'All HHF'}</p>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Executive KPIs</h1>
          <div className="flex flex-wrap gap-6 mt-4">
            {[['MRR', 'mrr_total', '$'], ['Active venues', 'venues_active'], ['MAU', 'mau']].map(([l, k, p]) => (
              <div key={k}><p className="text-xs text-white/75">{l}</p><p className="text-2xl font-bold">{latest?.metrics?.[k] != null ? `${p || ''}${Number((k === 'venues_active' ? data.scoped : data.global).latest?.metrics?.[k] ?? 0).toLocaleString()}` : '—'}</p></div>
            ))}
          </div>
          <p className="text-xs text-white/80 mt-3">{latest ? `Snapshot ${latest.snapshot_date} · collected ${new Date(latest.collected_at).toLocaleString()}` : 'No snapshot collected yet — use Collect now under Targets & Sources.'}</p>
        </div>
        <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
          <SelectTrigger className="relative w-48 bg-white/15 border-white/30 text-white rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>{[7, 30, 90, 365].map((d) => <SelectItem key={d} value={String(d)}>Compare vs {d} days ago</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto"><TabsList className="w-max h-auto rounded-full p-1 bg-muted">
          <TabsTrigger className="rounded-full px-4 py-1.5 data-[state=active]:shadow-sm" value="overview">Overview</TabsTrigger>
          {KPI_SECTIONS.map((s) => <TabsTrigger className="rounded-full px-4 py-1.5 data-[state=active]:shadow-sm" key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
          <TabsTrigger className="rounded-full px-4 py-1.5 data-[state=active]:shadow-sm" value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger className="rounded-full px-4 py-1.5 data-[state=active]:shadow-sm" value="config">Targets & Sources</TabsTrigger>
        </TabsList></div>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex justify-end"><KpiOverviewPicker selected={cards} onChange={saveCards} /></div>
          <KpiGrid kpis={cards.map((k) => kpiByKey[k]).filter(Boolean)} data={data} />
          <KpiTrendChart history={data.global.history} metricKey="mrr_total" label="MRR" />
        </TabsContent>

        {KPI_SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="space-y-4 mt-4">
            <KpiGrid kpis={KPIS.filter((k) => k.section === s.id)} data={data} />
            <KpiTrendChart history={trendSrc(TRENDS[s.id])} metricKey={TRENDS[s.id]} label={kpiByKey[TRENDS[s.id]].label} />
            {s.id === 'ambassadors' && <KpiLeaderboard rows={latest?.details?.leaderboard || []} />}
          </TabsContent>
        ))}

        <TabsContent value="marketplace" className="space-y-4 mt-4">
          <KpiGrid kpis={KPIS.filter((k) => k.section === 'venues' && k.geo).slice(0, 8)} data={data} />
          {data.scope.level === 'area'
            ? <p className="text-sm text-muted-foreground">Area is the most detailed level. Clear the Area filter to compare Areas.</p>
            : <KpiGeoBreakdown scope={data.scope} snapshotDate={data.scoped.latest?.snapshot_date || latest?.snapshot_date} onDrill={drill} />}
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-4">
          <KpiSourcesPanel sources={data.sources} />
          <KpiTargetsPanel scope={data.scope} targets={data.allTargets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}