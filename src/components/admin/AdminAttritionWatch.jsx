import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Store, Eye, Heart, CalendarClock, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

// Thresholds for flagging a venue as attrition-risk.
const LOW_ENGAGEMENT_VIEWS = 10;      // fewer lifetime views than this = low engagement
const LOW_ENGAGEMENT_FAVORITES = 3;   // fewer favorites than this = low engagement
const STALE_DAYS = 45;                // no profile update in this many days = stale

const DAY_MS = 1000 * 60 * 60 * 24;

// Does the venue have any published happy-hour content (deals or hours)?
function hasStatusUpdates(v) {
  const hasHours = !!(v.happy_hour_start && v.happy_hour_end) ||
    (v.day_schedules && Object.keys(v.day_schedules).length > 0);
  const hasDeals = (Array.isArray(v.deals) && v.deals.length > 0) ||
    (v.deals_by_day && Object.values(v.deals_by_day).some(arr => Array.isArray(arr) && arr.length > 0));
  return hasHours || hasDeals;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / DAY_MS);
}

// Evaluate a venue and return the list of risk reasons it triggers.
function evaluateRisk(v) {
  const reasons = [];
  const views = v.view_count || 0;
  const favs = v.favorite_count || 0;
  const stale = daysSince(v.updated_date);

  if (views < LOW_ENGAGEMENT_VIEWS) reasons.push('low_views');
  if (favs < LOW_ENGAGEMENT_FAVORITES) reasons.push('low_favorites');
  if (!hasStatusUpdates(v)) reasons.push('missing_status');
  if (stale >= STALE_DAYS) reasons.push('stale');

  return reasons;
}

const REASON_META = {
  low_views: { label: 'Low views', icon: Eye, badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  low_favorites: { label: 'Few favorites', icon: Heart, badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  missing_status: { label: 'No deals/hours', icon: AlertTriangle, badge: 'bg-red-50 border-red-200 text-red-700' },
  stale: { label: 'Stale', icon: CalendarClock, badge: 'bg-orange-50 border-orange-200 text-orange-700' },
};

function StatCard({ icon: Icon, value, label, tone = 'default' }) {
  const tones = {
    default: 'bg-card border-border text-foreground',
    red: 'bg-red-50 border-red-200 text-red-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  };
  return (
    <div className={`border rounded-xl p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-2xl font-bold leading-none">{value}</span>
      </div>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

export default function AdminAttritionWatch() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | low_views | low_favorites | missing_status | stale

  useEffect(() => {
    base44.entities.Venue.list()
      .then(v => setVenues(v || []))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, []);

  const scopedVenues = useMemo(() =>
    hasTerritory(locationFilter) ? venues.filter(v => venueInTerritory(v, locationFilter)) : venues,
  [venues, locationFilter]);

  // Only consider active venues — canceled/inactive are covered by the Churn tab.
  const activeVenues = useMemo(() =>
    scopedVenues.filter(v => v.status === 'active' || !v.status),
  [scopedVenues]);

  const atRisk = useMemo(() => {
    return activeVenues
      .map(v => ({ venue: v, reasons: evaluateRisk(v) }))
      .filter(r => r.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length);
  }, [activeVenues]);

  const counts = useMemo(() => {
    const c = { low_views: 0, low_favorites: 0, missing_status: 0, stale: 0 };
    atRisk.forEach(r => r.reasons.forEach(reason => { c[reason]++; }));
    return c;
  }, [atRisk]);

  const filtered = useMemo(() =>
    filter === 'all' ? atRisk : atRisk.filter(r => r.reasons.includes(filter)),
  [atRisk, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-heading font-bold">Attrition Watch</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        Active venues showing early warning signs — reach out before they churn.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={AlertTriangle} value={atRisk.length} label="Venues at Risk" tone="red" />
        <StatCard icon={AlertTriangle} value={counts.missing_status} label="Missing Deals/Hours" tone="red" />
        <StatCard icon={CalendarClock} value={counts.stale} label={`No Update ${STALE_DAYS}d+`} tone="orange" />
        <StatCard icon={Eye} value={counts.low_views} label="Low Views" tone="amber" />
        <StatCard icon={Heart} value={counts.low_favorites} label="Few Favorites" tone="amber" />
      </div>

      {/* Filter + list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">At-Risk Venues ({filtered.length})</h3>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44 h-9"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All signals</SelectItem>
              <SelectItem value="missing_status">Missing deals/hours</SelectItem>
              <SelectItem value="stale">Stale (no update)</SelectItem>
              <SelectItem value="low_views">Low views</SelectItem>
              <SelectItem value="low_favorites">Few favorites</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {atRisk.length === 0 ? 'No active venues are showing attrition signals. 🎉' : 'No venues match this signal.'}
          </p>
        ) : (
          <div className="divide-y divide-border/50 max-h-[32rem] overflow-y-auto">
            {filtered.map(({ venue: v, reasons }) => {
              const stale = daysSince(v.updated_date);
              return (
                <a
                  key={v.id}
                  href={`/venue-dashboard/${v.id}`}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[v.city, v.market_name].filter(Boolean).join(' · ')}
                      {v.subscription_tier && v.subscription_tier !== 'free' && (
                        <span className="ml-1 capitalize">· {v.subscription_tier}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {reasons.map(reason => {
                        const meta = REASON_META[reason];
                        const Icon = meta.icon;
                        return (
                          <span key={reason} className={`inline-flex items-center gap-1 text-[11px] border rounded-full px-2 py-0.5 ${meta.badge}`}>
                            <Icon className="w-3 h-3" />{meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{v.view_count || 0} views · {v.favorite_count || 0} favs</p>
                    {stale !== Infinity && (
                      <p>Updated {formatDistanceToNow(new Date(v.updated_date), { addSuffix: true })}</p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Flags active venues with fewer than {LOW_ENGAGEMENT_VIEWS} views or {LOW_ENGAGEMENT_FAVORITES} favorites,
        no published deals/hours, or no profile update in {STALE_DAYS}+ days.
      </p>
    </div>
  );
}