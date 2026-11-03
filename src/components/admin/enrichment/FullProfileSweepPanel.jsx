import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Pause, AlertTriangle, Check, Sparkles } from 'lucide-react';

export default function FullProfileSweepPanel() {
  const [running, setRunning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  // Show the real target count before the sweep starts, so progress is visible immediately.
  useEffect(() => {
    base44.entities.Venue.filter({ status: 'active' }, 'name', 2000)
      .then((v) => {
        setTotal(v.length);
        setOffset(v.filter((x) => x.full_enrichment_at).length);
      })
      .catch(() => {});
  }, []);

  const runSweep = async (startOffset) => {
    stopRef.current = false;
    setRunning(true);
    setError('');
    setDone(false);
    let cursor = startOffset;
    try {
      while (!stopRef.current) {
        const { data } = await base44.functions.invoke('enrichAllVenuesFull', { batch_size: 3 });
        if (data?.error) throw new Error(data.error);
        setTotal(data.total);
        setLog((prev) => [...data.results, ...prev].slice(0, 200));
        cursor = data.processed;
        setOffset(cursor);
        if (data.done) {
          setDone(true);
          break;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const pause = () => { stopRef.current = true; };

  const pct = total ? Math.round((offset / total) * 100) : 0;
  const errorCount = log.filter((r) => r.error).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Full Profile Enrichment — All Venues
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Researches description, happy hours, deals, social links and amenities for every active
          venue and saves the findings automatically. Unconfirmed happy hour details are never saved.
          Each venue uses one Google Places lookup and one web-search AI call, so a full sweep is a
          meaningful credit spend and takes a while — keep this tab open while it runs.
        </p>
      </div>

      {(running || offset > 0 || total > 0) && (
        <div className="space-y-1.5">
          <Progress value={pct} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{offset} of {total || '…'} venues processed</span>
            {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {running ? (
          <Button onClick={pause} variant="outline" className="flex-1">
            <Pause className="w-4 h-4 mr-2" /> Pause after this batch
          </Button>
        ) : (
          <Button onClick={() => runSweep(offset)} className="flex-1">
            <Play className="w-4 h-4 mr-2" />
            {offset > 0 && offset < total ? `Resume — ${total - offset} venues left` : 'Start full enrichment'}
          </Button>
        )}
        {running && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {offset > 0 && !running && (
          <Button variant="ghost" onClick={() => { setOffset(0); setLog([]); setDone(false); }}>
            Reset
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 rounded-lg p-3">
          <Check className="w-4 h-4" /> Sweep complete — all {total} venues processed.
        </div>
      )}

      {log.length > 0 && (
        <div className="max-h-80 overflow-y-auto divide-y divide-border rounded-xl border border-border">
          {log.map((r, i) => (
            <div key={`${r.venue_id}-${i}`} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{r.venue_name}</span>
                {r.error ? (
                  <Badge variant="destructive" className="shrink-0">Failed</Badge>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.places_matched && <Badge variant="secondary" className="text-[10px]">Places</Badge>}
                    <Badge variant="outline" className="text-[10px]">{r.fields_updated?.length || 0} fields</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.amenities_saved || 0} amenities</Badge>
                    {(r.fields_protected?.length > 0 || r.discrepancies_recorded > 0) && (
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                        {r.fields_protected?.length || 0} protected
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {r.error ? (
                <p className="text-xs text-destructive mt-1">{r.error}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {r.fields_updated?.length ? r.fields_updated.join(', ') : 'No new fields confirmed'}
                  {r.happy_hour_confirmed === false && ' · happy hour unconfirmed (not saved)'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}