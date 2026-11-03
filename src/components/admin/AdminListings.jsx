import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Trash2 } from 'lucide-react';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

export default function AdminListings() {
  const { locationFilter } = useAdminLocation();
  const [listings, setListings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Listing.list('-created_date'),
      base44.entities.Venue.list()
    ]).then(([l, v]) => {
      setVenues(v);
      // Auto-resolve venue names by matching venue_name to known venues
      const venueByName = Object.fromEntries(v.map(venue => [venue.name?.toLowerCase(), venue]));
      const resolved = l.map(listing => {
        if (!listing.venue_ref_id && listing.venue_name) {
          const match = venueByName[listing.venue_name?.toLowerCase()];
          if (match) return { ...listing, venue_ref_id: match.id };
        }
        return listing;
      });
      setListings(resolved);
    }).finally(() => setLoading(false));
  }, []);

  const venueById = Object.fromEntries(venues.map(v => [v.id, v]));

  const hasTerritory = locationFilter.state_code || locationFilter.market_id || locationFilter.area_id;
  const visibleListings = hasTerritory
    ? listings.filter(l => {
        const v = venueById[l.venue_ref_id];
        return v && venueInTerritory(v, locationFilter);
      })
    : listings;

  const updateStatus = async (id, status) => {
    const updated = await base44.entities.Listing.update(id, { status });
    setListings(prev => prev.map(l => l.id === id ? updated : l));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this listing?')) return;
    await base44.entities.Listing.delete(id);
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const statusColor = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{visibleListings.length} listings total</p>
      {visibleListings.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No listings submitted yet</p>
      ) : visibleListings.map(listing => (
        <div key={listing.id} className="p-3 bg-card border border-border rounded-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{listing.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {venueById[listing.venue_ref_id]?.name || listing.venue_name || 'Unknown venue'}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-xs py-0 border-0 ${statusColor[listing.status] || 'bg-muted text-muted-foreground'}`}>
                  {listing.status}
                </Badge>
                {listing.is_premium_exclusive && <Badge className="bg-primary text-white text-xs py-0">Premium</Badge>}
                {listing.start_time && (
                  <span className="text-xs text-muted-foreground">{listing.start_time} – {listing.end_time}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {listing.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(listing.id, 'approved')} className="p-1.5 rounded-lg hover:bg-green-100 transition-colors">
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button onClick={() => updateStatus(listing.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-100 transition-colors">
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </>
              )}
              <button onClick={() => handleDelete(listing.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}