import { Badge } from '@/components/ui/badge';
import { Eye, MousePointerClick } from 'lucide-react';

const STATUS_STYLE = {
  draft: 'bg-slate-600 text-white',
  pending: 'bg-amber-500 text-white',
  approved: 'bg-emerald-500 text-white',
  rejected: 'bg-red-500 text-white',
};
const STATUS_LABEL = {
  draft: 'Awaiting Payment',
  pending: 'Under Review',
  approved: 'Live',
  rejected: 'Rejected',
};

// Lists a venue owner's ad campaigns with performance counters.
export default function AdCampaignList({ campaigns }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center text-slate-400 text-sm">
        You haven't created any ads yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-white font-semibold">Your Ads ({campaigns.length})</h2>
      {campaigns.map((ad) => (
        <div key={ad.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex">
          {ad.image_url && (
            <img src={ad.image_url} alt={ad.title || ad.venue_name} className="w-24 h-24 object-cover flex-shrink-0" />
          )}
          <div className="p-3 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{ad.title || ad.venue_name}</p>
                <p className="text-slate-400 text-xs">{ad.venue_name}</p>
              </div>
              <Badge className={`${STATUS_STYLE[ad.status] || 'bg-slate-600 text-white'} text-xs flex-shrink-0`}>
                {STATUS_LABEL[ad.status] || ad.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {ad.tier === 'weekend' ? 'Weekend' : 'Weekday'} · {ad.start_date} → {ad.end_date}
              {ad.price_paid ? ` · $${ad.price_paid}` : ''}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {ad.impression_count || 0} views</span>
              <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {ad.click_count || 0} clicks</span>
            </div>
            {ad.status === 'rejected' && ad.admin_note && (
              <p className="text-xs text-red-400 mt-1">Reason: {ad.admin_note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}