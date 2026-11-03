import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

export default function AdminExpiringDeals() {
  const { locationFilter } = useAdminLocation();
  const [allListings, setAllListings] = useState([]);
  const [venues, setVenues] = useState({});
  const [venueRecords, setVenueRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Listing.list('-expires_at', 500),
      base44.entities.Venue.list(),
    ]).then(([listingData, venueData]) => {
      setAllListings(listingData.filter(l => l.expires_at));
      setVenueRecords(venueData);
      setVenues(Object.fromEntries(venueData.map(v => [v.id, v.name])));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const hasTerritory = locationFilter.state_code || locationFilter.market_id || locationFilter.area_id;
  const venueById = Object.fromEntries(venueRecords.map(v => [v.id, v]));
  const listings = hasTerritory
    ? allListings.filter(l => {
        const v = venueById[l.venue_ref_id];
        return v && venueInTerritory(v, locationFilter);
      })
    : allListings;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysUntil = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  };

  const expired = listings.filter(l => getDaysUntil(l.expires_at) < 0);
  const expiringThisWeek = listings.filter(l => { const d = getDaysUntil(l.expires_at); return d >= 0 && d <= 7; });
  const expiringThisMonth = listings.filter(l => { const d = getDaysUntil(l.expires_at); return d > 7 && d <= 30; });
  const future = listings.filter(l => getDaysUntil(l.expires_at) > 30);

  const getUrgencyStyle = (days) => {
    if (days < 0) return 'border-red-300 bg-red-50';
    if (days <= 3) return 'border-red-200 bg-red-50/50';
    if (days <= 7) return 'border-yellow-200 bg-yellow-50/50';
    if (days <= 30) return 'border-amber-200 bg-amber-50/30';
    return 'border-border bg-card';
  };

  const getBadge = (days) => {
    if (days < 0) return <Badge className="bg-red-600 text-white text-xs py-0">Expired {Math.abs(days)}d ago</Badge>;
    if (days === 0) return <Badge className="bg-red-500 text-white text-xs py-0">Expires today</Badge>;
    if (days <= 3) return <Badge className="bg-red-400 text-white text-xs py-0">Expires in {days}d</Badge>;
    if (days <= 7) return <Badge className="bg-yellow-500 text-white text-xs py-0">Expires in {days}d</Badge>;
    return <Badge variant="outline" className="text-xs py-0">Expires in {days}d</Badge>;
  };

  const handleRunCheck = async () => {
    setRunningCheck(true);
    try {
      const { checkExpiringDeals } = await import('@/functions/checkExpiringDeals');
      await checkExpiringDeals({});
      load();
      alert('Expiry check complete! Venue owners have been notified where applicable.');
    } catch (err) {
      alert('Error running check: ' + err.message);
    } finally {
      setRunningCheck(false);
    }
  };

  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>;

  const renderSection = (title, items, icon, emptyMsg) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {items.map(listing => {
            const days = getDaysUntil(listing.expires_at);
            const venueName = listing.venue_name || venues[listing.venue_ref_id] || 'Unknown Venue';
            return (
              <div key={listing.id} className={`flex items-start gap-3 p-3 border rounded-xl ${getUrgencyStyle(days)}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{listing.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{venueName}</p>
                  {listing.deals?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{listing.deals.join(' · ')}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {getBadge(days)}
                  <p className="text-xs text-muted-foreground">{new Date(listing.expires_at).toLocaleDateString()}</p>
                  {listing.expiry_notified_at && (
                    <p className="text-xs text-green-600 flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Notified
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{expired.length}</p>
          <p className="text-xs text-muted-foreground">Expired</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{expiringThisWeek.length}</p>
          <p className="text-xs text-muted-foreground">This Week</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{expiringThisMonth.length}</p>
          <p className="text-xs text-muted-foreground">This Month</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{future.length}</p>
          <p className="text-xs text-muted-foreground">Future</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-muted-foreground">{listings.length} listings with expiry dates</p>
        <Button size="sm" variant="outline" onClick={handleRunCheck} disabled={runningCheck}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${runningCheck ? 'animate-spin' : ''}`} />
          {runningCheck ? 'Running…' : 'Run Expiry Check'}
        </Button>
      </div>

      {renderSection('Expired', expired, <AlertTriangle className="w-4 h-4 text-red-500" />, 'No expired deals.')}
      {renderSection('Expiring This Week', expiringThisWeek, <Clock className="w-4 h-4 text-yellow-500" />, 'None expiring this week.')}
      {renderSection('Expiring This Month', expiringThisMonth, <Clock className="w-4 h-4 text-amber-500" />, 'None expiring this month.')}
      {renderSection('Future (30+ days)', future, <CheckCircle className="w-4 h-4 text-green-500" />, 'No future-dated deals.')}
    </div>
  );
}