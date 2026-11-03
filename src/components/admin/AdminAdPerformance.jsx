import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, MousePointerClick, Megaphone, TrendingUp, Search } from 'lucide-react';

const STATUS_STYLE = {
  approved: 'bg-emerald-500 text-white',
  pending: 'bg-amber-500 text-white',
  rejected: 'bg-red-500 text-white',
  draft: 'bg-slate-400 text-white',
};
const STATUS_LABEL = {
  approved: 'Live',
  pending: 'Under Review',
  rejected: 'Rejected',
  draft: 'Awaiting Payment',
};

const ctr = (views, clicks) => (views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0');

// Admin view: every paid ad campaign with its impression & click performance.
export default function AdminAdPerformance() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.AdCampaign.filter({ payment_status: 'paid' }, '-created_date')
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const views = campaigns.reduce((s, c) => s + (c.impression_count || 0), 0);
    const clicks = campaigns.reduce((s, c) => s + (c.click_count || 0), 0);
    return { views, clicks, count: campaigns.length };
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(c =>
      (c.venue_name || '').toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-heading font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" /> Ad Performance
        </h2>
        <p className="text-sm text-muted-foreground">Views and clicks for every purchased ad placement.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none">{totals.count}</p>
          <p className="text-xs text-muted-foreground mt-1">Paid Ads</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none flex items-center gap-1.5"><Eye className="w-4 h-4 text-blue-500" />{totals.views.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Views</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none flex items-center gap-1.5"><MousePointerClick className="w-4 h-4 text-emerald-500" />{totals.clicks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-amber-500" />{ctr(totals.views, totals.clicks)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Avg. Click Rate</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by venue or ad title…" className="pl-9" />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          No paid ad campaigns yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Ad / Venue</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Views</th>
                  <th className="px-4 py-3 font-medium text-right">Clicks</th>
                  <th className="px-4 py-3 font-medium text-right">CTR</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ad => (
                  <tr key={ad.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {ad.image_url && <img src={ad.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{ad.title || ad.venue_name}</p>
                          <p className="text-xs text-muted-foreground">{ad.venue_name} · {ad.tier === 'weekend' ? 'Weekend' : 'Weekday'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_STYLE[ad.status] || 'bg-slate-400 text-white'} text-xs`}>
                        {STATUS_LABEL[ad.status] || ad.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{(ad.impression_count || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">{(ad.click_count || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{ctr(ad.impression_count || 0, ad.click_count || 0)}%</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{ad.price_paid ? `$${ad.price_paid}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}