import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Upload, FileText, ImageIcon, X, Loader2, Check, AlertTriangle, Search, ExternalLink, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import AmenityResearchSuggestions from '@/components/admin/amenity/AmenityResearchSuggestions';
import PlacesPrepassPanel from '@/components/admin/enrichment/PlacesPrepassPanel';
import BatchRunnerProgress from '@/components/admin/enrichment/BatchRunnerProgress';
import EnrichmentExecDashboard from '@/components/admin/enrichment/EnrichmentExecDashboard';
import EnrichmentRunLog from '@/components/admin/enrichment/EnrichmentRunLog';
import FullProfileSweepPanel from '@/components/admin/enrichment/FullProfileSweepPanel';
import EnrichmentDiscrepancyList from '@/components/admin/enrichment/EnrichmentDiscrepancyList';
import OfficialWebsitePanel from '@/components/admin/enrichment/OfficialWebsitePanel';
import ContactVerificationPanel from '@/components/admin/enrichment/ContactVerificationPanel';

// Fields the AI can suggest, with friendly labels and whether they're list-type
const FIELD_DEFS = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'zip_code', label: 'ZIP Code' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'instagram_url', label: 'Instagram' },
  { key: 'tiktok_url', label: 'TikTok' },
  { key: 'threads_url', label: 'Threads' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'x_url', label: 'X' },
  { key: 'description', label: 'Description' },
  { key: 'happy_hour_start', label: 'Happy Hour Start', hh: true },
  { key: 'happy_hour_end', label: 'Happy Hour End', hh: true },
  { key: 'days', label: 'Days', list: true, hh: true },
  { key: 'deals', label: 'Deals', list: true, hh: true },
];

// Call the backend enrichment function through the SDK.
const enrichVenueProfile = (payload) => base44.functions.invoke('enrichVenueProfile', payload);

const displayValue = (v) => {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
};

