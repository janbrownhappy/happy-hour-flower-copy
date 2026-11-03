import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, PhoneCall } from 'lucide-react';

const STATUS_CLASS = {
  'Retained — confirmed by official website': 'text-green-700',
  'Corrected from Google Places': 'text-blue-700',
  Cleared: 'text-destructive',
};

// Runs contact verification one batch at a time and shows, per field, what actually
// happened to the venue record (corrected / retained / cleared).
export default function ContactVerificationPanel() {
  const [batch, setBatch] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setRunning(true);
    const res = await base44.functions.invoke('verifyVenueContacts', { batch, batchSize: 10 });
    setResult(res.data);
    setBatch(res.data.nextBatch ?? 0);
    setRunning(false);
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><PhoneCall className="w-4 h-4" /> Contact Verification</h3>
          <p className="text-xs text-muted-foreground">Checks 10 venues per run against Google Places, falling back to the official website before anything is cleared.</p>
        </div>
        <Button size="sm" onClick={run} disabled={running}>
          {running && <Loader2 className="w-4 h-4 animate-spin" />} Verify batch {batch + 1}
        </Button>
      </div>
      {result && (
        <div className="text-sm space-y-2">
          <p className="text-muted-foreground">
            Venues {result.processed} of {result.total} · {result.confirmed} unchanged · {result.protected?.length || 0} protected · {result.errors?.length || 0} errors
          </p>
          {result.field_status?.length ? (
            <ul className="space-y-1">
              {result.field_status.map((r, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium">{r.name}</span> · {r.field}: {r.value ?? `${r.from || '—'} → ${r.to || '—'}`}{' '}
                  <span className={`font-semibold ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">No contact fields changed in this batch.</p>}
        </div>
      )}
    </div>
  );
}