import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Phone, Globe, Wand2, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

// Detect what a venue is missing. Photos, phone and website are the core
// "high-quality profile" signals that AI enrichment can fill in.
function getMissing(v) {
  const missing = [];
  if (!Array.isArray(v.photo_urls) || v.photo_urls.length === 0) missing.push('photos');
  if (!v.phone || !String(v.phone).trim()) missing.push('phone');
  if (!v.website || !String(v.website).trim()) missing.push('website');
  return missing;
}

const MISSING_META = {
  photos: { label: 'No photos', icon: ImageIcon },
  phone: { label: 'No phone', icon: Phone },
  website: { label: 'No website', icon: Globe },
};

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-foreground',
    danger: 'text-destructive',
    warn: 'text-amber-600',
    good: 'text-green-600',
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-heading font-bold mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminQualityReport({ onGoToEnrichment }) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | photos | phone | website

  useEffect(() => {
    base44.entities.Venue.list('-created_date', 2000)
      .then(setVenues)
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, []);

  const flagged = useMemo(() => {
    return venues
      .map(v => ({ venue: v, missing: getMissing(v) }))
      .filter(r => r.missing.length > 0);
  }, [venues]);

  const stats = useMemo(() => {
    const s = { photos: 0, phone: 0, website: 0, complete: venues.length - flagged.length };
    flagged.forEach(({ missing }) => missing.forEach(m => { s[m] += 1; }));
    return s;
  }, [venues, flagged]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flagged
      .filter(({ venue, missing }) => (filter === 'all' ? true : missing.includes(filter)))
      .filter(({ venue }) =>
        !q ||
        venue.name?.toLowerCase().includes(q) ||
        venue.city?.toLowerCase().includes(q) ||
        venue.market_name?.toLowerCase().includes(q) ||
        venue.neighborhood?.toLowerCase().includes(q)
      )
      // Most incomplete first
      .sort((a, b) => b.missing.length - a.missing.length);
  }, [flagged, filter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" /> Venue Quality Report
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Venues missing photos or contact info. Send these through an AI Enrichment refresh to keep listings high-quality.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Need attention" value={flagged.length} tone={flagged.length ? 'warn' : 'good'} />
        <StatCard label="Missing photos" value={stats.photos} tone={stats.photos ? 'danger' : 'good'} />
        <StatCard label="Missing phone" value={stats.phone} tone={stats.phone ? 'danger' : 'good'} />
        <StatCard label="Missing website" value={stats.website} tone={stats.website ? 'danger' : 'good'} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search by name, city, or area…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flagged venues</SelectItem>
            <SelectItem value="photos">Missing photos</SelectItem>
            <SelectItem value="phone">Missing phone</SelectItem>
            <SelectItem value="website">Missing website</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <p className="font-medium text-foreground">
            {flagged.length === 0 ? 'Every venue has photos and contact info.' : 'No venues match this filter.'}
          </p>
          {flagged.length === 0 && <p className="text-sm">Nothing needs an enrichment refresh right now.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(({ venue, missing }) => (
            <div key={venue.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{venue.name || 'Unnamed venue'}</p>
                  {venue.status && venue.status !== 'active' && (
                    <Badge variant="secondary" className="capitalize text-[10px]">{venue.status}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[venue.category, venue.city, venue.market_name].filter(Boolean).join(' · ') || 'No location set'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {missing.map(m => {
                    const Icon = MISSING_META[m].icon;
                    return (
                      <Badge key={m} variant="outline" className="gap-1 text-destructive border-destructive/30">
                        <Icon className="w-3 h-3" /> {MISSING_META[m].label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => onGoToEnrichment?.(venue.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
              >
                <Wand2 className="w-4 h-4" /> Enrich
              </button>
            </div>
          ))}
        </div>
      )}

      {flagged.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Click “Enrich” on any venue to open AI Venue Enrichment pre-loaded with that venue, then review and save the suggested fields.
        </div>
      )}
    </div>
  );
}