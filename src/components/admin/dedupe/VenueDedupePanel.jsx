import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Search, AlertTriangle, Check, Copy } from 'lucide-react';
import DedupeClusterCard from '@/components/admin/dedupe/DedupeClusterCard';

export default function VenueDedupePanel() {
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [report, setReport] = useState(null);
  const [selected, setSelected] = useState({});
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const scan = async () => {
    setScanning(true);
    setError('');
    setSummary(null);
    try {
      const { data } = await base44.functions.invoke('dedupeVenues', {});
      if (data?.error) throw new Error(data.error);
      setReport(data);
      // Default: every detected cluster is included.
      setSelected(Object.fromEntries(data.clusters.map((c) => [c.cluster_id, true])));
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const approvedIds = Object.keys(selected).filter((id) => selected[id]);

  const execute = async () => {
    setExecuting(true);
    setError('');
    try {
      const { data } = await base44.functions.invoke('dedupeVenues', {
        execute: true,
        cluster_ids: approvedIds,
      });
      if (data?.error) throw new Error(data.error);
      setSummary(data);
      setReport(null);
      setSelected({});
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const deletions = report
    ? report.clusters
        .filter((c) => selected[c.cluster_id])
        .reduce((n, c) => n + c.duplicates.length, 0)
    : 0;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Copy className="w-4 h-4 text-primary" /> Duplicate Venue Cleanup
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Finds venues that share the same street address <em>and</em> a similar name — the same
            business listed twice. Distinct businesses at one address (food-hall stalls, suite-mates)
            are left alone. The most complete record survives; everything attached to the duplicates
            (deals, amenities, reviews, favorites, check-ins) moves onto it before they're deleted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={scan} disabled={scanning || executing}>
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {report ? 'Re-run scan' : 'Run scan'}
          </Button>
          {report && (
            <Button variant="destructive" onClick={execute} disabled={executing || !approvedIds.length}>
              {executing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Merge & delete {deletions} duplicate{deletions === 1 ? '' : 's'}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {report && (
          <p className="text-sm">
            <span className="font-semibold">{report.cluster_count}</span> duplicate group
            {report.cluster_count === 1 ? '' : 's'} found across {report.total_venues} venues —{' '}
            <span className="font-semibold">{report.duplicate_count}</span> record
            {report.duplicate_count === 1 ? '' : 's'} would be removed. Nothing has changed yet.
          </p>
        )}
      </div>

      {summary && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 rounded-lg p-3">
            <Check className="w-4 h-4 shrink-0" />
            Done — {summary.clusters_processed} group(s) merged, {summary.venues_deleted} duplicate
            venue(s) deleted, {summary.records_reparented} attached record(s) moved to the survivors.
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border rounded-xl border border-border">
            {summary.results.map((r) => (
              <div key={r.cluster_id} className="p-3 text-sm">
                <p className="font-medium truncate">{r.survivor}</p>
                {r.error ? (
                  <p className="text-xs text-destructive mt-0.5">{r.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Removed: {r.deleted.join(', ') || '—'}
                    {r.fields_merged.length ? ` · merged ${r.fields_merged.length} field(s)` : ''}
                    {Object.keys(r.moved).length
                      ? ` · moved ${Object.entries(r.moved).map(([k, v]) => `${v} ${k}`).join(', ')}`
                      : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {report && report.clusters.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No duplicates found — every venue has a unique address/name combination.
        </div>
      )}

      {report && report.clusters.length > 0 && (
        <div className="space-y-2">
          {report.clusters.map((c) => (
            <DedupeClusterCard
              key={c.cluster_id}
              cluster={c}
              checked={!!selected[c.cluster_id]}
              onToggle={() =>
                setSelected((s) => ({ ...s, [c.cluster_id]: !s[c.cluster_id] }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}