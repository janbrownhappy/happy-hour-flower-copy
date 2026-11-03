import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { fetchVenuePhoto } from '@/functions/fetchVenuePhoto';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';
import VenuePhotoUpload from '@/components/admin/VenuePhotoUpload';
import MissingPhotoRow from './MissingPhotoRow';

const PAGE_SIZE = 25;

export default function MissingPhotosPanel() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [kind, setKind] = useState('all');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Venue.list('-created_date', 5000)
      .then(all => setVenues(all.filter(v => !v.photo_urls?.length)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => setPage(1), [search, city, kind, locationFilter]);

  const scoped = venues.filter(v => venueInTerritory(v, locationFilter));
  const cities = [...new Set(scoped.map(v => v.city).filter(Boolean))].sort();
  const q = search.toLowerCase().trim();
  const filtered = scoped.filter(v =>
    (!q || v.name?.toLowerCase().includes(q) || v.address?.toLowerCase().includes(q)) &&
    (city === 'all' || v.city === city) &&
    (kind === 'all' || (kind === 'failed' ? v.photo_needs_manual : !v.photo_needs_manual))
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRetry = async (venue) => {
    setRetrying(venue.id);
    const res = await fetchVenuePhoto({ venueId: venue.id, assignPlaceholder: true }).catch(e => ({ data: { error: e.message } }));
    setRetrying(null);
    if (!res.data?.success) alert(`No photo found: ${res.data?.reason || res.data?.error || 'unknown'}`);
    load();
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Venues Missing Photos</h2>
        <p className="text-sm text-muted-foreground">{scoped.length} venues have no image. Find one, then upload it or retry the auto-fetch.</p>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name or address..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All missing</SelectItem>
            <SelectItem value="failed">Auto-fetch failed</SelectItem>
            <SelectItem value="untried">Not tried yet</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{filtered.length} shown</p>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-green-600 flex items-center gap-1 py-8 justify-center"><CheckCircle className="w-4 h-4" /> No venues missing photos here.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(v => <MissingPhotoRow key={v.id} venue={v} onUpload={setUploading} onRetry={handleRetry} retrying={retrying === v.id} />)}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
      {uploading && (
        <VenuePhotoUpload
          venue={uploading}
          onClose={() => setUploading(null)}
          onSuccess={async () => {
            if (uploading.photo_needs_manual) await base44.entities.Venue.update(uploading.id, { photo_needs_manual: false, photo_fetch_reason: '' });
            setUploading(null);
            load();
          }}
        />
      )}
    </div>
  );
}