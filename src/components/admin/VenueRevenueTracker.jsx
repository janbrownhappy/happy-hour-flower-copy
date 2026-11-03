import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminLocation, venueInTerritory, profileInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const VENUE_TIER_PRICE = { premium: 49.90, platinum: 99.99 };
const CONSUMER_TIER_PRICE = { premium: 4.99, platinum: 9.99 };

const VENUE_TIER_CONFIG = {
  premium: { label: 'Premium', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Crown className="w-3 h-3" /> },
  platinum: { label: 'Platinum', color: 'bg-slate-100 text-slate-800 border-slate-400', icon: <Zap className="w-3 h-3" /> },
};

const CONSUMER_TIER_CONFIG = {
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: <Crown className="w-3 h-3" /> },
  platinum: { label: 'Platinum', color: 'bg-indigo-100 text-indigo-800 border-indigo-400', icon: <Zap className="w-3 h-3" /> },
};

export default function VenueRevenueTracker() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [allVenues, allUsers, allProfiles] = await Promise.all([
      base44.entities.Venue.list(),
      base44.entities.User.list(),
      base44.entities.Profile.list(),
    ]);
    const paidVenues = allVenues.filter(v => v.subscription_tier === 'premium' || v.subscription_tier === 'platinum');
    const paidConsumers = allProfiles.filter(p =>
      (p.subscription_tier === 'premium' || p.subscription_tier === 'platinum') &&
      p.subscription_status !== 'expired' && p.subscription_status !== 'canceled'
    );
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));
    setVenues(paidVenues);
    setConsumers(paidConsumers);
    setUsers(userMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Scope both venues and consumer subscribers to the active territory.
  const allVenues = venues;
  const allConsumers = consumers;
  const t = hasTerritory(locationFilter);
  const scopedVenues = t ? allVenues.filter(v => venueInTerritory(v, locationFilter)) : allVenues;
  const scopedConsumers = t ? allConsumers.filter(c => profileInTerritory(c, locationFilter)) : allConsumers;

  const venuePremiumCount = scopedVenues.filter(v => v.subscription_tier === 'premium').length;
  const venuePlatinumCount = scopedVenues.filter(v => v.subscription_tier === 'platinum').length;
  const venueMrr = scopedVenues.reduce((sum, v) => sum + (VENUE_TIER_PRICE[v.subscription_tier] || 0), 0);

  const consumerPremiumCount = scopedConsumers.filter(c => c.subscription_tier === 'premium').length;
  const consumerPlatinumCount = scopedConsumers.filter(c => c.subscription_tier === 'platinum').length;
  const consumerMrr = scopedConsumers.reduce((sum, c) => sum + (CONSUMER_TIER_PRICE[c.subscription_tier] || 0), 0);

  const totalMrr = venueMrr + consumerMrr;

  return (
    <div className="space-y-6">
      {/* Top-level summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{venuePremiumCount}</p>
          <p className="text-xs text-amber-600 mt-0.5">Premium Venues</p>
          <p className="text-xs text-muted-foreground">${(venuePremiumCount * VENUE_TIER_PRICE.premium).toFixed(2)}/mo</p>
        </div>
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{venuePlatinumCount}</p>
          <p className="text-xs text-slate-600 mt-0.5">Platinum Venues</p>
          <p className="text-xs text-muted-foreground">${(venuePlatinumCount * VENUE_TIER_PRICE.platinum).toFixed(2)}/mo</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{scopedConsumers.length}</p>
          <p className="text-xs text-purple-600 mt-0.5">Consumer Subscribers</p>
          <p className="text-xs text-muted-foreground">${consumerMrr.toFixed(2)}/mo</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">${totalMrr.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-0.5">Total Est. MRR</p>
          <p className="text-xs text-muted-foreground">{scopedVenues.length + scopedConsumers.length} paid subs</p>
        </div>
      </div>

      {/* Venue subscriptions table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Paid Venue Subscriptions</h3>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : scopedVenues.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No paid venues yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Venue</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tier</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">City</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scopedVenues.map(v => {
                const cfg = VENUE_TIER_CONFIG[v.subscription_tier];
                const owner = users[v.owner_id];
                return (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {owner ? owner.full_name || owner.email : v.owner_id ? '—' : 'Unassigned'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.city || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={v.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {v.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      ${VENUE_TIER_PRICE[v.subscription_tier]?.toFixed(2)}/mo
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50">
              <tr>
                <td colSpan={5} className="px-4 py-2 text-sm font-semibold">Venue MRR</td>
                <td className="px-4 py-2 text-right font-bold text-green-700">${venueMrr.toFixed(2)}/mo</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Consumer subscriptions table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-sm">Consumer Premium Subscriptions</h3>
          </div>
          <span className="text-xs text-muted-foreground">{scopedConsumers.length} subscribers · ${consumerMrr.toFixed(2)}/mo</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : scopedConsumers.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No consumer subscribers yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tier</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expires</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scopedConsumers.map(c => {
                const cfg = CONSUMER_TIER_CONFIG[c.subscription_tier] || CONSUMER_TIER_CONFIG.premium;
                const expiresAt = c.subscription_expires_at ? new Date(c.subscription_expires_at) : null;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.display_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={c.subscription_status === 'active' ? 'default' : 'secondary'}
                        className="text-xs capitalize"
                      >
                        {c.subscription_status || 'active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {expiresAt && !isNaN(expiresAt.getTime())
                        ? expiresAt.toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      ${(CONSUMER_TIER_PRICE[c.subscription_tier] || 0).toFixed(2)}/mo
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50">
              <tr>
                <td colSpan={5} className="px-4 py-2 text-sm font-semibold">Consumer MRR</td>
                <td className="px-4 py-2 text-right font-bold text-green-700">${consumerMrr.toFixed(2)}/mo</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}