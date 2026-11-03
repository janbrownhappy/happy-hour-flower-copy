import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Phone, Globe, Search, MapPin, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

const FLAG_LABELS = {
  no_phone: { label: 'No Phone', icon: Phone, color: 'bg-red-100 text-red-700 border-red-200' },
  no_website: { label: 'No Website', icon: Globe, color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

function getFlags(venue) {
  const flags = [];
  if (!venue.phone?.trim()) flags.push('no_phone');
  if (!venue.website?.trim()) flags.push('no_website');
  return flags;
}

export default function AdminIncompleteVenues() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'no_phone' | 'no_website' | 'both'
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Venue.list().then(all => {
      const incomplete = all.filter(v => getFlags(v).length > 0);
      setVenues(incomplete);
      setLoading(false);
    });
  }, []);

  const territoryVenues = venues.filter(v => venueInTerritory(v, locationFilter));

  const filtered = territoryVenues.filter(v => {
    const flags = getFlags(v);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'both' && flags.length === 2) ||
      flags.includes(filter);
    const matchesSearch =
      !search ||
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.city?.toLowerCase().includes(search.toLowerCase()) ||
      v.neighborhood?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: territoryVenues.length,
    no_phone: territoryVenues.filter(v => getFlags(v).includes('no_phone')).length,
    no_website: territoryVenues.filter(v => getFlags(v).includes('no_website')).length,
    both: territoryVenues.filter(v => getFlags(v).length === 2).length,
  };

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: `All Incomplete (${counts.all})` },
          { key: 'no_phone', label: `Missing Phone (${counts.no_phone})` },
          { key: 'no_website', label: `Missing Website (${counts.no_website})` },
          { key: 'both', label: `Missing Both (${counts.both})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filter === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, city, or area..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No incomplete venues found</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} venue{filtered.length !== 1 ? 's' : ''} shown</p>
          {filtered.map(venue => {
            const flags = getFlags(venue);
            return (
              <div
                key={venue.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/40 cursor-pointer transition-colors"
                onClick={() => navigate(`/venue-dashboard/${venue.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{venue.name}</p>
                    <Badge variant="outline" className="capitalize text-xs">{venue.subscription_tier || 'free'}</Badge>
                  </div>
                  {(venue.city || venue.neighborhood || venue.address) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {[venue.address, venue.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {flags.map(flag => {
                    const { label, icon: Icon, color } = FLAG_LABELS[flag];
                    return (
                      <span key={flag} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
                        <Icon className="w-3 h-3" />
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}