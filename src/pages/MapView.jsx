import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { thumbOf } from '@/lib/imageUpload';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Star, Clock, LocateFixed, Search, ChevronUp, ChevronDown, X, Filter, Phone, Globe, Crown, Lock } from 'lucide-react';
import TierBadge from '@/components/TierBadge';
import TruckStopBadge from '@/components/venue/TruckStopBadge';
import useResolvedVenues from '@/hooks/useResolvedVenues';
import TruckTimeSelector from '@/components/map/TruckTimeSelector';
import { stopPhase } from '@/lib/truckStops';
import { useSubscription } from '@/lib/SubscriptionContext';
import UpgradePrompt from '@/components/UpgradePrompt';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { trackEvent } from '@/lib/analytics';
import safeUrl from '@/lib/safeUrl';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const milesToMeters = (mi) => mi * 1609.344;

function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isHappyHourNow(venue) {
  if (!venue.happy_hour_start || !venue.happy_hour_end || !venue.days) return false;
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  if (!venue.days.includes(day)) return false;
  const [sh, sm] = venue.happy_hour_start.split(':').map(Number);
  const [eh, em] = venue.happy_hour_end.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
}

const PLATINUM_PIN_URL = 'https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/6f0d3fbef_3.png';
const PREMIUM_PIN_URL = 'https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/759a6668e_MakeImageBackgroundTransparent1.png';
const FREE_PIN_URL = 'https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/005fe432b_2.png';

// Food truck pin: solid green ring = owner checked in & serving; dashed amber = scheduled only.
function makeTruckIcon(serving, isSelected) {
  const size = isSelected ? 40 : 32;
  const ring = serving ? 'border:3px solid #16a34a' : 'border:3px dashed #f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:white;${ring};display:flex;align-items:center;justify-content:center;font-size:${size / 2}px;box-shadow:0 2px 4px rgba(0,0,0,0.35)">🚚</div>`,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
  });
}

function makeImageIcon(url, isSelected) {
  const size = isSelected ? 44 : 36;
  return L.divIcon({
    className: '',
    html: `<img src="${url}" style="width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));${isSelected ? 'transform:scale(1.1);' : ''}" />`,
    iconAnchor: [size / 2, size],
    iconSize: [size, size],
  });
}

function makeMarkerIcon(isActive, isSelected, isPremium) {
  const bg = isPremium ? '#f59e0b' : isActive ? '#f97316' : '#6b7280';
  const border = isSelected ? '#1e293b' : isPremium ? '#fde68a' : 'white';
  const size = isPremium ? (isSelected ? 24 : 20) : (isSelected ? 20 : 16);
  const borderW = isSelected ? 4 : 3;
  const crown = isPremium ? `<span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:10px;line-height:1;">👑</span>` : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;background:${bg};border:${borderW}px solid ${border};border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);transition:all 0.15s;${isSelected ? 'transform:scale(1.2)' : ''}${isPremium ? ';box-shadow:0 0 0 3px rgba(245,158,11,0.3),0 2px 8px rgba(0,0,0,0.35)' : ''}">${crown}</div>`,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size + (isPremium ? 20 : 0), size + (isPremium ? 16 : 0)],
  });
}

function FlyToLocation({ center, zoom }) {
  const map = useMap();
  // Only re-center when the center itself changes (e.g. user location resolves).
  // The radius slider drives zoom directly, so we must NOT re-fire on zoom changes
  // or the two fly effects fight and a larger radius appears to zoom in.
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);
  return null;
}

function FlyToVenue({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 0.8 });
  }, [position]);
  return null;
}

function MapEvents({ onMoveEnd }) {
  const prevRef = useRef(null);
  useMapEvents({
    moveend: (e) => {
      const b = e.target.getBounds();
      const key = `${b.getNorth().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getWest().toFixed(4)}`;
      if (prevRef.current !== key) {
        prevRef.current = key;
        onMoveEnd(b);
      }
    },
  });
  return null;
}

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];
const FALLBACK_CENTER = [34.8526, -82.3999]; // Greenville, SC

function radiusToZoom(miles) {
  if (miles <= 0.5) return 16;
  if (miles <= 1) return 15;
  if (miles <= 2) return 14;
  if (miles <= 5) return 13;
  if (miles <= 10) return 12;
  return 11;
}

