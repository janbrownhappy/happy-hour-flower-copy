import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import VenueCard from '@/components/VenueCard';
import useResolvedVenues from '@/hooks/useResolvedVenues';
import { Heart, Bell, BellOff, Lock, Crown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useUpgradePrompt } from '@/hooks/useUpgradePrompt';
import PullToRefresh from '@/components/PullToRefresh';

export default function Favorites() {
  const { isPremium } = useSubscription();
  const { requireFeature } = useUpgradePrompt();
  const [favoriteVenues, setFavoriteVenues] = useState([]);
  // Food trucks show their stop for the rest of today — never their business address.
  const resolvedFavorites = useResolvedVenues(favoriteVenues, 'today');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    const [favs, venues] = await Promise.all([
      base44.entities.Favorite.list(),
      base44.entities.Venue.list()
    ]);
    setFavorites(favs);
    const favVenueIds = new Set(favs.map(f => f.venue_id?.toString()));
    setFavoriteVenues(venues.filter(v => favVenueIds.has(v.id?.toString())));
    setLoading(false);
  };

  useEffect(() => { loadFavorites(); }, []);

  const handleToggleFavorite = async (venue) => {
    const existing = favorites.find(f => f.venue_id?.toString() === venue.id?.toString());
    if (existing) {
      await base44.entities.Favorite.delete(existing.id);
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      setFavoriteVenues(prev => prev.filter(v => v.id !== venue.id));
    }
  };

  const handleToggleNotifications = async (venue, enabled) => {
    const fav = favorites.find(f => f.venue_id?.toString() === venue.id?.toString());
    if (!fav) return;
    await base44.entities.Favorite.update(fav.id, { receive_venue_comms: enabled });
    setFavorites(prev => prev.map(f => f.id === fav.id ? { ...f, receive_venue_comms: enabled } : f));
  };

  return (
    <PullToRefresh onRefresh={loadFavorites}>
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" /> My Favorites
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{favoriteVenues.length} saved venues</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : favoriteVenues.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-5xl mb-4">🌸</p>
          <p className="font-semibold text-lg">No favorites yet</p>
          <p className="text-sm mt-2">Tap the heart icon on any venue to save it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resolvedFavorites.map(venue => {
            const fav = favorites.find(f => f.venue_id?.toString() === venue.id?.toString());
            const notifEnabled = !!fav?.receive_venue_comms;
            return (
              <div key={venue.id} className="flex flex-col gap-0">
                <VenueCard
                  venue={venue}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                />
                <div className="flex items-center justify-between px-3 py-2.5 bg-card border border-t-0 border-border rounded-b-2xl -mt-3 pt-4">
                  <div className="flex items-center gap-2">
                    {!isPremium
                      ? <Lock className="w-4 h-4 text-muted-foreground" />
                      : notifEnabled
                        ? <Bell className="w-4 h-4 text-primary" />
                        : <BellOff className="w-4 h-4 text-muted-foreground" />
                    }
                    <span className="text-xs font-medium text-muted-foreground">Deal alerts</span>
                    {!isPremium && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    {isPremium && notifEnabled && <Badge className="text-xs bg-primary/10 text-primary border-0 px-1.5 py-0">On</Badge>}
                  </div>
                  {isPremium ? (
                    <Switch
                      checked={notifEnabled}
                      onCheckedChange={(enabled) => handleToggleNotifications(venue, enabled)}
                    />
                  ) : (
                    <button
                      onClick={() => requireFeature('Deal Alerts', 'premium')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}