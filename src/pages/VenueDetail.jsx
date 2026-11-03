import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AmenityBadges from '@/components/venue/AmenityBadges';
import { Star, Clock, MapPin, Heart, ChevronLeft, ChevronRight, Tag, CalendarDays, Share2, Crown, Lock, ShieldCheck, AlertTriangle, Phone, Globe, Facebook, Youtube, CalendarCheck, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { proximityEvent } from '@/functions/proximityEvent';
import { PHASE2 } from '@/lib/phase2Features';
import TierBadge from '@/components/TierBadge';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import VenueReviews from '@/components/VenueReviews';
import CheckInButton from '@/components/checkin/CheckInButton';
import VenueFavoriteConsentDialog from '@/components/VenueFavoriteConsentDialog';
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, buildIcsDataUrl } from '@/lib/googleCalendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/lib/SubscriptionContext';
import { maxFavorites, maxSpecialsPerDay } from '@/lib/entitlements';
import UpgradePrompt from '@/components/UpgradePrompt';
import ReportListingIssueDialog from '@/components/ReportListingIssueDialog';
import VenueNoteCard from '@/components/VenueNoteCard';
import { Flag } from 'lucide-react';
import { trackOffer } from '@/lib/offerStats';
import ShareVenueButtons from '@/components/venue/ShareVenueButtons';
import VenueDistance from '@/components/venue/VenueDistance';
import TruckScheduleCard from '@/components/venue/TruckScheduleCard';
import { isFoodTruck } from '@/lib/truckSchedule';
import { trackEvent, trackOnce } from '@/lib/analytics';
import { creditEvent } from '@/lib/attributionClient';
import safeUrl from '@/lib/safeUrl';
import currentCoords from '@/lib/currentCoords';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPremium, tier } = useSubscription();
  const [showFavoriteUpgrade, setShowFavoriteUpgrade] = useState(false);
  const [venue, setVenue] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [listings, setListings] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteRecord, setFavoriteRecord] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const touchStartX = useState({ current: null })[0];
  const [events, setEvents] = useState([]);
  const [reservationLinks, setReservationLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [dealViewLogged, setDealViewLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [activeBeacon, setActiveBeacon] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState('');

  // Helper: fire-and-forget activity log entry
  const logActivity = async (action, venueData, description) => {
    try {
      const user = await base44.auth.me();
      if (!user) return;
      await base44.entities.ActivityLog.create({
        venue_id: venueData?.id || id,
        user_id: user.id,
        user_name: user.full_name || user.email,
        action,
        description,
      });
    } catch (_) {
      // non-critical, swallow errors
    }
  };

  // Arrival alerts link with ?section=specials — scroll there once the venue renders.
  useEffect(() => {
    if (!venue || new URLSearchParams(window.location.search).get('section') !== 'specials') return;
    const t = setTimeout(() => document.getElementById('specials')?.scrollIntoView({ behavior: 'smooth' }), 300);
    return () => clearTimeout(t);
  }, [venue?.id]);

  useEffect(() => {
    const load = async () => {
      // Start every request at once; show the venue as soon as it arrives and
      // let the secondary sections fill in afterwards.
      const authedP = base44.auth.isAuthenticated().catch(() => false);
      const amenitiesP = base44.entities.VenueAmenity.filter({ venue_id: id }).catch(() => []);
      const eventsP = base44.entities.VenueEvent.filter({ venue_id: id }).catch(() => []);
      const listingsP = authedP.then(a => a ? base44.entities.Listing.filter({ venue_id: id }).catch(() => []) : []);
      const favsP = authedP.then(a => a ? base44.entities.Favorite.filter({ venue_id: id }).catch(() => []) : []);
      let v = await base44.entities.Venue.get(id).catch(() => null);
      if (!v) { setLoading(false); return; }
      // Flatten venue data if nested
      if (v.data && typeof v.data === 'object') {
        v = { ...v.data, id: v.id };
      }
      setVenue(v);
      setLoading(false);
      const [isAuthed, allAmenities, allListings, allFavs, allEvents] = await Promise.all([authedP, amenitiesP, listingsP, favsP, eventsP]);

      // Track view (uses the already-loaded venue, no extra fetch)
      base44.entities.Venue.update(v.id, { view_count: (v.view_count || 0) + 1 }).catch(() => {});
      logActivity('venue_viewed', v, `Viewed venue: ${v.name}`);
      const qp = new URLSearchParams(window.location.search);
      trackOnce(`venue_viewed:${v.id}`, 'venue_viewed', { venue_id: v.id, venue_category: v.category, market: v.market_name });
      if (isAuthed) creditEvent('venue_view', { venue_id: v.id });
      if (qp.get('special')) {
        trackOnce(`special_viewed:${qp.get('special')}`, 'special_viewed', { venue_id: v.id, special_id: qp.get('special') });
        if (isAuthed) creditEvent('special_view', { venue_id: v.id });
        setTimeout(() => document.getElementById(`special-${qp.get('special')}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
      }

      // venue_id in amenities/listings is the original source integer ID stored in the `venue_id` field
      const venueSourceId = v.venue_id !== undefined ? v.venue_id : null;
      // But we also try matching by id field since migration may map it
      setAmenities(allAmenities.filter(a => a.venue_id === venueSourceId || a.venue_id === v.id));
      setListings(allListings.filter(l => l.venue_id === venueSourceId || l.venue_id === v.id));
      const venueEvents = allEvents.filter(e => e.venue_id === venueSourceId || e.venue_id === v.id);
      setEvents(venueEvents.sort((a, b) => (a.event_date || '').localeCompare(b.event_date || '')));

      // Reservation links (only relevant if the venue accepts/requires reservations)
      if (v.reservation_policy && v.reservation_policy !== 'none') {
        base44.entities.VenueReservationLink.filter({ venue_id: v.id }, 'sort_order')
          .then(setReservationLinks)
          .catch(() => setReservationLinks([]));
      }

      const fav = allFavs.find(f => String(f.venue_id) === String(v.id));
      setIsFavorite(!!fav);
      setFavoriteRecord(fav || null);

      // Look for an active beacon with a linked coupon so consumers can surface the offer in-app.
      if (PHASE2.beacons) {
        base44.entities.Beacon.filter({ venue_id: String(v.id), is_active: true })
          .then(beacons => setActiveBeacon(beacons.find(b => b.wallet_pass_id) || null))
          .catch(() => setActiveBeacon(null));
      }
      if (isAuthed) {
        base44.auth.me().then(me => setCurrentUser(me)).catch(() => {});
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // Track per-offer views once per (venue, day) the visitor actually sees.
  const [viewedDays, setViewedDays] = useState({});
  useEffect(() => {
    if (!venue) return;
    const todayCode = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    const day = selectedDay || (venue.days?.includes(todayCode) ? todayCode : null);
    if (!day || viewedDays[day]) return;
    const dayHasHH = venue.days?.includes(day);
    if (!dayHasHH) return;
    const perDay = venue.deals_by_day?.[day];
    const raw = (perDay?.length > 0 ? perDay : (venue.deals || [])).filter(d => d?.trim());
    const limit = maxSpecialsPerDay(venue.subscription_tier);
    const visible = limit === Infinity ? raw : raw.slice(0, limit);
    if (visible.length === 0) return;
    setViewedDays(prev => ({ ...prev, [day]: true }));
    visible.forEach(offerText => trackOffer({ venue, day, offerText, type: 'view' }));
  }, [venue, selectedDay]);

  const toggleFavorite = async () => {
    // Check auth first
    const authed = await base44.auth.isAuthenticated();
    if (!authed) {
      base44.auth.redirectToLogin();
      return;
    }

    if (isFavorite && favoriteRecord) {
      // Optimistic: flip the heart immediately, revert if the delete fails.
      const prevRecord = favoriteRecord;
      setIsFavorite(false);
      setFavoriteRecord(null);
      try {
        await base44.entities.Favorite.delete(prevRecord.id);
        logActivity('unfavorited', venue, `Unfavorited venue: ${venue.name}`);
        trackEvent('venue_unfavorited', { venue_id: venue.id });
      } catch (err) {
        setIsFavorite(true);
        setFavoriteRecord(prevRecord);
      }
    } else {
      const user = await base44.auth.me();
      // Enforce free-tier favorites limit (free = 1 saved venue)
      const limit = maxFavorites(tier);
      if (limit !== Infinity) {
        const existing = await base44.entities.Favorite.filter({ created_by_id: user.id }).catch(() => []);
        if (existing.length >= limit) {
          setShowFavoriteUpgrade(true);
          return;
        }
      }
      // Optimistic: show the filled heart instantly, revert if the create fails.
      setIsFavorite(true);
      try {
        const created = await base44.entities.Favorite.create({ venue_id: venue.id, user_id: user.id, receive_venue_comms: false });
        setFavoriteRecord(created);
        logActivity('favorited', venue, `Favorited venue: ${venue.name}`);
        trackEvent('venue_favorited', { venue_id: venue.id });
        // Show consent dialog after favoriting
        setShowConsentDialog(true);
      } catch (err) {
        setIsFavorite(false);
        setFavoriteRecord(null);
      }
    }
  };

  const handleTriggerOffer = async () => {
    if (!activeBeacon) return;
    const authed = await base44.auth.isAuthenticated();
    if (!authed) { base44.auth.redirectToLogin(); return; }
    setTriggering(true);
    setTriggerError('');
    try {
      const coords = await currentCoords();
      const res = await proximityEvent({ event_type: 'beacon_detected', beacon_uid: activeBeacon.beacon_uid, ...coords });
      const data = res?.data;
      if (data?.success && data.pass_instance_id) {
        navigate(`/wallet-pass/${data.pass_instance_id}`);
      } else {
        setTriggerError(data?.reason || data?.error || 'No offer is available right now.');
      }
    } catch (err) {
      setTriggerError(err?.response?.data?.error || 'Could not surface the offer. Please try again.');
    } finally {
      setTriggering(false);
    }
  };

  const handleConsentAccept = async () => {
    if (favoriteRecord) {
      await base44.entities.Favorite.update(favoriteRecord.id, { receive_venue_comms: true });
      setFavoriteRecord(prev => ({ ...prev, receive_venue_comms: true }));
    }
    setShowConsentDialog(false);
  };

  const handleConsentDecline = () => {
    setShowConsentDialog(false);
  };


  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="h-64 bg-muted rounded-2xl animate-pulse mb-4" />
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}
      </div>
    </div>
  );

  if (!venue) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Venue not found.</p>
      <Link to="/explore" className="text-primary mt-2 inline-block">← Back to Explore</Link>
    </div>
  );

  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const photos = venue.photo_urls?.filter(Boolean) || [];

  // Resolve per-day schedule & deals — fall back to global fields
  // No happy hour today → show the next upcoming happy-hour day instead of hiding deals.
  const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const nextHHDay = WEEK.map((_, i) => WEEK[(new Date().getDay() + i) % 7]).find(d => venue.days?.includes(d)) || null;
  const activeDay = selectedDay || nextHHDay;
  const daySchedule = activeDay && venue.day_schedules?.[activeDay];
  const displayStart = daySchedule?.start || venue.happy_hour_start;
  const displayEnd = daySchedule?.end || venue.happy_hour_end;
  const dayDeals = activeDay && venue.deals_by_day?.[activeDay];
  // Only show deals if the active day actually has happy hour
  // If per-day deals exist, use them; otherwise fall back to global deals ONLY if the day has HH
  const activeDayHasHH = activeDay && venue.days?.includes(activeDay);
  const rawDeals = activeDayHasHH
    ? (dayDeals?.length > 0 ? dayDeals : (venue.deals || []))
    : [];
  // Enforce the VENUE's tier entitlement: a free venue may only publish a
  // limited number of deals per day (free = 1), regardless of how many are stored.
  const venueDealLimit = maxSpecialsPerDay(venue.subscription_tier);
  const displayDeals = venueDealLimit === Infinity ? rawDeals : rawDeals.slice(0, venueDealLimit);
  // Deal indices the venue flagged premium-exclusive for the active day.
  const premiumDealIdx = new Set(
    (activeDay && Array.isArray(venue.premium_deals_by_day?.[activeDay]))
      ? venue.premium_deals_by_day[activeDay]
      : []
  );
  const hasPremiumOnlyDeals = displayDeals.some((_, i) => premiumDealIdx.has(i));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Photo gallery */}
      <div className="relative h-64 sm:h-80 bg-muted overflow-hidden">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[activePhoto]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60 pointer-events-none"
            />
            <img
              src={photos[activePhoto]}
              alt={venue.name}
              className="relative w-full h-full object-contain select-none"
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null || photos.length < 2) return;
                const diff = touchStartX.current - e.changedTouches[0].clientX;
                if (diff > 50) setActivePhoto(p => (p + 1) % photos.length);
                else if (diff < -50) setActivePhoto(p => (p - 1 + photos.length) % photos.length);
                touchStartX.current = null;
              }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhoto(p => (p - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActivePhoto(p => (p + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {activePhoto + 1} / {photos.length}
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setActivePhoto(i)}
                      className={cn('w-2 h-2 rounded-full transition-colors', i === activePhoto ? 'bg-white' : 'bg-white/50')}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-6xl">🌸</span>
          </div>
        )}
        {/* Back button */}
        <Link to="/explore" className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        {/* Share */}
        <button
          onClick={async () => {
            const text = `🌸 Happy Hour at ${venue.name}! ${venue.happy_hour_start}–${venue.happy_hour_end} · ${venue.days?.join(', ')}${venue.deals?.length ? '\n' + venue.deals.slice(0, 2).join(' · ') : ''}`;
            const url = window.location.href;
            if (navigator.share) {
              try {
                await navigator.share({ title: venue.name, text, url });
              } catch (_) {
                // user cancelled or share failed — fall through to clipboard
                await navigator.clipboard.writeText(`${text}\n${url}`);
                alert('Link copied to clipboard!');
              }
            } else {
              await navigator.clipboard.writeText(`${text}\n${url}`);
              alert('Link copied to clipboard!');
            }
          }}
          className="absolute top-4 right-16 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          <Share2 className="w-5 h-5 text-muted-foreground" />
        </button>
        {/* Favorite */}
        <button
          onClick={toggleFavorite}
          className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
        >
          <Heart className={cn('w-5 h-5 transition-colors', isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
        </button>
        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex gap-1">
          {venue.subscription_tier === 'platinum' && (
            <Badge className="bg-slate-700 text-white flex items-center gap-1"><Crown className="w-3 h-3" />Platinum</Badge>
          )}
          {venue.subscription_tier === 'premium' && (
            <Badge className="bg-amber-500 text-white flex items-center gap-1"><Crown className="w-3 h-3" />Premium</Badge>
          )}
          {venue.is_featured && <Badge className="bg-primary text-white">Featured</Badge>}
          {venue.is_new && <Badge className="bg-green-500 text-white">New</Badge>}
          {venue.is_fan_favorite && <Badge className="bg-purple-500 text-white">Fan Fave</Badge>}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Check in */}
        <CheckInButton venue={venue} />

        {/* In-venue offer trigger — shown only when the venue has an active beacon with a linked coupon */}
        {activeBeacon && (
          <div>
            <Button
              onClick={handleTriggerOffer}
              disabled={triggering}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6 rounded-2xl shadow-lg"
            >
              {triggering ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Unlocking offer…</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Trigger In-Venue Offer</>
              )}
            </Button>
            {triggerError && <p className="text-destructive text-xs mt-2 text-center">{triggerError}</p>}
          </div>
        )}

        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-heading font-bold">{venue.name}</h1>
              <TierBadge tier={venue.subscription_tier} />
            </div>
            {venue.rating > 0 && (
              <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-sm">{venue.rating?.toFixed(1)}</span>
                {venue.review_count > 0 && <span className="text-xs text-muted-foreground">({venue.review_count})</span>}
              </div>
            )}
          </div>
          {!isFoodTruck(venue) && <div className="flex items-center gap-1 text-muted-foreground mt-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                [venue.address, venue.city, venue.state_code, venue.zip_code].filter(Boolean).join(', ') || `${venue.lat},${venue.lng}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { trackEvent('directions_clicked', { venue_id: venue.id }); creditEvent('directions', { venue_id: venue.id }); }}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {[venue.address, [venue.city, venue.state_code].filter(Boolean).join(', '), venue.zip_code]
                  .filter(Boolean).join(' · ')}
              </span>
            </a>
            <VenueDistance venue={venue} className="ml-1" />
          </div>}
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {venue.phone && (
              <a href={`tel:${venue.phone}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Phone className="w-3.5 h-3.5" />
                {venue.phone}
              </a>
            )}
            {venue.website && (
              <a href={safeUrl(venue.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Globe className="w-3.5 h-3.5" />
                {venue.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
          </div>
          {/* Social Media Links — premium & platinum venues only */}
          {(venue.subscription_tier === 'premium' || venue.subscription_tier === 'platinum') &&
            (venue.facebook_url || venue.instagram_url || venue.tiktok_url || venue.threads_url || venue.youtube_url || venue.x_url) && (
            <div className="flex items-center gap-3 mt-2">
              {venue.facebook_url && (
                <a href={safeUrl(venue.facebook_url)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#1877F2] transition-colors" title="Facebook">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {venue.instagram_url && (
                <a href={safeUrl(venue.instagram_url)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#E1306C] transition-colors" title="Instagram">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {venue.tiktok_url && (
                <a href={safeUrl(venue.tiktok_url)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="TikTok">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
                  </svg>
                </a>
              )}
              {venue.threads_url && (
                <a href={safeUrl(venue.threads_url)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Threads">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.366-.89h-.046c-.79 0-1.926.272-2.606 1.603l-1.748-.991c.853-1.668 2.417-2.645 4.354-2.645h.058c3.27.022 5.166 2.053 5.053 5.404.023.126.044.254.062.382 1.083.457 1.96 1.183 2.584 2.618.823 1.888.813 4.692-1.332 6.785-1.883 1.842-4.195 2.676-7.47 2.699z"/>
                  </svg>
                </a>
              )}
              {venue.youtube_url && (
                <a href={safeUrl(venue.youtube_url)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#FF0000] transition-colors" title="YouTube">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {venue.x_url && (
                <a href={safeUrl(venue.x_url)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="X (Twitter)">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {venue.category && (
              <Badge variant="secondary">{venue.category}</Badge>
            )}
            {venue.price_level && (
              <Badge variant="outline" className="font-bold text-green-700 border-green-300 bg-green-50">
                {'$'.repeat(venue.price_level)}
              </Badge>
            )}
            {venue.verification_status === 'verified' && (
              <Badge className="bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            )}
            {venue.verification_status === 'pending_approval' && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Claim Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Truck stops — a mobile venue's location changes by the day */}
        {isFoodTruck(venue) && <TruckScheduleCard venue={venue} />}

        {/* Happy Hour Times */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3 text-primary">
            <Clock className="w-4 h-4" /> Happy Hour
          </h2>
          <p className="text-xl font-bold">{displayStart} – {displayEnd}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {DAY_ORDER.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer',
                  selectedDay === day
                    ? 'bg-primary text-white ring-2 ring-primary/50'
                    : venue.days?.includes(day)
                      ? day === today
                        ? 'bg-primary text-white'
                        : 'bg-primary/20 text-primary hover:bg-primary/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                )}
              >
                {day}
              </button>
            ))}
          </div>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-primary mt-2 hover:underline"
            >
              Clear filter
            </button>
          )}

          {/* Add to Calendar */}
          {(() => {
            const calDay = activeDay || venue.days?.find(d => DAY_ORDER.includes(d));
            if (!calDay || !displayStart) return null;
            const eventOpts = {
              venueName: venue.name,
              day: calDay,
              start: displayStart,
              end: displayEnd,
              deals: displayDeals,
              address: venue.address,
              recurringDays: venue.days || [],
            };
            const googleUrl = buildGoogleCalendarUrl(eventOpts);
            const outlookUrl = buildOutlookCalendarUrl(eventOpts);
            const office365Url = buildOutlookCalendarUrl({ ...eventOpts, office365: true });
            const icsUrl = buildIcsDataUrl(eventOpts);
            if (!googleUrl && !icsUrl) return null;
            const icsFileName = `happy-hour-${venue.name?.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 border-primary/40 text-primary hover:bg-primary/10">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Add {calDay}'s Happy Hour to Calendar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[--radix-dropdown-menu-trigger-width]">
                  {googleUrl && (
                    <DropdownMenuItem asChild>
                      <a href={googleUrl} target="_blank" rel="noopener noreferrer">Google Calendar</a>
                    </DropdownMenuItem>
                  )}
                  {icsUrl && (
                    <DropdownMenuItem asChild>
                      <a href={icsUrl} download={icsFileName}>Apple / iOS Calendar</a>
                    </DropdownMenuItem>
                  )}
                  {outlookUrl && (
                    <DropdownMenuItem asChild>
                      <a href={outlookUrl} target="_blank" rel="noopener noreferrer">Outlook.com</a>
                    </DropdownMenuItem>
                  )}
                  {office365Url && (
                    <DropdownMenuItem asChild>
                      <a href={office365Url} target="_blank" rel="noopener noreferrer">Microsoft 365</a>
                    </DropdownMenuItem>
                  )}
                  {icsUrl && (
                    <DropdownMenuItem asChild>
                      <a href={icsUrl} download={icsFileName}>Download .ics (other apps)</a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>

        {/* Reservations — shown when venue accepts or requires reservations */}
        {(venue.reservation_policy === 'accepted' || venue.reservation_policy === 'required') && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-1">
              <CalendarCheck className="w-4 h-4 text-primary" /> Reservations
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {venue.reservation_policy === 'required'
                ? 'Reservations required — walk-ins are not accepted.'
                : 'Reservations accepted. Walk-ins are welcome too.'}
            </p>
            {reservationLinks.length > 0 ? (
              <div className="space-y-2">
                {reservationLinks.map(l => (
                  <a key={l.id} href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full justify-between border-primary/40 text-primary hover:bg-primary/10">
                      <span className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Book on {l.platform_name}</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                ))}
              </div>
            ) : venue.reservation_policy === 'required' ? (
              <p className="text-sm text-muted-foreground italic">Contact the venue directly to reserve.</p>
            ) : null}
          </div>
        )}

        {/* Deals — premium gated */}
        {activeDay && (
          <div id="specials" className="scroll-mt-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 shadow-lg">
            <h2 className="font-extrabold text-lg flex items-center gap-2 mb-3 text-white">
              <Tag className="w-5 h-5" /> 🍹 {activeDay === today ? "Today's Deals" : `${{ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[activeDay]}'s Deals`}
              {displayDeals.length > 0 && !isPremium && <Badge className="bg-white text-amber-600 text-xs ml-auto flex items-center gap-1"><Crown className="w-3 h-3" />Premium</Badge>}
            </h2>
            {displayDeals.length === 0 ? (
              <p className="text-sm text-white/80 italic">
                No deals listed for {activeDay === today ? 'today' : { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[activeDay]}.
              </p>
            ) : isPremium ? (
              <ul className="space-y-2" onMouseEnter={() => {
                if (!dealViewLogged && venue) {
                  setDealViewLogged(true);
                  logActivity('deal_viewed', venue, `Viewed deals at: ${venue.name}${activeDay ? ` (${activeDay})` : ''}`);
                }
              }}>
                {displayDeals.map((deal, i) => (
                  <li key={i} className="flex flex-col gap-2 bg-white rounded-xl px-3 py-2.5 text-sm font-bold text-orange-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🍹</span>
                      <span className="flex-1">{deal}</span>
                      {premiumDealIdx.has(i) && (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] flex items-center gap-0.5 flex-shrink-0">
                          <Crown className="w-2.5 h-2.5" /> Premium
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="relative">
                {/* Free consumers: premium-flagged deals are locked; the rest follow the
                    existing free-tier rule (first deal clear, extras blurred). */}
                <ul className="space-y-2">
                  {displayDeals.map((deal, i) => {
                    const isPremiumOnly = premiumDealIdx.has(i);
                    // Non-premium deals: first one clear, extras blurred (existing behavior).
                    const nonPremiumBefore = displayDeals.slice(0, i).filter((_, j) => !premiumDealIdx.has(j)).length;
                    const blurExtra = !isPremiumOnly && nonPremiumBefore >= 1;
                    if (isPremiumOnly) {
                      return (
                        <li key={i} className="flex items-center gap-3 bg-white/90 rounded-xl px-3 py-2.5 text-sm font-bold text-orange-700 shadow-sm select-none">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span className="blur-sm opacity-60 flex-1">{deal}</span>
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] flex items-center gap-0.5 flex-shrink-0">
                            <Crown className="w-2.5 h-2.5" /> Premium
                          </Badge>
                        </li>
                      );
                    }
                    return (
                      <li key={i} className={cn(
                        'flex flex-col gap-2 bg-white rounded-xl px-3 py-2.5 text-sm font-bold text-orange-700 shadow-sm',
                        blurExtra && 'blur-sm opacity-50 select-none pointer-events-none'
                      )}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🍹</span>
                          <span>{deal}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {(hasPremiumOnlyDeals || displayDeals.length > 1) && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900">
                      {hasPremiumOnlyDeals ? 'Members-only deals here' : `Unlock all ${displayDeals.length} deals`}
                    </p>
                    <p className="text-xs text-amber-700">
                      {hasPremiumOnlyDeals
                        ? 'This venue reserved some specials for Premium members'
                        : 'Upgrade to Premium to see the full list'}
                    </p>
                  </div>
                  <Button size="sm" className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate('/plans/consumer')}>
                    <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
                  </Button>
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Share this venue */}
        <ShareVenueButtons venue={venue} deals={displayDeals} />

        {/* Description */}
        {venue.description && (
          <div>
            <h2 className="font-semibold mb-1">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{venue.description}</p>
          </div>
        )}

        {/* Tags */}
        {venue.tags?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {venue.tags.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Amenities</h2>
            <AmenityBadges slugs={amenities.map(a => a.amenity_slug)} />
          </div>
        )}

        {/* Listings — premium gated */}
        {listings.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              Special Listings ({listings.length})
              {!isPremium && <Badge className="bg-amber-500 text-white text-xs flex items-center gap-1"><Crown className="w-3 h-3" />Premium</Badge>}
            </h2>
            {isPremium ? (
              <div className="space-y-3">
                {listings.map(l => (
                  <div key={l.id} className="p-3 bg-card border border-border rounded-xl">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">{l.name}</p>
                      {l.is_premium_exclusive && <Badge className="bg-primary text-white text-xs">Premium</Badge>}
                    </div>
                    {l.start_time && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {l.start_time} – {l.end_time} · {l.days?.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">{listings.length} exclusive listing{listings.length > 1 ? 's' : ''} available</p>
                  <p className="text-xs text-amber-700">Upgrade to Premium to view all specials</p>
                </div>
                <Button size="sm" className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate('/plans/consumer')}>
                  <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Events */}
        {events.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Upcoming Events ({events.length})
            </h2>
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="p-3 bg-card border border-border rounded-xl flex gap-3">
                  {/* Date badge */}
                  {ev.event_date ? (
                    <div className="flex-shrink-0 w-12 text-center bg-primary/10 rounded-lg py-1.5">
                      <p className="text-xs text-primary font-semibold uppercase leading-none">
                        {format(parseISO(ev.event_date), 'MMM')}
                      </p>
                      <p className="text-lg font-bold text-primary leading-tight">
                        {format(parseISO(ev.event_date), 'd')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-12 text-center bg-muted rounded-lg py-1.5 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{ev.title}</p>
                    {(ev.start_time || ev.end_time) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                      </p>
                    )}
                    {ev.recurrence_days?.length > 0 && (
                      <p className="text-xs text-primary mt-0.5 font-medium">
                        Repeats: {ev.recurrence_days.join(', ')}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                    )}
                    {ev.event_type && (
                      <Badge variant="outline" className="text-xs mt-1">{ev.event_type}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal note — premium consumers only */}
        <VenueNoteCard venueId={venue.id} venueName={venue.name} />

        {/* Reviews */}
        <VenueReviews venueId={id} />

        <VenueFavoriteConsentDialog
          open={showConsentDialog}
          venueName={venue?.name}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />

        <UpgradePrompt
          open={showFavoriteUpgrade}
          onClose={() => setShowFavoriteUpgrade(false)}
          feature="Unlimited Saved Favorites"
          requiredTier="premium"
        />

        {/* Claim / Challenge section */}
        {currentUser?.role !== 'admin' && currentUser?.id !== venue.owner_id && (
          venue.owner_id ? (
            /* Venue is already claimed — offer a challenge */
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-900">Think this claim is incorrect?</p>
                <p className="text-xs text-orange-700 mt-0.5">If you are the rightful owner, you can submit an ownership challenge for admin review.</p>
              </div>
              <Button size="sm" variant="outline"
                className="flex-shrink-0 border-orange-400 text-orange-600 hover:bg-orange-100"
                onClick={() => navigate(`/claim-venue?venue_id=${venue.id}`)}>
                Challenge
              </Button>
            </div>
          ) : venue.verification_status === 'pending_approval' ? (
            /* Unclaimed but a claim is in review */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Claim Under Review</p>
                <p className="text-xs text-amber-700 mt-0.5">A claim for this venue is pending admin approval.</p>
              </div>
            </div>
          ) : venue.verification_status !== 'verified' ? (
            /* Unclaimed — offer to claim */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Is this your venue?</p>
                <p className="text-xs text-amber-700 mt-0.5">Claim it to manage your listing, update hours & deals, and connect with your fans.</p>
              </div>
              <Button size="sm" className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => navigate(`/claim-venue?venue_id=${venue.id}`)}>
                Claim
              </Button>
            </div>
          ) : null
        )}

        {/* Map link */}
        {!isFoodTruck(venue) && venue.lat && venue.lng && (
          <a
            href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
            onClick={() => { trackEvent('directions_clicked', { venue_id: venue.id }); creditEvent('directions', { venue_id: venue.id }); }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full">
              <MapPin className="w-4 h-4 mr-2" /> Open in Maps
            </Button>
          </a>
        )}

        {/* Report an issue — available to any consumer */}
        <button
          onClick={() => setShowReportIssue(true)}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 text-base font-semibold text-foreground hover:border-orange-300 hover:bg-orange-50 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Flag className="w-5 h-5 text-orange-600 fill-orange-600" />
          </span>
          Report an issue with this listing
        </button>

        <ReportListingIssueDialog
          open={showReportIssue}
          onClose={() => setShowReportIssue(false)}
          venue={venue}
        />
      </div>
    </div>
  );
}