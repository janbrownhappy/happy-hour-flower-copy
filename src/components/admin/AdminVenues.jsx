import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight, CheckCircle, Image, Download, Wand2, Phone, FileDown, FileUp, Sheet, MapPin, ImageOff } from 'lucide-react';

const PHOTO_PLACEHOLDER = 'https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/2dfa69582_generated_image.png';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const hasCoords = (v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && (v.lat !== 0 || v.lng !== 0);
import { useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VenueForm from './VenueForm';
import VenuePhotoUpload from './VenuePhotoUpload';
import { ALL_AMENITIES } from '@/lib/amenities';
import { fetchVenuePhoto } from '@/functions/fetchVenuePhoto';
import { clearAllVenuePhotos } from '@/functions/clearAllVenuePhotos';
import { enrichVenueContacts } from '@/functions/enrichVenueContacts';
import { exportVenuesToSheet } from '@/functions/exportVenuesToSheet';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';
import { stampFieldProvenance, buildPhotoProvenance } from '@/lib/provenance';

const PAGE_SIZE = 20;

const TIER_STYLES = {
  platinum: 'bg-slate-700 text-white',
  premium:  'bg-amber-500 text-white',
  free:     'bg-muted text-muted-foreground',
};

function TierBadge({ tier }) {
  const t = tier || 'free';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${TIER_STYLES[t] || TIER_STYLES.free}`}>
      {t}
    </span>
  );
}

export default function AdminVenues() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [amenityMap, setAmenityMap] = useState({}); // venue_id -> "label1 slug1 label2 ..." (lowercased, searchable)
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [amenitySearch, setAmenitySearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingVenue, setEditingVenue] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [fetchingPhoto, setFetchingPhoto] = useState(null);
  const [bulkFetching, setBulkFetching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, ok: 0, placeholder: 0, fail: 0 });
  const [manualOnly, setManualOnly] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState('');
  const [clearingPhotos, setClearingPhotos] = useState(false);
  const [enrichingContacts, setEnrichingContacts] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [exportingSheet, setExportingSheet] = useState(false);
  const importRef = useRef();

  const handleExportToSheet = async () => {
    setExportingSheet(true);
    try {
      const res = await exportVenuesToSheet({});
      const { spreadsheetUrl, count } = res.data;
      if (spreadsheetUrl) {
        window.open(spreadsheetUrl, '_blank');
        setImportResult(`✅ Exported ${count} venues to a new Google Sheet`);
      } else {
        setImportResult('❌ Export failed');
      }
    } catch (err) {
      setImportResult(`❌ Export failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setExportingSheet(false);
    }
  };

  const handleExportCSV = () => {
    const fields = [
      'name', 'slug', 'category', 'status', 'subscription_tier', 'neighborhood',
      'address', 'city', 'zip_code', 'lat', 'lng',
      'phone', 'website', 'facebook_url', 'instagram_url', 'tiktok_url', 'threads_url', 'youtube_url',
      'price_level', 'rating', 'review_count', 'view_count', 'favorite_count',
      'happy_hour_start', 'happy_hour_end',
      'is_featured', 'is_new', 'is_fan_favorite',
      'verification_status', 'description', 'tags',
      'owner_id', 'created_date', 'updated_date'
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = [fields.join(',')];
    venues.forEach(v => {
      rows.push(fields.map(f => escape(v[f])).join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venues_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const [headerLine, ...dataLines] = text.trim().split('\n');
      const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const parseRow = (line) => {
        const cols = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') { inQ = !inQ; }
          else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; }
          else { cur += line[i]; }
        }
        cols.push(cur);
        return cols;
      };
      const arrayFields = ['days', 'deals', 'tags', 'photo_urls', 'recurrence_days'];
      const numFields = ['lat', 'lng', 'price_level', 'rating', 'review_count', 'view_count', 'favorite_count'];
      const boolFields = ['is_featured', 'is_new', 'is_fan_favorite'];
      const records = dataLines.filter(l => l.trim()).map(line => {
        const cols = parseRow(line);
        const obj = {};
        headers.forEach((h, i) => {
          let val = (cols[i] || '').replace(/^"|"$/g, '').trim();
          if (!val) return;
          if (arrayFields.includes(h)) obj[h] = val.split(';').map(s => s.trim()).filter(Boolean);
          else if (numFields.includes(h)) obj[h] = parseFloat(val) || undefined;
          else if (boolFields.includes(h)) obj[h] = val.toLowerCase() === 'true';
          else obj[h] = val;
        });
        return obj;
      }).filter(r => r.name);
      if (!records.length) { setImportResult('❌ No valid rows found (name is required)'); return; }
      if (!confirm(`Upsert ${records.length} venues? Records matching by slug will be updated; others will be created.`)) return;
      setImporting(true);
      setImportResult(`Importing ${records.length} venues...`);
      // Build slug lookup from current venues list
      const slugMap = Object.fromEntries(venues.filter(v => v.slug).map(v => [v.slug, v.id]));
      let created = 0, updated = 0, fail = 0;
      for (const rec of records) {
        try {
          const existingId = rec.slug ? slugMap[rec.slug] : null;
          if (existingId) { await base44.entities.Venue.update(existingId, rec); updated++; }
          else { await base44.entities.Venue.create(rec); created++; }
        } catch { fail++; }
      }
      setImporting(false);
      setImportResult(`✅ ${created} created, ${updated} updated${fail ? `, ❌ ${fail} failed` : ''}`);
      load();
    };
    reader.readAsText(file);
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Venue.list('-created_date', 5000),
      base44.entities.VenueAmenity.list('-created_date', 10000).catch(() => []),
    ])
      .then(([v, amenities]) => {
        setVenues(v);
        const map = {};
        amenities.forEach(a => {
          const found = ALL_AMENITIES.find(x => x.slug === a.amenity_slug);
          const text = `${(found?.label || '').toLowerCase()} ${String(a.amenity_slug || '').replace(/_/g, ' ').toLowerCase()}`;
          const key = String(a.venue_id);
          map[key] = map[key] ? `${map[key]} ${text}` : text;
        });
        setAmenityMap(map);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [locationFilter]);

  const filtered = venues.filter(v => {
    const matchesTerritory = venueInTerritory(v, locationFilter);
    const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchesSearch = !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase())
      || (squash(search).length > 2 && squash(v.name).includes(squash(search)));
    const matchesAmenity = !amenitySearch || (amenityMap[String(v.id)] || '').includes(amenitySearch.toLowerCase().trim());
    const matchesTier = tierFilter === 'all' || (v.subscription_tier || 'free') === tierFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && v.status === 'active') ||
      (statusFilter === 'pending' && v.status === 'pending');
    const matchesManual = !manualOnly || v.photo_needs_manual;
    return matchesTerritory && matchesSearch && matchesAmenity && matchesTier && matchesStatus && matchesManual;
  });
  const manualCount = venues.filter(v => v.photo_needs_manual).length;

  const pendingCount = venues.filter(v => v.status === 'pending').length;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = async (venue, newStatus) => {
    const updated = await base44.entities.Venue.update(venue.id, { status: newStatus });
    setVenues(prev => prev.map(v => v.id === venue.id ? updated : v));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this venue?')) return;
    await base44.entities.Venue.delete(id);
    setVenues(prev => prev.filter(v => v.id !== id));
  };

  const handleSave = async (formData) => {
    // Admin edits are stamped hhf_admin so automated enrichment cannot overwrite them.
    const data = {
      ...formData,
      field_provenance: stampFieldProvenance(editingVenue, formData, 'hhf_admin'),
      photo_provenance: buildPhotoProvenance(editingVenue, formData.photo_urls || [], 'hhf_admin'),
    };
    if (editingVenue) {
      const updated = await base44.entities.Venue.update(editingVenue.id, data);
      setVenues(prev => prev.map(v => v.id === editingVenue.id ? updated : v));
    } else {
      const created = await base44.entities.Venue.create(data);
      setVenues(prev => [created, ...prev]);
    }
    setShowForm(false);
    setEditingVenue(null);
  };

  const handlePhotoUploaded = async () => {
    if (uploadingPhoto?.photo_needs_manual) {
      const fresh = await base44.entities.Venue.get(uploadingPhoto.id);
      const keptUrls = (fresh.photo_urls || []).filter(u => u !== PHOTO_PLACEHOLDER);
      await base44.entities.Venue.update(uploadingPhoto.id, {
        photo_urls: keptUrls,
        photo_provenance: buildPhotoProvenance(fresh, keptUrls, 'hhf_admin'),
        photo_needs_manual: false,
        photo_fetch_reason: '',
      });
    }
    load();
    setUploadingPhoto(null);
  };

  const handleFetchPhoto = async (venue) => {
    setFetchingPhoto(venue.id);
    try {
      const result = (await fetchVenuePhoto({ venueId: venue.id })).data;
      if (result.success) {
        load();
      } else {
        alert(result.message || 'Failed to fetch photo');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setFetchingPhoto(null);
    }
  };

  const handleBulkFetch = async () => {
    const venuesWithoutPhotos = filtered.filter(v => !v.photo_urls?.length);
    if (venuesWithoutPhotos.length === 0) {
      alert('All venues already have photos!');
      return;
    }

    if (!confirm(`Fetch photos for ${venuesWithoutPhotos.length} venues without photos? This may take a few minutes.`)) {
      return;
    }

    setBulkFetching(true);
    const total = venuesWithoutPhotos.length;
    const counts = { ok: 0, placeholder: 0, fail: 0 };
    setBulkProgress({ current: 0, total, ...counts });
    const errors = [];

    const attempt = async (venueId) => (await fetchVenuePhoto({ venueId, assignPlaceholder: true })).data;
    for (let i = 0; i < total; i++) {
      const venue = venuesWithoutPhotos[i];
      let result;
      try {
        result = await attempt(venue.id);
      } catch {
        await sleep(6000); // throttled / server hiccup — back off and retry once
        result = await attempt(venue.id).catch(e => ({ success: false, error: e.response?.data?.error || e.message }));
      }
      if (result.success) counts.ok++;
      else if (result.placeholder) { counts.placeholder++; errors.push({ name: venue.name, reason: result.reason }); }
      else { counts.fail++; errors.push({ name: venue.name, reason: result.error || 'unknown' }); }
      setBulkProgress({ current: i + 1, total, ...counts });
      await sleep(2000);
    }

    setBulkFetching(false);
    load();
    const byReason = errors.reduce((acc, e) => { acc[e.reason] = (acc[e.reason] || 0) + 1; return acc; }, {});
    const reasonSummary = Object.keys(byReason).length ? `\n\nWhy no real photo was found:\n${Object.entries(byReason).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r, n]) => `• ${r}: ${n}`).join('\n')}` : '';
    alert(`Bulk fetch complete!\n✅ ${counts.ok} real photos\n🚩 ${counts.placeholder} flagged with no photo (see Needs Manual Photo)\n❌ ${counts.fail} still failed${reasonSummary}`);
  };

  const handleBackfill = async () => {
    const targets = venues.filter(v => !hasCoords(v) || !v.website);
    if (!targets.length) { setBackfillProgress('✅ All venues already have coordinates and websites'); return; }
    if (!confirm(`Backfill coordinates/website for ${targets.length} venues from Google?`)) return;
    setBackfilling(true);
    let updated = 0;
    for (let i = 0; i < targets.length; i++) {
      const res = await base44.functions.invoke('backfillVenueMetadata', { venueId: targets[i].id }).catch(() => null);
      if (res?.data?.updated?.length) updated++;
      setBackfillProgress(`Backfilling ${i + 1}/${targets.length} — ${updated} venues updated`);
      await sleep(1000);
    }
    setBackfillProgress(`✅ Backfill complete — ${updated} of ${targets.length} venues updated`);
    setBackfilling(false);
    load();
  };

  const handleEnrichContacts = async () => {
    setEnrichingContacts(true);
    setEnrichProgress('Starting...');
    let batch = 0;
    let totalUpdated = 0;
    try {
      while (true) {
        setEnrichProgress(`Batch ${batch + 1} — enriching venues...`);
        const res = await enrichVenueContacts({ batch });
        const data = res.data;
        totalUpdated += data.updated || 0;
        setEnrichProgress(`Batch ${batch + 1} done — ${totalUpdated} venues updated so far (${data.processedRange} of ${data.totalToEnrich})`);
        if (!data.hasMore) break;
        batch = data.nextBatch;
        await new Promise(r => setTimeout(r, 500));
      }
      setEnrichProgress(`✅ Complete — ${totalUpdated} venues enriched`);
      load();
    } catch (err) {
      setEnrichProgress(`❌ Error: ${err.message}`);
    } finally {
      setEnrichingContacts(false);
    }
  };

  const handleClearAllPhotos = async () => {
    if (!confirm('Delete ALL venue photos? This cannot be undone. You can re-fetch them from Google Places afterwards.')) {
      return;
    }

    setClearingPhotos(true);
    try {
      const result = await clearAllVenuePhotos({});
      load();
      alert(result.message || 'Photos cleared successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setClearingPhotos(false);
    }
  };

  if (showForm) {
    return (
      <VenueForm
        venue={editingVenue}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditingVenue(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search venues..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search amenities (e.g. vegan, patio)..." className="pl-9" value={amenitySearch} onChange={e => { setAmenitySearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={tierFilter} onValueChange={(val) => { setTierFilter(val); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingVenue(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
        <Button onClick={handleExportCSV} variant="outline" disabled={venues.length === 0}>
          <FileDown className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button onClick={handleExportToSheet} variant="outline" disabled={exportingSheet || venues.length === 0}>
          <Sheet className="w-4 h-4 mr-1" /> {exportingSheet ? 'Exporting...' : 'Export to Google Sheet'}
        </Button>
        <Button onClick={() => importRef.current.click()} variant="outline" disabled={importing}>
          <FileUp className="w-4 h-4 mr-1" /> {importing ? 'Importing...' : 'Import CSV'}
        </Button>
        <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        <Button 
          onClick={handleClearAllPhotos} 
          disabled={clearingPhotos || filtered.filter(v => v.photo_urls?.length > 0).length === 0}
          variant="outline"
        >
          <Trash2 className="w-4 h-4 mr-1" /> 
          {clearingPhotos ? 'Clearing...' : 'Clear All Photos'}
        </Button>
        <Button 
          onClick={handleBulkFetch} 
          disabled={bulkFetching || filtered.filter(v => !v.photo_urls?.length).length === 0}
          variant="outline"
        >
          <Wand2 className="w-4 h-4 mr-1" /> 
          {bulkFetching ? `Fetching... ${bulkProgress.current}/${bulkProgress.total}` : 'Auto-Fetch All Photos'}
        </Button>
        <Button onClick={handleBackfill} disabled={backfilling} variant="outline">
          <MapPin className="w-4 h-4 mr-1" /> {backfilling ? 'Backfilling...' : 'Backfill Metadata'}
        </Button>
        <Button
          onClick={() => { setManualOnly(m => !m); setPage(1); }}
          variant={manualOnly ? 'default' : 'outline'}
        >
          <ImageOff className="w-4 h-4 mr-1" /> Needs Manual Photo ({manualCount})
        </Button>
        <Button
          onClick={handleEnrichContacts}
          disabled={enrichingContacts}
          variant="outline"
        >
          <Phone className="w-4 h-4 mr-1" />
          {enrichingContacts ? 'Enriching...' : 'Enrich All Contacts'}
        </Button>
      </div>
      {bulkFetching && (
        <p className="text-xs text-muted-foreground mb-2">
          ✅ {bulkProgress.ok} real photos · 🚩 {bulkProgress.placeholder} no photo found · ❌ {bulkProgress.fail} still failed
        </p>
      )}
      {backfillProgress && (
        <p className="text-xs text-muted-foreground mb-2">{backfillProgress}</p>
      )}
      {enrichProgress && (
        <p className="text-xs text-muted-foreground mb-2">{enrichProgress}</p>
      )}
      {importResult && (
        <p className="text-xs text-muted-foreground mb-2">{importResult}</p>
      )}

      {filtered.filter(v => !v.photo_urls?.length).length === 0 && filtered.length > 0 && (
        <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          All {filtered.length} venues have photos!
        </p>
      )}

      <p className="text-xs text-muted-foreground mb-2">{filtered.length} venues</p>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map(venue => (
              <div key={venue.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{venue.name}</p>
                    {venue.photo_urls?.length > 0 && (
                      <div className="flex items-center gap-1 text-green-600" title="Has photo">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{venue.category}</span>
                    {venue.address && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{venue.address}</span>}
                    <Badge
                      variant={venue.status === 'active' ? 'default' : 'secondary'}
                      className={`text-xs py-0 ${venue.status === 'pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}`}
                    >
                      {venue.status === 'active' ? 'Approved' : venue.status === 'pending' ? 'Pending' : venue.status}
                    </Badge>
                    <TierBadge tier={venue.subscription_tier} />
                    {venue.market_name && <span className="text-xs text-muted-foreground">{venue.market_name}</span>}
                    {venue.is_featured && <Badge className="bg-primary text-white text-xs py-0">Featured</Badge>}
                    {venue.photo_needs_manual && <Badge variant="outline" className="text-xs py-0 border-amber-400 text-amber-700">No photo found</Badge>}
                  </div>
                  {venue.photo_needs_manual && (
                    <p className="text-xs text-muted-foreground mt-0.5">{venue.city ? `${venue.city} · ` : ''}{venue.photo_fetch_reason || 'No real photo found'}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(venue.status === 'active' || venue.status === 'pending') && (
                    <Select
                      value={venue.status === 'active' ? 'approved' : 'pending'}
                      onValueChange={(val) => handleStatusChange(venue, val === 'approved' ? 'active' : 'pending')}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {!venue.photo_urls?.length ? (
                    <button 
                      onClick={() => handleFetchPhoto(venue)} 
                      title="Auto-fetch Photo" 
                      disabled={fetchingPhoto === venue.id}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {fetchingPhoto === venue.id ? (
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ) : (
                    <button onClick={() => setUploadingPhoto(venue)} title="Upload Photo" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <Image className={`w-4 h-4 ${venue.photo_needs_manual ? 'text-amber-600' : 'text-muted-foreground'}`} />
                    </button>
                  )}
                  <button onClick={() => { setEditingVenue(venue); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(venue.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {uploadingPhoto && (
        <VenuePhotoUpload
          venue={uploadingPhoto}
          onSuccess={handlePhotoUploaded}
          onClose={() => setUploadingPhoto(null)}
        />
      )}
    </div>
  );
}