import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { openFeedback } from '@/lib/featurebase';
import { User, Crown, Bell, Phone, Heart, MapPin, Newspaper, ChevronDown, ChevronUp, ChevronRight, Check, CalendarDays, PlusCircle, MessageSquare, Flag } from 'lucide-react';
import VenueNotificationFeed from '@/components/VenueNotificationFeed';
import MyCrew from '@/components/checkin/MyCrew';
import CrewActivityFeed from '@/components/checkin/CrewActivityFeed';
import CrewUpgradeCard from '@/components/checkin/CrewUpgradeCard';
import RecentCheckIns from '@/components/checkin/RecentCheckIns';
import MyPasses from '@/components/MyPasses';
import MyTerritory from '@/components/MyTerritory';
import LocationServicesToggle from '@/components/LocationServicesToggle';
import ArrivalAlertsToggle from '@/components/ArrivalAlertsToggle';
import DeleteAccountSection from '@/components/DeleteAccountSection';
import DownloadMyData from '@/components/DownloadMyData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Link, useNavigate } from 'react-router-dom';
import PullToRefresh from '@/components/PullToRefresh';
import ProfilePhoneField from '@/components/ProfilePhoneField';

const FREE_FEATURES = [
  '🗺️ Interactive map with all venue locations',
  '📋 Browse complete happy hour listings',
  '📍 Real-time geolocation & distance',
  '🤖 Basic AI-powered recommendations',
  '🔔 Daily push notifications for nearby hours',
  '📝 Up to 3 custom must-visit lists',
  '❤️ Save unlimited favorite venues',
  '💬 Add quick notes to saved venues',
  '📅 Calendar sync: Apple, Google, Outlook',
  '☁️ Cloud backup & cross-device sync',
];

