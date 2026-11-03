import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function AdminReviews() {
  const { locationFilter } = useAdminLocation();
  const [reviews, setReviews] = useState([]);
  const [venues, setVenues] = useState({});
  const [allVenues, setAllVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    Promise.all([
      base44.entities.Review.list('-created_date', 500),
      base44.entities.Venue.list(),
    ]).then(([r, v]) => {
      setReviews(r);
      setAllVenues(v);
      setVenues(Object.fromEntries(v.map(x => [x.id, x.name])));
    }).finally(() => setLoading(false));
  }, []);

  const hasTerritory = locationFilter.state_code || locationFilter.market_id || locationFilter.area_id;
  const inTerritoryIds = hasTerritory
    ? new Set(allVenues.filter(v => venueInTerritory(v, locationFilter)).map(v => v.id))
    : null;

  const updateStatus = async (review, status) => {
    const updated = await base44.entities.Review.update(review.id, { status });
    setReviews(prev => prev.map(r => r.id === review.id ? updated : r));
  };

  const territoryReviews = inTerritoryIds ? reviews.filter(r => inTerritoryIds.has(r.venue_id)) : reviews;
  const filtered = territoryReviews.filter(r => r.status === activeTab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl w-fit">
        {STATUS_TABS.map(tab => {
          const count = territoryReviews.filter(r => r.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab} {count > 0 && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${tab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-muted-foreground/20'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No {activeTab} reviews.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="p-4 bg-card border border-border rounded-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{r.user_name || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm text-primary font-medium">{venues[r.venue_id] || 'Unknown venue'}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {r.created_date ? format(parseISO(r.created_date), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mb-1.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>

                {activeTab === 'pending' && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateStatus(r, 'approved')}
                      className="p-1.5 rounded-lg hover:bg-green-100 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </button>
                    <button
                      onClick={() => updateStatus(r, 'rejected')}
                      className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5 text-destructive" />
                    </button>
                  </div>
                )}
                {activeTab !== 'pending' && (
                  <button
                    onClick={() => updateStatus(r, 'pending')}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 flex-shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}