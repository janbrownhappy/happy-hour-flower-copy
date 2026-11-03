import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';

const PAGE_SIZE = 25;

export default function AdminWaitlist() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    base44.entities.Waitlist.list('-created_date', 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e =>
    !search ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.zip_code?.includes(search)
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ZIP code distribution
  const zipCounts = entries.reduce((acc, e) => {
    if (e.zip_code) acc[e.zip_code] = (acc[e.zip_code] || 0) + 1;
    return acc;
  }, {});
  const topZips = Object.entries(zipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const emailConsent = entries.filter(e => e.email_consent).length;
  const smsConsent = entries.filter(e => e.sms_consent).length;

  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{entries.length}</p>
          <p className="text-xs text-muted-foreground">Total Signups</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{emailConsent}</p>
          <p className="text-xs text-muted-foreground">Email Consent</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{smsConsent}</p>
          <p className="text-xs text-muted-foreground">SMS Consent</p>
        </div>
      </div>

      {/* Top ZIPs */}
      {topZips.length > 0 && (
        <div className="mb-4 p-3 bg-muted/40 rounded-xl">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Top ZIP Codes</p>
          <div className="flex gap-2 flex-wrap">
            {topZips.map(([zip, count]) => (
              <span key={zip} className="text-xs bg-card border border-border px-2 py-1 rounded-full">
                {zip} <span className="text-primary font-semibold">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, email, ZIP…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <p className="text-xs text-muted-foreground mb-2">{filtered.length} entries</p>

      <div className="space-y-2">
        {paginated.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {[entry.first_name, entry.last_name].filter(Boolean).join(' ') || 'Anonymous'}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {entry.email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /> {entry.email}
                  </span>
                )}
                {entry.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {entry.phone}
                  </span>
                )}
                {entry.zip_code && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {entry.zip_code}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {entry.email_consent && <Badge variant="outline" className="text-xs py-0 text-green-700 border-green-300">Email ✓</Badge>}
                {entry.sms_consent && <Badge variant="outline" className="text-xs py-0 text-blue-700 border-blue-300">SMS ✓</Badge>}
                {entry.source && <Badge variant="secondary" className="text-xs py-0">{entry.source}</Badge>}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
              {entry.created_date && <p>{new Date(entry.created_date).toLocaleDateString()}</p>}
            </div>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No waitlist entries found.</p>}
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
    </div>
  );
}