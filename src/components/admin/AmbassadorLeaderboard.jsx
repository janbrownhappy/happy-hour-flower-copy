import { useState, useEffect } from 'react';
import { partneroAmbassador } from '@/functions/partneroAmbassador';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, RefreshCw, Loader2, Users, MousePointerClick, TrendingUp, Crown } from 'lucide-react';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const RANK_STYLES = [
  { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', icon: <Trophy className="w-5 h-5 text-amber-500" />, label: '1st' },
  { bg: 'bg-slate-50 border-slate-300', text: 'text-slate-600', icon: <Medal className="w-5 h-5 text-slate-400" />, label: '2nd' },
  { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700', icon: <Medal className="w-5 h-5 text-orange-400" />, label: '3rd' },
];

export default function AmbassadorLeaderboard() {
  const { locationFilter } = useAdminLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => { fetchLeaderboard(); }, [locationFilter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Get all venues that have a partnero_partner_id, scoped to the active territory
      const allVenues = await base44.entities.Venue.list();
      const inTerritory = hasTerritory(locationFilter)
        ? allVenues.filter(v => venueInTerritory(v, locationFilter))
        : allVenues;
      const ambassadorVenues = inTerritory.filter(v => v.partnero_partner_id);

      if (ambassadorVenues.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Fetch stats for all ambassador venues in parallel
      const results = await Promise.allSettled(
        ambassadorVenues.map(async (venue) => {
          const res = await partneroAmbassador({
            action: 'get_stats',
            partnerId: venue.partnero_partner_id,
          });
          if (res.data?.error) throw new Error(res.data.error);
          return {
            venue_id: venue.id,
            venue_name: venue.name,
            subscription_tier: venue.subscription_tier,
            referral_link: venue.partnero_referral_link,
            sign_ups: res.data.customers_count ?? res.data.referrals_count ?? 0,
            referrals: res.data.referrals_count ?? 0,
            clicks: res.data.clicks ?? 0,
            status: res.data.status,
          };
        })
      );

      const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => b.sign_ups - a.sign_ups);

      setRows(successful);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSignUps = rows.reduce((sum, r) => sum + r.sign_ups, 0);
  const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-base font-heading font-bold">Ambassador Leaderboard</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} active ambassador{rows.length !== 1 ? 's' : ''}
              {lastRefreshed && ` · Updated ${lastRefreshed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeaderboard} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{rows.length}</p>
          <p className="text-xs text-muted-foreground">Ambassadors</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{totalSignUps}</p>
          <p className="text-xs text-muted-foreground">Total Sign-ups</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{totalClicks}</p>
          <p className="text-xs text-muted-foreground">Total Clicks</p>
        </div>
      </div>

      {/* Leaderboard table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Fetching referral data from Partnero…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-muted-foreground">No ambassadors yet</p>
          <p className="text-sm text-muted-foreground mt-1">Venue owners who activate their ambassador link will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Venue</div>
            <div className="col-span-2 text-center">Sign-ups</div>
            <div className="col-span-2 text-center">Referrals</div>
            <div className="col-span-2 text-center">Clicks</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {rows.map((row, index) => {
              const rankStyle = RANK_STYLES[index] || null;
              const isTopThree = index < 3;

              return (
                <div
                  key={row.venue_id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors hover:bg-muted/30 ${
                    isTopThree ? `${rankStyle.bg} border-l-4` : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center">
                    {isTopThree ? (
                      <div className="flex flex-col items-center gap-0.5">
                        {rankStyle.icon}
                        <span className={`text-xs font-bold ${rankStyle.text}`}>{rankStyle.label}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  {/* Venue */}
                  <div className="col-span-4">
                    <p className="font-semibold text-sm truncate">{row.venue_name}</p>
                    {row.subscription_tier && row.subscription_tier !== 'free' && (
                      <Badge variant="outline" className="text-xs capitalize mt-0.5 px-1.5 py-0">
                        {row.subscription_tier === 'platinum' && <Crown className="w-2.5 h-2.5 mr-1" />}
                        {row.subscription_tier}
                      </Badge>
                    )}
                  </div>

                  {/* Sign-ups */}
                  <div className="col-span-2 text-center">
                    <span className={`text-lg font-bold ${isTopThree ? rankStyle.text : 'text-foreground'}`}>
                      {row.sign_ups}
                    </span>
                    <p className="text-xs text-muted-foreground">sign-ups</p>
                  </div>

                  {/* Referrals */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-foreground">{row.referrals}</span>
                    <p className="text-xs text-muted-foreground">referrals</p>
                  </div>

                  {/* Clicks */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-foreground">{row.clicks}</span>
                    <p className="text-xs text-muted-foreground">clicks</p>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 flex justify-center">
                    <Badge
                      className={`text-xs capitalize ${
                        row.status === 'active'
                          ? 'bg-green-100 text-green-700 border-0'
                          : 'bg-gray-100 text-gray-600 border-0'
                      }`}
                    >
                      {row.status || 'active'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}