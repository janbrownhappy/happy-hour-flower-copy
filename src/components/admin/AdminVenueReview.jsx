import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ExternalLink, Loader2, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import VenueReviewSources from './review/VenueReviewSources';
import { enrichVenueProfile } from '@/functions/enrichVenueProfile';

// Fields shown side-by-side against their verification sources.
const FIELDS = [
  ['name', 'Name'],
  ['address', 'Address'],
  ['city', 'City'],
  ['state_code', 'State'],
  ['zip_code', 'ZIP'],
  ['phone', 'Phone'],
  ['website', 'Website'],
  ['category', 'Category'],
  ['happy_hour_start', 'HH start'],
  ['happy_hour_end', 'HH end'],
  ['days', 'Days'],
  ['deals', 'Deals'],
  ['description', 'Description'],
];

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  return String(v);
};

export default function AdminVenueReview() {
  const [venues, setVenues] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const all = await base44.entities.Venue.list('-created_date', 1000);
    const queue = all.filter(v => v.status === 'pending' || v.status === 'draft');
    setVenues(queue);
    setSelectedId(prev => (queue.some(v => v.id === prev) ? prev : queue[0]?.id || null));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selected = venues.find(v => v.id === selectedId) || null;

  // Amenity rows carry their own cited source — load them for the selected venue.
  useEffect(() => {
    if (!selectedId) { setAmenities([]); return; }
    base44.entities.VenueAmenity.filter({ venue_id: selectedId })
      .then(setAmenities)
      .catch(() => setAmenities([]));
  }, [selectedId]);

  const setStatus = async (status) => {
    if (!selected) return;
    const venueName = selected.name;
    setActing(true);
    setError('');
    setNotice('');
    try {
      // Goes through the admin-gated backend function, which writes as service role —
      // a direct entity update is blocked by the Venue row-level rules unless the
      // admin also happens to own the venue.
      const { data } = await enrichVenueProfile({ action: 'save', venue_id: selected.id, updates: { status } });
      if (data?.error) throw new Error(data.error);
      await load();
      // The venue leaves the queue on success, so say what happened to it.
      setNotice(status === 'active'
        ? `${venueName} is now published and live on Explore.`
        : `${venueName} was rejected and set to inactive.`);
    } catch (err) {
      setError(err.message || 'Could not update this venue.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-heading font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Verify Venue Research
        </h2>
        <p className="text-sm text-muted-foreground">
          Review each pending venue's researched data beside its sources before it goes live. Approving sets the venue to Active on Explore.
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-green-700 flex-1">{notice}</span>
          <button onClick={() => setNotice('')} className="text-green-700/70 hover:text-green-700 text-xs">Dismiss</button>
        </div>
      )}

      {venues.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Nothing waiting for review</p>
          <p className="text-xs text-muted-foreground mt-1">Imported and AI-enriched venues appear here while they're Pending or Draft.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Queue */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Queue ({venues.length})
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
              {venues.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${v.id === selectedId ? 'bg-muted' : ''}`}
                >
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[v.city, v.state_code].filter(Boolean).join(', ') || 'No location'}
                  </p>
                  <Badge variant="secondary" className="mt-1 capitalize text-[10px]">{v.status}</Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-side detail */}
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Researched data */}
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Researched data
                  </div>
                  <div className="divide-y divide-border">
                    {FIELDS.map(([key, label]) => {
                      const value = fmt(selected[key]);
                      return (
                        <div key={key} className="px-4 py-2 flex gap-3 text-sm">
                          <span className="w-24 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</span>
                          <span className={value ? 'flex-1 break-words' : 'flex-1 text-muted-foreground italic text-xs pt-0.5'}>
                            {value || 'Missing'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sources */}
                <VenueReviewSources venue={selected} amenities={amenities} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={() => setStatus('active')} disabled={acting}>
                  {acting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Approve &amp; publish
                </Button>
                <Button variant="outline" onClick={() => setStatus('inactive')} disabled={acting}>
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject
                </Button>
                <a
                  href={`/venue-dashboard/${selected.id}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Edit full profile <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}