export default function VenueEnrichmentPanel({ initialVenueId = '' }) {
  const [venues, setVenues] = useState([]);
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [venueId, setVenueId] = useState(initialVenueId);
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [accepted, setAccepted] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [amenityPicks, setAmenityPicks] = useState({});
  const [acceptProposals, setAcceptProposals] = useState(true);

  useEffect(() => {
    base44.entities.Venue.list('-created_date', 1000).then(setVenues).catch(() => setVenues([]));
  }, []);

  useEffect(() => {
    if (initialVenueId) {
      setMode('existing');
      setVenueId(initialVenueId);
      setResult(null);
      setSaved(false);
    }
  }, [initialVenueId]);

  const handleUpload = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploading(true);
    try {
      for (const file of picked) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        setFiles(prev => [...prev, { name: file.name, url: file_url, type: file.type }]);
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (url) => setFiles(prev => prev.filter(f => f.url !== url));

  const canRun = mode === 'existing' ? !!venueId : (newName.trim() || newWebsite.trim());

  const runEnrichment = async () => {
    if (!canRun) return;
    setRunning(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const { data } = await enrichVenueProfile({
        venue_id: mode === 'existing' ? venueId : undefined,
        name: mode === 'new' ? newName : undefined,
        website: mode === 'new' ? newWebsite : undefined,
        file_urls: files.map(f => f.url),
        notes,
      });
      if (data.error) throw new Error(data.error);
      setResult(data);
      const preAccept = {};
      FIELD_DEFS.forEach(({ key }) => {
        const suggested = data.suggestions?.fields?.[key]?.value;
        const current = data.current?.[key];
        const hasSuggestion = Array.isArray(suggested) ? suggested.length : (suggested != null && suggested !== '');
        const different = JSON.stringify(suggested) !== JSON.stringify(current);
        // Protected (owner/admin or claimed) fields are never pre-selected — accepting one
        // is a deliberate admin choice.
        preAccept[key] = !!(hasSuggestion && different && !data.protection?.[key]);
      });
      setAccepted(preAccept);
      setAmenityPicks(Object.fromEntries((data.amenities || []).map(a => [a.slug, true])));
      setAcceptProposals(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const saveAccepted = async () => {
    setSaving(true);
    try {
      const updates = {};
      FIELD_DEFS.forEach(({ key }) => {
        if (accepted[key]) {
          const v = result.suggestions?.fields?.[key]?.value;
          if (v != null && v !== '') updates[key] = v;
        }
      });
      const amenities = (result.amenities || []).filter(a => amenityPicks[a.slug]);
      const proposed_amenities = acceptProposals ? (result.proposed_amenities || []) : [];

      if (venueId) {
        if (Object.keys(updates).length || amenities.length || proposed_amenities.length) {
          const { data } = await enrichVenueProfile({
            action: 'save', venue_id: venueId, updates, amenities, proposed_amenities,
            places_verified: !!result.places_verified,
          });
          if (data?.error) throw new Error(data.error);
          setVenues(prev => prev.map(v => v.id === venueId ? { ...v, ...updates } : v));
        }
      } else {
        const name = updates.name || newName.trim();
        if (!name) throw new Error('A venue name is required to create a new venue. Accept the Name field or type one.');
        const { data } = await enrichVenueProfile({
          action: 'save',
          updates: { ...updates, name, status: 'draft' },
          amenities,
          proposed_amenities,
          places_verified: !!result.places_verified,
        });
        if (data?.error) throw new Error(data.error);
        const created = data.venue;
        setVenues(prev => [created, ...prev]);
        setVenueId(created.id);
        setMode('existing');
      }
      setSaved(true);
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const acceptedCount = Object.values(accepted).filter(Boolean).length;
  const amenityCount = (result?.amenities || []).filter(a => amenityPicks[a.slug]).length;
  const proposalCount = acceptProposals ? (result?.proposed_amenities || []).length : 0;
  const totalToSave = acceptedCount + amenityCount + proposalCount;
  const hhConfirmed = result?.suggestions?.happy_hour_confirmed;

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> AI Venue Enrichment
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Google Places supplies the verified contact facts first, then AI researches what Google can't answer — happy hour, description and social links. Review every AI suggestion before saving.
        </p>
      </div>

      <BatchRunnerProgress />
      <EnrichmentExecDashboard />
      <EnrichmentRunLog />
      <FullProfileSweepPanel />
      <ContactVerificationPanel />

      <EnrichmentDiscrepancyList />

      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('existing'); setResult(null); setSaved(false); }}
            className={`flex-1 rounded-xl border-2 p-2.5 text-sm font-semibold transition-colors ${mode === 'existing' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
          >
            Existing venue
          </button>
          <button
            type="button"
            onClick={() => { setMode('new'); setResult(null); setSaved(false); }}
            className={`flex-1 rounded-xl border-2 p-2.5 text-sm font-semibold transition-colors ${mode === 'new' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
          >
            New venue
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="space-y-1">
            <Label>Venue</Label>
            <Select value={venueId || undefined} onValueChange={(v) => { setVenueId(v); setResult(null); setSaved(false); }}>
              <SelectTrigger><SelectValue placeholder="Select a venue to enrich…" /></SelectTrigger>
              <SelectContent>
                {venues.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}{v.city ? ` · ${v.city}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Venue Name</Label>
              <Input value={newName} onChange={e => { setNewName(e.target.value); setResult(null); setSaved(false); }} placeholder="e.g. The Copper Tap" />
            </div>
            <div className="space-y-1">
              <Label>Website URL</Label>
              <Input value={newWebsite} onChange={e => { setNewWebsite(e.target.value); setResult(null); setSaved(false); }} placeholder="https://..." />
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Provide a name and/or website. A new draft venue is created only when you save accepted fields.</p>
          </div>
        )}

        <div className="space-y-1">
          <Label>Reference files (photos, menus, PDFs)</Label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:bg-muted/40 transition-colors text-sm text-muted-foreground">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Click to upload files'}
            <input type="file" multiple accept="image/*,application/pdf,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {files.map(f => (
                <div key={f.url} className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5 text-xs">
                  {f.type?.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(f.url)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>Additional context (optional)</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything you already know — e.g. 'Happy hour is only in the bar area, not the patio.'"
          />
        </div>

        <Button onClick={runEnrichment} disabled={!canRun || running || uploading} className="w-full">
          {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Researching venue…</> : <><Search className="w-4 h-4 mr-2" /> Run AI Research</>}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold">Review AI Suggestions</h3>
            <Badge variant="outline">{acceptedCount} selected</Badge>
          </div>

          {result.claimed && (
            <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-amber-500/10 text-amber-700">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Claimed venue — automated research was not saved to this record. Fields marked Protected are owner/admin-controlled; accepting one is a deliberate admin change.</span>
            </div>
          )}

          <PlacesPrepassPanel places={result.places} />

          <OfficialWebsitePanel research={result.website_research} />

          {result.suggestions?.summary && (
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{result.suggestions.summary}</p>
          )}

          <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${hhConfirmed ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}`}>
            {hhConfirmed ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>
              {hhConfirmed
                ? 'Happy hour details were confirmed against a source. Still verify before saving.'
                : 'Happy hour details could NOT be confirmed. Verify manually before accepting these fields.'}
            </span>
          </div>

          <div className="divide-y divide-border">
            {FIELD_DEFS.map(({ key, label, hh }) => {
              const suggestion = result.suggestions?.fields?.[key];
              const suggested = suggestion?.value;
              const current = result.current?.[key];
              const hasSuggestion = Array.isArray(suggested) ? suggested.length : (suggested != null && suggested !== '');
              const different = JSON.stringify(suggested) !== JSON.stringify(current);
              return (
                <div key={key} className={`py-3 ${hh && !hhConfirmed && hasSuggestion ? 'bg-amber-500/5 -mx-4 px-4' : ''}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{label}</span>
                      {hh && <Badge variant="secondary" className="text-[10px]">Happy Hour</Badge>}
                      {result.protection?.[key] && hasSuggestion && different && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-400 text-amber-700" title={result.protection[key].reason}>
                          <Lock className="w-3 h-3" /> Protected{result.protection[key].existing_source ? ` — ${result.protection[key].existing_source}` : ''}
                        </Badge>
                      )}
                      {suggestion?.source && hasSuggestion && (
                        <span className="text-[11px] text-muted-foreground">
                          · {suggestion.source_url
                            ? <a href={suggestion.source_url} target="_blank" rel="noopener noreferrer" className="underline">{suggestion.source}</a>
                            : suggestion.source}
                        </span>
                      )}
                    </div>
                    {hasSuggestion && different && (
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!accepted[key]}
                          onChange={e => setAccepted(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="accent-primary w-4 h-4"
                        />
                        Accept
                      </label>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Current</p>
                      <p className="text-muted-foreground">{displayValue(current)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">AI Suggests</p>
                      <p className={hasSuggestion && different ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                        {displayValue(suggested)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <AmenityResearchSuggestions
            amenities={result.amenities || []}
            proposals={result.proposed_amenities || []}
            droppedCount={(result.amenities_dropped || []).length}
            currentAmenities={result.current_amenities || []}
            selected={amenityPicks}
            onToggle={(slug, checked) => setAmenityPicks(prev => ({ ...prev, [slug]: checked }))}
            acceptProposals={acceptProposals}
            onToggleProposals={setAcceptProposals}
          />

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={saveAccepted} disabled={saving || totalToSave === 0} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <>Save {totalToSave} accepted {totalToSave === 1 ? 'change' : 'changes'}</>}
            </Button>
            {venueId && (
              <Button asChild variant="outline">
                <Link to={`/venue/${venueId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> View venue page
                </Link>
              </Button>
            )}
          </div>

          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 rounded-lg p-3">
              <Check className="w-4 h-4" /> Venue profile updated.
            </div>
          )}
        </div>
      )}
    </div>
  );
}