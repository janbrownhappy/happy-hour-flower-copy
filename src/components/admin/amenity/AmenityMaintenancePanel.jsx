import { useState, useRef } from 'react';
import { resetAmenities } from '@/functions/resetAmenities';
import { reenrichAllAmenities } from '@/functions/reenrichAllAmenities';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Sparkles, Loader2, AlertTriangle, Check, StopCircle } from 'lucide-react';

// Wipe every venue-tagged amenity, and run the source-verified research sweep across
// all active venues. The sweep runs in slices (each LLM call takes ~10-30s), so the
// loop lives here and reports progress between slices.
export default function AmenityMaintenancePanel({ onChanged }) {
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState(null);
  const [error, setError] = useState('');

  const [sweeping, setSweeping] = useState(false);
  const [progress, setProgress] = useState(null); // { processed, total, amenities, proposals, failures }
  const [cancelRequested, setCancelRequested] = useState(false);
  // A ref, so the running loop sees the stop request (state would be stale in the closure).
  const cancelRef = useRef(false);

  const requestCancel = () => {
    cancelRef.current = true;
    setCancelRequested(true);
  };

  const runWipe = async () => {
    setWiping(true);
    setError('');
    setWipeResult(null);
    try {
      const { data } = await resetAmenities({});
      if (data?.error) throw new Error(data.error);
      setWipeResult(data.deleted ?? 0);
      onChanged?.();
    } catch (err) {
      setError('Wipe failed: ' + err.message);
    } finally {
      setWiping(false);
    }
  };

  const runSweep = async () => {
    setSweeping(true);
    setError('');
    setCancelRequested(false);
    cancelRef.current = false;
    let offset = 0;
    let amenities = 0;
    let proposals = 0;
    let failures = 0;
    try {
      // Loop slice by slice until the backend reports the sweep is done.
      for (;;) {
        const { data } = await reenrichAllAmenities({ offset });
        if (data?.error) throw new Error(data.error);
        (data.results || []).forEach((r) => {
          if (r.error) failures += 1;
          amenities += r.amenities_saved || 0;
          proposals += r.proposals_queued || 0;
        });
        setProgress({ processed: data.processed, total: data.total, amenities, proposals, failures });
        if (data.done || data.next_offset == null) break;
        offset = data.next_offset;
        if (cancelRef.current) break;
      }
      onChanged?.();
    } catch (err) {
      setError('Re-enrich failed: ' + err.message);
    } finally {
      setSweeping(false);
    }
  };

  const pct = progress?.total ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Amenity Data Maintenance</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Clear guessed amenity data and rebuild it from sourced research. Every amenity written by
          the sweep carries a cited source; anything unsourced is discarded rather than saved.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={wiping || sweeping}>
              {wiping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Wipe All Amenities
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wipe every venue amenity?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes all amenity tags from every venue. The amenity catalog itself is
                untouched — only the per-venue assignments are deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runWipe}>Wipe all amenities</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={runSweep} disabled={sweeping || wiping}>
          {sweeping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {sweeping ? 'Researching…' : 'Re-enrich All Amenities'}
        </Button>

        {sweeping && (
          <Button variant="outline" onClick={requestCancel} disabled={cancelRequested}>
            <StopCircle className="w-4 h-4 mr-2" />
            {cancelRequested ? 'Stopping after this batch…' : 'Stop after this batch'}
          </Button>
        )}
      </div>

      {wipeResult != null && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-500/10 rounded-lg p-2.5">
          <Check className="w-3.5 h-3.5" /> Wiped {wipeResult.toLocaleString()} amenity assignments.
        </div>
      )}

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progress.processed} of {progress.total} venues researched
            </span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.amenities.toLocaleString()} sourced amenities saved ·{' '}
            {progress.proposals.toLocaleString()} new proposals queued
            {progress.failures > 0 && ` · ${progress.failures} venue(s) failed`}
          </p>
        </div>
      )}

      {sweeping && (
        <p className="text-xs text-muted-foreground">
          Each venue takes 10–30 seconds to research. Keep this page open until it finishes.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}