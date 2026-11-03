import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Eye, MousePointerClick, Loader2 } from 'lucide-react';
import { reviewAdCampaign } from '@/functions/reviewAdCampaign';

const STATUS_STYLE = {
  pending: 'bg-amber-500 text-white',
  approved: 'bg-emerald-500 text-white',
  rejected: 'bg-red-500 text-white',
  draft: 'bg-slate-400 text-white',
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'];

export default function AdminAdApprovals() {
  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.AdCampaign.list('-paid_at').catch(() => []);
    // Only show paid ads in admin review (drafts never paid are noise)
    setCampaigns(all.filter(a => a.payment_status === 'paid' || a.status !== 'draft'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const act = async (campaign, action) => {
    setBusyId(campaign.id);
    try {
      await reviewAdCampaign({ campaign_id: campaign.id, action, note: notes[campaign.id] || '' });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const filtered = filter === 'all' ? campaigns : campaigns.filter(a => a.status === filter);
  const pendingCount = campaigns.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-heading font-bold">Ad Approvals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paid ads awaiting review. Approving an ad emails the owner and puts it live in rotation.
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">No {filter} ads.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ad => (
            <div key={ad.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {ad.image_url && (
                  <img src={ad.image_url} alt={ad.title || ad.venue_name} className="w-full sm:w-48 h-40 object-cover flex-shrink-0" />
                )}
                <div className="p-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{ad.title || ad.venue_name}</p>
                      <p className="text-xs text-muted-foreground">{ad.venue_name} · {ad.owner_email}</p>
                    </div>
                    <Badge className={`${STATUS_STYLE[ad.status]} text-xs flex-shrink-0`}>{ad.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ad.tier === 'weekend' ? 'Weekend' : 'Weekday'} · {ad.start_date} → {ad.end_date}
                    {ad.price_paid ? ` · $${ad.price_paid} paid` : ''}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {ad.impression_count || 0}</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {ad.click_count || 0}</span>
                    {ad.click_url && <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-[160px]">{ad.click_url}</a>}
                  </div>

                  {ad.status === 'pending' && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Optional note (shown to owner on rejection)…"
                        value={notes[ad.id] || ''}
                        onChange={e => setNotes(n => ({ ...n, [ad.id]: e.target.value }))}
                        className="text-sm min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busyId === ad.id} onClick={() => act(ad, 'approve')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                          {busyId === ad.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === ad.id} onClick={() => act(ad, 'reject')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                          <X className="w-4 h-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                  {ad.status === 'rejected' && ad.admin_note && (
                    <p className="text-xs text-red-500 mt-2">Note: {ad.admin_note}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}