import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

// Lets a venue owner export everything we store about their business as a single
// JSON file: their venues plus all records tied to those venues (listings, passes,
// ad campaigns, beacons, reviews received, events, notifications, etc.).
export default function DownloadVenueData({ user, venues }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Only export venues this user actually owns.
      const ownedVenues = (venues || []).filter(v => v.owner_id === user.id);
      const venueIds = ownedVenues.map(v => v.id);
      const inVenues = { venue_id: { $in: venueIds } };

      const [
        listings,
        passes,
        walletPasses,
        adCampaigns,
        beacons,
        reviews,
        events,
        notifications,
        collaborators,
        amenities,
      ] = venueIds.length === 0
        ? [[], [], [], [], [], [], [], [], [], []]
        : await Promise.all([
            base44.entities.Listing.filter({ venue_ref_id: { $in: venueIds } }).catch(() => []),
            base44.entities.PassInstance.filter(inVenues).catch(() => []),
            base44.entities.WalletPass.filter(inVenues).catch(() => []),
            base44.entities.AdCampaign.filter(inVenues).catch(() => []),
            base44.entities.Beacon.filter(inVenues).catch(() => []),
            base44.entities.Review.filter(inVenues).catch(() => []),
            base44.entities.VenueEvent.filter(inVenues).catch(() => []),
            base44.entities.VenueNotification.filter(inVenues).catch(() => []),
            base44.entities.VenueCollaborator.filter(inVenues).catch(() => []),
            base44.entities.VenueAmenity.filter(inVenues).catch(() => []),
          ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        account: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          created_date: user.created_date,
        },
        venues: ownedVenues,
        listings,
        passes,
        wallet_passes: walletPasses,
        ad_campaigns: adCampaigns,
        beacons,
        reviews_received: reviews,
        events,
        venue_notifications: notifications,
        collaborators,
        amenities,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-venue-data-${user.email || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
      <h3 className="text-white font-semibold flex items-center gap-2 mb-1">
        <Download className="w-4 h-4 text-amber-400" /> Download My Venue Data
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Export a copy of all your business data — venues, listings, passes, ad campaigns, beacons, reviews and more.
      </p>
      <Button
        variant="outline"
        className="w-full min-h-[44px] bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        {loading ? 'Preparing your data…' : 'Download My Venue Data'}
      </Button>
    </div>
  );
}