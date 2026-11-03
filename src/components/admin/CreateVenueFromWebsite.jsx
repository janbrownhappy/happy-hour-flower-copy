import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import WebsiteDraftReview from '@/components/admin/WebsiteDraftReview';
import saveVenueFromWebsite from '@/lib/saveVenueFromWebsite';
import BulkWebsiteImport from '@/components/admin/BulkWebsiteImport';
import ImportSourceNotice from '@/components/admin/ImportSourceNotice';

export default function CreateVenueFromWebsite() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [created, setCreated] = useState(null);

  const research = async () => {
    setLoading(true); setError(''); setResult(null); setCreated(null);
    const full = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const res = await base44.functions.invoke('researchVenueFromUrl', { url: full }).catch(e => ({ data: { error: e?.response?.data?.error || e.message } }));
    if (res.data?.error) setError(res.data.error); else setResult(res.data);
    setLoading(false);
  };

  const save = async (draft, status) => {
    setSaving('enriching'); setError('');
    const v = await saveVenueFromWebsite(draft, result?.duplicates, status);
    if (v.enrichError) setError(`Venue saved, but enrichment failed: ${v.enrichError}.${v.updatedExisting ? '' : ' It was not published.'}`);
    setCreated(v);
    setResult(null); setUrl(''); setSaving(false);
  };

  return (
    <div className="space-y-4">
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Create Venue from Website</h3>
      <p className="text-xs text-muted-foreground">Paste a venue's website or Facebook page link. We'll research it (using public web sources when Facebook doesn't share enough) and show you a draft to review before anything is saved.</p>
      <div className="flex gap-2">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://venuewebsite.com or https://facebook.com/venue" onKeyDown={e => e.key === 'Enter' && url && research()} />
        <Button onClick={research} disabled={!url.trim() || loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Researching…</> : 'Research'}
        </Button>
      </div>
      {saving === 'enriching' && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Running venue enrichment (Google Places, website, amenities)… this can take a minute.</p>}
      {loading && <p className="text-xs text-muted-foreground">This usually takes 20–60 seconds.</p>}
      {error && <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</p>}
      {created && (
        <p className="text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {created.updatedExisting ? 'Updated existing' : 'Created'} "{created.name}" ({created.status})
          {created.enrich && ` — enrichment filled ${created.enrich.fieldsFilled} fields, ${created.enrich.amenities} amenities.`}
          <Link to={`/venue/${created.id}`} className="underline">View</Link>
        </p>
      )}
      {result && <ImportSourceNotice meta={result.import_meta} />}
      {result && <WebsiteDraftReview initial={result.draft} duplicates={result.duplicates} saving={saving} onSave={save} onCancel={() => setResult(null)} />}
    </div>
    <BulkWebsiteImport />
    </div>
  );
}