export default function MapView() {
  useEffect(() => { trackEvent('map_viewed'); }, []);
  const { isPremium } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [rawVenues, setRawVenues] = useState([]);
  const [truckMode, setTruckMode] = useState('now');
  const [truckDate, setTruckDate] = useState('');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locError, setLocError] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [mapBounds, setMapBounds] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    base44.entities.Venue.filter({ status: 'active' }, '-rating', 5000)
      .then((v) => setRawVenues(v.filter(x => x.status === 'active')))
      .finally(() => setLoading(false));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setLocError(true)
      );
    } else {
      setLocError(true);
    }
  }, []);

  // A food truck's pin comes from today's CONFIRMED stop, so a truck that parks
  // somewhere new each day moves with its schedule. No confirmed stop today =>
  // no pin at all (venueMapPoint returns null and the truck drops out here).
  // Trucks resolve to the stop for the chosen time; no applicable stop = no pin.
  // Trucks sharing a spot get a small display offset so each stays selectable
  // (distances and directions always use the stop's real coordinates).
  const resolved = useResolvedVenues(rawVenues, truckMode, { date: truckDate });
  const venues = useMemo(() => {
    const seen = {};
    return resolved
      .filter(v => {
        if (!Number.isFinite(v?.lat) || !Number.isFinite(v?.lng)) return false;
        if (!v._truck) return true;
        if (!v._stop) return false;
        return !(truckMode === 'now' && confirmedOnly && stopPhase(v._stop) !== 'serving');
      })
      .map(v => {
        if (!v._truck) return v;
        const key = `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`;
        const n = seen[key] = (seen[key] || 0) + 1;
        if (n === 1) return v;
        const angle = n * 1.2;
        return { ...v, _pin: [v.lat + 0.00012 * Math.cos(angle), v.lng + 0.00015 * Math.sin(angle)] };
      });
  }, [resolved, truckMode, confirmedOnly]);

  const handleMapMoveEnd = useCallback((bounds) => setMapBounds(bounds), []);

  const center = userLocation || FALLBACK_CENTER;
  const zoom = radiusToZoom(radiusMiles);

  const categories = useMemo(() => ['All', ...new Set(venues.map(v => v.category).filter(Boolean))].sort(), [venues]);

  const visibleVenues = useMemo(() => {
    return venues.filter(v => {
      // Location filter: a venue qualifies if it's within the radius of the user's
      // location OR currently visible in the map viewport. This lets the radius
      // govern the initial view while still revealing venues as the user pans the
      // map around to explore other areas (instead of them disappearing).
      const withinRadius = userLocation
        ? distanceMiles(userLocation[0], userLocation[1], v.lat, v.lng) <= radiusMiles
        : false;
      const withinBounds = mapBounds ? mapBounds.contains([v.lat, v.lng]) : false;
      if (userLocation || mapBounds) {
        if (!withinRadius && !withinBounds) return false;
      }
      if (v._truck && !selectedCategory) return false; // trucks only when their category is picked
      if (selectedCategory && selectedCategory !== 'All' && v.category !== selectedCategory) return false;
      if (activeOnly && !isHappyHourNow(v)) return false;
      if (premiumOnly && !v.is_featured) return false;
      if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.neighborhood?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [venues, mapBounds, userLocation, radiusMiles, selectedCategory, activeOnly, premiumOnly, search]);

  const activeNowCount = useMemo(() => visibleVenues.filter(isHappyHourNow).length, [visibleVenues]);

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    setFlyTarget([venue.lat, venue.lng]);
    setSheetExpanded(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative overflow-hidden">
      {/* Top bar */}
      <div className="z-20 px-3 pt-3 pb-2 bg-white/95 backdrop-blur border-b flex flex-col gap-2">
        {/* Search row */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search venues or neighborhoods…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 h-9 rounded-full border border-border text-sm bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-semibold transition-colors ${
              showFilters || selectedCategory || activeOnly || premiumOnly ? 'bg-primary text-white border-primary' : 'bg-background border-border'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        {/* Radius slider — always visible */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0">Radius</span>
          <input
            type="range"
            min={1}
            max={25}
            step={1}
            value={radiusMiles}
            onChange={(e) => {
              const next = Number(e.target.value);
              setRadiusMiles(next);
              setMapBounds(null);
              // Re-center AND re-zoom the map to fit the new radius. A bigger radius
              // must zoom OUT — drive the map directly so it doesn't fight the venue fly.
              if (userLocation && mapRef.current) {
                mapRef.current.flyTo(userLocation, radiusToZoom(next), { duration: 0.6 });
              }
            }}
            className="flex-1 accent-primary h-1.5 cursor-pointer"
          />
          <span className="text-xs font-semibold text-foreground w-12 text-right flex-shrink-0">{radiusMiles} mi</span>
        </div>

        <TruckTimeSelector
          mode={truckMode}
          date={truckDate}
          onChange={(m, d) => { setTruckMode(m); setTruckDate(d); }}
          confirmedOnly={confirmedOnly}
          onConfirmedOnly={setConfirmedOnly}
        />

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <LocateFixed className="w-3.5 h-3.5 text-primary" />
            {userLocation ? `Within ${radiusMiles} mi` : locError ? 'Map view' : 'Locating…'}
            {' · '}<span className="font-semibold text-foreground">{visibleVenues.length} venue{visibleVenues.length !== 1 ? 's' : ''}</span>
          </span>
          {activeNowCount > 0 && (
            <span className="bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              🍹 {activeNowCount} active now
            </span>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="space-y-2 pt-1">
            {/* Category */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'All' ? '' : (selectedCategory === cat ? '' : cat))}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    (cat === 'All' && !selectedCategory) || selectedCategory === cat
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background border-border hover:border-foreground/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Toggles row */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  // "Near me now" discovery is a Premium feature
                  if (!isPremium) { setShowUpgrade(true); return; }
                  setActiveOnly(!activeOnly);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-background border-border'
                }`}
              >
                {!isPremium && <Lock className="w-3 h-3" />}
                <span>🍹</span> Happy Hour Active Now
                {!isPremium && <Crown className="w-3 h-3 text-amber-500" />}
              </button>
              <button
                onClick={() => setPremiumOnly(!premiumOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  premiumOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-background border-border'
                }`}
              >
                <span>👑</span> Premium Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      {loading ? (
        <div className="flex-1 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <MapContainer center={center} zoom={zoom} className="flex-1 z-10" ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <FlyToLocation center={center} zoom={zoom} />
          {flyTarget && <FlyToVenue position={flyTarget} key={flyTarget.toString()} />}
          <MapEvents onMoveEnd={handleMapMoveEnd} />

          {/* Radius circle */}
          {userLocation && (
            <Circle
              center={userLocation}
              radius={milesToMeters(radiusMiles)}
              pathOptions={{ color: '#f59e0b', fillColor: '#fde68a', fillOpacity: 0.1, weight: 2, dashArray: '6 4' }}
            />
          )}

          {/* User dot */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: '',
                html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>',
                iconAnchor: [8, 8],
              })}
            />
          )}

          {visibleVenues.map(venue => {
            const active = isHappyHourNow(venue);
            const isSelected = selectedVenue?.id === venue.id;
            const isPremium = ['premium', 'platinum'].includes(venue.subscription_tier);
            const isPlatinum = venue.subscription_tier === 'platinum';
            const isPremiumTier = venue.subscription_tier === 'premium';
            return (
              <Marker
                key={venue.id}
                position={venue._pin || [venue.lat, venue.lng]}
                icon={venue._truck ? makeTruckIcon(stopPhase(venue._stop) === 'serving', isSelected) : isPlatinum ? makeImageIcon(PLATINUM_PIN_URL, isSelected) : isPremiumTier ? makeImageIcon(PREMIUM_PIN_URL, isSelected) : makeImageIcon(FREE_PIN_URL, isSelected)}
                eventHandlers={{ click: () => setSelectedVenue(venue) }}
              >
                <Popup autoPan={false} maxWidth={230} className="map-popup">
                  <div className="min-w-[200px] font-body">
                    {venue.photo_urls?.[0] && !failedImages.has(venue.id) ? (
                      <img
                        src={thumbOf(venue, venue.photo_urls[0])}
                        alt={venue.name}
                        className="w-full h-28 object-cover rounded-lg mb-2"
                        onError={() => setFailedImages(prev => new Set([...prev, venue.id]))}
                      />
                    ) : (
                      <div className="w-full h-20 rounded-lg mb-2 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl">
                        🌸
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-1 mb-1">
                     <p className="font-bold text-sm leading-tight">{venue.name}</p>
                     <div className="flex gap-1 flex-shrink-0 items-center">
                       <TierBadge tier={venue.subscription_tier} />
                       {active && <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">LIVE</span>}
                     </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                     {venue.category && <p className="text-xs text-muted-foreground">{venue.category}</p>}
                     {venue._stop && <TruckStopBadge venue={venue} />}
                     {userLocation && (
                       <p className="text-xs text-muted-foreground">
                         {distanceMiles(userLocation[0], userLocation[1], venue.lat, venue.lng).toFixed(1)} mi away
                       </p>
                     )}
                     {venue.happy_hour_start && (
                       <p className={`text-xs flex items-center gap-1 font-medium ${active ? 'text-amber-600' : 'text-muted-foreground'}`}>
                         <Clock className="w-3 h-3" />
                         {venue.happy_hour_start} – {venue.happy_hour_end}
                       </p>
                     )}
                     {venue.rating > 0 && (
                       <p className="text-xs flex items-center gap-1">
                         <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                         {venue.rating?.toFixed(1)}
                         {venue.review_count > 0 && <span className="text-muted-foreground">({venue.review_count})</span>}
                       </p>
                     )}
                     {venue.deals?.length > 0 && (
                       <p className="text-xs text-emerald-600 font-medium truncate">🎉 {venue.deals[0]}</p>
                     )}
                     {venue.phone && (
                       <a href={`tel:${venue.phone}`} className="text-xs flex items-center gap-1 text-primary hover:underline">
                         <Phone className="w-3 h-3" />{venue.phone}
                       </a>
                     )}
                     {venue.website && (
                       <a href={safeUrl(venue.website)} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline truncate">
                         <Globe className="w-3 h-3" />{venue.website.replace(/^https?:\/\/(www\.)?/, '')}
                       </a>
                     )}
                    </div>
                    <Link
                      to={`/venue/${venue.id}`}
                      className="block mt-2 text-center text-xs bg-primary text-white rounded-md py-1.5 font-semibold hover:bg-primary/90 transition-colors"
                    >
                      View Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}

      {/* Bottom venue sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl border-t border-border transition-all duration-300 ${
          sheetExpanded ? 'h-[55%]' : 'h-[72px]'
        }`}
      >
        {/* Handle / header */}
        <button
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded-full bg-border mx-auto" />
            <span className="text-sm font-semibold">{visibleVenues.length} venues in view</span>
            {activeNowCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                {activeNowCount} active
              </span>
            )}
          </div>
          {sheetExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Venue list */}
        {sheetExpanded && (
          <div className="overflow-y-auto h-[calc(100%-56px)] px-4 pb-4 space-y-2">
            {visibleVenues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-6">No venues match your filters in this area.</p>
            ) : (
              visibleVenues.map(venue => {
                const active = isHappyHourNow(venue);
                const isSelected = selectedVenue?.id === venue.id;
                const isPremium = ['premium', 'platinum'].includes(venue.subscription_tier);
                return (
                  <button
                    key={venue.id}
                    onClick={() => handleSelectVenue(venue)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : isPremium
                        ? 'border-amber-400/50 bg-amber-50/40 hover:border-amber-400'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                      {venue.photo_urls?.[0] && !failedImages.has(venue.id) ? (
                        <img
                          src={thumbOf(venue, venue.photo_urls[0])}
                          alt={venue.name}
                          className="w-full h-full object-cover"
                          onError={() => setFailedImages(prev => new Set([...prev, venue.id]))}
                        />
                      ) : (
                        <span className="text-xl">🌸</span>
                      )}
                      {isPremium && (
                        <span className="absolute bottom-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-tl-md">👑</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm truncate">{venue.name}</p>
                        <TierBadge tier={venue.subscription_tier} />
                        {active && <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{venue.category} · {venue.neighborhood?.split('/')[0]?.trim()}</p>
                      {venue.happy_hour_start && (
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${active ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                          <Clock className="w-3 h-3" />
                          {active ? 'Open now' : ''} {venue.happy_hour_start}–{venue.happy_hour_end}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {venue.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-semibold">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {venue.rating?.toFixed(1)}
                        </span>
                      )}
                      {userLocation && (
                        <span className="text-xs text-muted-foreground">
                          {distanceMiles(userLocation[0], userLocation[1], venue.lat, venue.lng).toFixed(1)}mi
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature='"Near Me Now" Discovery'
        requiredTier="premium"
      />
    </div>
  );
}