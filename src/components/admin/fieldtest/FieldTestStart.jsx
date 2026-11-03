import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { TEST_MODES, APP_STATE_MODES, detectPlatform, fieldTestAction } from './fieldTestUtils';

export default function FieldTestStart({ onStarted }) {
  const [venues, setVenues] = useState([]);
  const [q, setQ] = useState('');
  const [venue, setVenue] = useState(null);
  const [modes, setModes] = useState(['DRIVING', 'APP_OPEN']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { base44.entities.Venue.filter({ status: 'active' }, 'name', 5000).then(setVenues); }, []);
  const matches = useMemo(() => (q.length < 2 ? [] : venues.filter((v) => v.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 8)), [q, venues]);

  const toggle = (k) => setModes((cur) => {
    if (cur.includes(k)) return cur.filter((x) => x !== k);
    const base = APP_STATE_MODES.includes(k) ? cur.filter((x) => !APP_STATE_MODES.includes(x)) : cur;
    return [...base, k];
  });

  const start = async () => {
    setBusy(true); setError('');
    try {
      const res = await fieldTestAction({ action: 'start', test_venue_id: venue?.id, test_modes: modes, platform: detectPlatform(), user_agent: navigator.userAgent });
      onStarted(res.session);
    } catch (e) { setError(e?.response?.data?.error || 'Could not start session'); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium mb-1">Test venue (optional)</p>
        {venue ? (
          <div className="flex items-center gap-2 text-sm"><b>{venue.name}</b><span className="text-muted-foreground">{venue.city}</span><Button size="sm" variant="ghost" onClick={() => setVenue(null)}>Change</Button></div>
        ) : (
          <div className="relative max-w-md">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search active venues…" />
            {matches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow">
                {matches.map((v) => <button key={v.id} onClick={() => { setVenue(v); setQ(''); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-muted">{v.name} <span className="text-muted-foreground">{v.city}</span></button>)}
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium mb-1">Test mode (one app state + optional movement)</p>
        <div className="flex flex-wrap gap-3">
          {TEST_MODES.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><Checkbox checked={modes.includes(k)} onCheckedChange={() => toggle(k)} />{label}</label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={start} disabled={busy || !modes.length}>{busy && <Loader2 className="animate-spin" />}Start field test</Button>
    </div>
  );
}