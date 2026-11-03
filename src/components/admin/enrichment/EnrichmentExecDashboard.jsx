import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { BarChart3, Loader2 } from 'lucide-react';
import { summarize, DEFAULT_RATES } from '@/components/admin/enrichment/batchRunStats';

const RANGES = [10, 25, 50];
const usd = (n) => `$${n.toFixed(2)}`;

const Stat = ({ label, value, tone = 'text-foreground' }) => (
  <div className="bg-muted/40 rounded-xl p-3">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
  </div>
);

export default function EnrichmentExecDashboard() {
  const [n, setN] = useState(25);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    setLoading(true);
    base44.entities.EnrichmentBatch.list('-created_date', n).then(setBatches).finally(() => setLoading(false));
  }, [n]);

  const s = useMemo(() => summarize(batches, rates), [batches, rates]);
  const rate = s.venues ? Math.round((s.updated / s.venues) * 100) : 0;
  const rateField = (key, label, unit) => (
    <label className="text-xs text-muted-foreground space-y-1">
      <span>{label} ({unit})</span>
      <Input type="number" step="0.001" min="0" value={rates[key]} onChange={e => setRates(r => ({ ...r, [key]: Number(e.target.value) || 0 }))} />
    </label>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Batch Enrichment — Executive Summary</h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r} onClick={() => setN(r)} className={`text-xs px-3 rounded-md border ${n === r ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Last {r} runs</button>
          ))}
        </div>
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Venues processed" value={s.venues} />
            <Stat label="Updated" value={s.updated} tone="text-emerald-700" />
            <Stat label="Failed" value={s.failed} tone="text-destructive" />
            <Stat label="Success rate" value={`${rate}%`} />
          </div>
          <p className="text-xs text-muted-foreground">{s.runs} runs · {s.noChange} checked with no changes · {s.skipped} skipped</p>
          <div className="border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">Estimated cost</p>
              <p className="text-2xl font-bold">{usd(s.cost.total)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <p>Google Places: {s.places} lookups · <b>{usd(s.cost.places)}</b></p>
              <p>Scrapfly: {s.scrapfly} requests · <b>{usd(s.cost.scrapfly)}</b></p>
              <p>AI research: {s.ai} calls · <b>{usd(s.cost.ai)}</b></p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rateField('places', 'Places', '$/venue')}
              {rateField('scrapfly', 'Scrapfly', '$/request')}
              {rateField('ai', 'AI', '$/call')}
            </div>
            <p className="text-[11px] text-muted-foreground">Estimate only: request counts come from what each run recorded, multiplied by the rates above. Adjust the rates to match your provider bills. Photo fetching and retries that weren't recorded aren't included.</p>
          </div>
        </>
      )}
    </div>
  );
}