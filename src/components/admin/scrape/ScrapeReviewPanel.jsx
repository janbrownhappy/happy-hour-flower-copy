import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, ExternalLink, Check, ShieldAlert, AlertTriangle } from 'lucide-react';

// Venues whose last scrape came back empty, failed, or was blocked by a manual override.
export default function ScrapeReviewPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrideOnly, setOverrideOnly] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const venues = await base44.entities.Venue.filter({ scrape_status: 'needs_review' }).catch(() => []);
    setRows(
      venues.sort((a, b) => String(b.last_scraped_at || '').localeCompare(String(a.last_scraped_at || '')))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markReviewed = async (venue) => {
    setSavingId(venue.id);
    await base44.entities.Venue.update(venue.id, { scrape_status: 'scraped' });
    setRows(prev => prev.filter(r => r.id !== venue.id));
    setSavingId(null);
  };

  const visible = overrideOnly ? rows.filter(r => r.manual_override === true) : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-xl font-heading font-bold">Scrape Review</h2>
          <p className="text-sm text-muted-foreground">
            {visible.length} venue{visible.length === 1 ? '' : 's'} need a look — the scraper came back empty,
            errored, or the record is hand-protected.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={overrideOnly} onCheckedChange={setOverrideOnly} />
          Hand-corrected only
        </label>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p>Nothing waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(v => (
            <div key={v.id} className="border border-border rounded-xl p-3 bg-card flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{v.name}</p>
                  {v.city && <span className="text-xs text-muted-foreground">{v.city}</span>}
                  {v.manual_override && (
                    <Badge className="bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Hand-corrected
                    </Badge>
                  )}
                </div>
                {v.source_url && (
                  <a href={v.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                    {v.source_url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {v.last_scrape_error && (
                  <p className="text-xs text-destructive flex items-start gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {v.last_scrape_error}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Last scraped: {v.last_scraped_at ? new Date(v.last_scraped_at).toLocaleString() : '—'}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={savingId === v.id} onClick={() => markReviewed(v)}>
                <Check className="w-4 h-4 mr-1.5" /> Mark reviewed
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}