const PREMIUM_FEATURES = [
  '❤️ Unlimited saved favorites',
  '👥 My Crew — invite friends & share check-ins',
  '♾️ Unlimited custom must-visit lists',
  '📱 ZIP code-specific text alerts',
  '🎉 Exclusive premium specials',
  '💬 Direct messaging to businesses',
  '🛠️ Direct messaging to administrators',
  '📆 Advanced date-range filtering',
  '💜 Fan Favorites access',
  '🧠 Enhanced AI recommendations',
  '🚀 Early access to new features',
  '🚫 Ad-free experience',
  '🏅 Premium badge',
  '💬 Add quick notes to saved venues',
  '📅 Calendar sync: Apple, Google, Outlook',
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTierPanel, setShowTierPanel] = useState(false);
  const [premiumRequested, setPremiumRequested] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areas, setAreas] = useState([]);

  const [userVenues, setUserVenues] = useState([]);

  const loadProfile = async () => {
    const authed = await base44.auth.isAuthenticated();
    if (authed) {
      const me = await base44.auth.me();
      setUser(me);
      // Find this user's profile by their Base44 user id (reliable key).
      const profiles = await base44.entities.Profile.filter({ created_by_id: me.id });
      let p = profiles[0];
      // No profile yet (e.g. brand-new social signup) — create one so edits persist.
      if (!p) {
        p = await base44.entities.Profile.create({
          email: me.email,
          display_name: me.full_name,
        });
      }
      setProfile(p);

      // Load areas for the user's chosen market (from their saved territory)
      const marketId = p?.location_preferences?.market_id;
      if (marketId) {
        const marketAreas = await base44.entities.LocationArea.filter({ market_id: marketId, is_active: true });
        marketAreas.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.area_name.localeCompare(b.area_name));
        setAreas(marketAreas);
      }

      // Fetch user's venues
      if (me.role === 'venue_owner') {
        const allVenues = await base44.entities.Venue.list();
        const owned = allVenues.filter(v => v.owner_id === me.id);
        setUserVenues(owned);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, []);

  const updateProfileField = async (field, value) => {
    if (!profile) return;
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    await base44.entities.Profile.update(profile.id, { [field]: value });
  };

  const toggleArea = async (areaId) => {
    const current = profile?.notif_areas || [];
    const next = current.includes(areaId) ? current.filter(a => a !== areaId) : [...current, areaId];
    await updateProfileField('notif_areas', next);
  };

  const handleRequestPremium = async () => {
    // Send an email to admin notifying of premium request
    await base44.functions.invoke('requestPremiumUpgrade', { source: 'consumer' });
    setPremiumRequested(true);
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🌸</p>
        <h2 className="text-xl font-heading font-bold mb-2">Sign in to access your profile</h2>
        <p className="text-muted-foreground text-sm mb-6">Save favorites and get personalized deals</p>
        <Button onClick={() => base44.auth.redirectToLogin()} className="w-full">
          Sign In
        </Button>
      </div>
    );
  }

  const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

  const tierLabel = (profile?.subscription_tier && profile.subscription_tier !== 'free')
    ? profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)
    : (isPremium ? 'Premium' : 'Free');
  const statusLabel = profile?.subscription_status
    ? profile.subscription_status.charAt(0).toUpperCase() + profile.subscription_status.slice(1)
    : (isPremium ? 'Active' : 'Free plan');
  const expiresAt = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at)
    : null;
  const expiresValid = expiresAt && !isNaN(expiresAt.getTime());

  return (
    <PullToRefresh onRefresh={loadProfile}>
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg truncate">{profile?.display_name || user.full_name}</p>
            {isPremium && <Badge className="bg-primary text-white text-xs"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" /> {profile.phone}
            </p>
          )}
        </div>
      </div>

      {profile && <ProfilePhoneField value={profile.phone} onSave={(v) => updateProfileField('phone', v)} />}

      {/* Tier section */}
      <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
        {/* Header row */}
        <button
          onClick={() => setShowTierPanel(p => !p)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Crown className={`w-5 h-5 ${isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-left">
              <p className="font-semibold text-sm">{isPremium ? 'Premium Member' : 'Free Plan'}</p>
              <p className="text-xs text-muted-foreground">{isPremium ? 'All premium features unlocked' : 'Upgrade to unlock more features'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && <Badge className="bg-primary text-white text-xs">Active</Badge>}
            {showTierPanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {showTierPanel && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Tier toggle tabs — only meaningful for free users (premium has nothing to switch to) */}
            {!isPremium && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border-2 p-3 cursor-default transition-all border-primary bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">Free</p>
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Your current plan</p>
                </div>
                <div className="rounded-xl border-2 p-3 cursor-default transition-all border-amber-400/40 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-primary">Premium</p>
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">Request access</p>
                </div>
              </div>
            )}

            {/* Free features */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Free Includes</p>
              <ul className="space-y-1">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="text-xs text-foreground">{f}</li>
                ))}
              </ul>
            </div>

            {/* Premium features */}
            <div className={`rounded-xl p-3 ${isPremium ? 'bg-primary/5 border border-primary/20' : 'bg-amber-50/40 border border-amber-400/30'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">👑 Premium — Everything above, plus:</p>
              <ul className="space-y-1">
                {PREMIUM_FEATURES.map((f, i) => (
                  <li key={i} className={`text-xs ${isPremium ? 'text-foreground' : 'text-muted-foreground'}`}>{f}</li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            {!isPremium && (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => navigate('/plans/consumer')}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
                <p className="text-xs text-muted-foreground text-center">Unlock all premium features instantly</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="bg-card border border-border rounded-2xl divide-y divide-border mb-4">
        <Link to={userVenues[0]?.id ? `/plans/venue?venue_id=${userVenues[0].id}` : '/plans/venue'} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
          <Crown className="w-5 h-5 text-sky-500" />
          <span className="font-medium">Venue Plans</span>
        </Link>
        <Link to="/favorites" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="font-medium">My Favorites</span>
        </Link>
        <Link to="/map" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">Map View</span>
        </Link>
        <Link to="/news" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
          <Newspaper className="w-5 h-5 text-blue-500" />
          <span className="font-medium">News & Updates</span>
        </Link>
        <Link to="/explore?view=calendar" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
          <CalendarDays className="w-5 h-5 text-amber-500" />
          <span className="font-medium">Happy Hour Calendar</span>
        </Link>
        <Link to="/suggest" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
          <PlusCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">Suggest a Spot</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            // TODO: replace with the report-an-issue link once provided
          }}
          className="w-full text-left flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <Flag className="w-5 h-5 text-orange-500" />
          <span className="font-medium">Report an Issue</span>
        </button>
      </div>

      {/* My collected coupons / passes */}
      {user && <MyPasses userId={user.id} />}

      {/* My check-ins */}
      {user && <RecentCheckIns userId={user.id} />}

      {/* My crew — invite friends via SMS/email (premium only; free users see upgrade prompt) */}
      {user && (isPremium ? (
        <>
          <MyCrew userId={user.id} />
          <CrewActivityFeed userId={user.id} />
        </>
      ) : <CrewUpgradeCard />)}

      {/* Territory / location personalization */}
      <MyTerritory />

      {/* In-app venue update feed */}
      {user && <VenueNotificationFeed userId={user.id} />}

      {/* Device location services permission */}
      {profile && (
        <LocationServicesToggle
          enabled={profile.location_services_enabled}
          onChange={(val) => updateProfileField('location_services_enabled', val)}
        />
      )}
      {profile && (
        <ArrivalAlertsToggle
          enabled={profile.arrival_alerts_enabled}
          onChange={(val) => updateProfileField('arrival_alerts_enabled', val)}
        />
      )}

      {/* Notifications */}
      {profile && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" /> Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts on this device</p>
              </div>
              <Switch
                checked={profile.notif_push ?? true}
                onCheckedChange={val => updateProfileField('notif_push', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">New Happy Hour Deals</p>
                <p className="text-xs text-muted-foreground">Alerts for new deals in your areas</p>
              </div>
              <Switch
                checked={profile.notif_new_deals ?? true}
                onCheckedChange={val => updateProfileField('notif_new_deals', val)}
                disabled={!profile.notif_push}
              />
            </div>

            {/* Area picker — only shown when deal notifications are on */}
            {profile.notif_push && profile.notif_new_deals && (
              <div className="pt-1">
                {areas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Set your region in My Territory to choose areas for deal alerts.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={() => setShowAreaPicker(p => !p)}
                      className="w-full flex items-center justify-between text-sm font-medium text-primary py-1"
                    >
                      <span>
                        Areas ({(profile.notif_areas || []).length} selected)
                      </span>
                      {showAreaPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showAreaPicker && (
                      <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
                        {areas.map(area => {
                          const selected = (profile.notif_areas || []).includes(area.area_id);
                          return (
                            <label key={area.area_id} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleArea(area.area_id)}
                                className="accent-primary w-4 h-4 rounded"
                              />
                              <span className="text-xs text-foreground leading-snug">{area.area_name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {(profile.notif_areas || []).length === 0 && !showAreaPicker && (
                      <p className="text-xs text-muted-foreground mt-1">Tap above to choose areas</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <p className="text-sm font-medium">SMS Alerts</p>
                <p className="text-xs text-muted-foreground">Text message notifications</p>
              </div>
              <Switch
                checked={profile.notif_sms ?? false}
                onCheckedChange={val => updateProfileField('notif_sms', val)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Venue owner section */}
      {user.role === 'venue_owner' && (
        <Link to="/venue-owner">
          <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 rounded-2xl p-4 mb-4 flex items-center justify-between hover:border-amber-500/70 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Venue Dashboard</p>
                <p className="text-xs text-muted-foreground">
                  {userVenues.length > 0
                    ? `Manage ${userVenues.length} venue${userVenues.length > 1 ? 's' : ''}`
                    : 'Set up your listing'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Venue Plans — upgrade entry for venue owners */}
      {(user.role === 'venue_owner' || userVenues.length > 0) && (
        <Link to={userVenues[0]?.id ? `/plans/venue?venue_id=${userVenues[0].id}` : '/plans/venue'}>
          <div className="bg-gradient-to-r from-sky-500/15 to-violet-500/10 border border-sky-400/40 rounded-2xl p-4 mb-4 flex items-center justify-between hover:border-sky-400/70 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Venue Plans</p>
                <p className="text-xs text-muted-foreground">Compare plans and upgrade your venue</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Featurebase feedback trigger */}
      <Button
        variant="outline"
        className="w-full min-h-[44px] mb-3"
        onClick={openFeedback}
      >
        <MessageSquare className="w-4 h-4 mr-2" /> Send Feedback
      </Button>

      {/* Download all stored personal data */}
      <DownloadMyData user={user} profile={profile} />

      {/* Danger zone — permanent account deletion */}
      <DeleteAccountSection user={user} profile={profile} />

      {/* Footer — legal */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        <a
          href="https://happyhourflower.com/privacy-policy"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          Privacy Policy
        </a>
      </p>
    </div>
    </PullToRefresh>
  );
}