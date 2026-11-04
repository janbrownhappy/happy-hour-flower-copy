import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation as useLocationPrefs } from '@/lib/LocationContext';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Clock, Newspaper, CalendarDays, List, MapPin, LayoutGrid, LocateFixed, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import VenueCard from '@/components/VenueCard';
import VenueListRow from '@/components/VenueListRow';
import ExploreLocationFilters from '@/components/location/ExploreLocationFilters';
import useTerritoryScope from '@/lib/useTerritoryScope';
import CalendarView from '@/components/CalendarView';
import QuickFilterChips from '@/components/filters/QuickFilterChips';
import FilterPanelV3 from '@/components/filters/FilterPanelV3';
import { ALL_AMENITIES } from '@/lib/amenities';
import useUserCoords, { setUserCoords } from '@/hooks/useUserCoords';
import { DEAL_FILTERS } from '@/lib/filterCatalogs';
import { TIME_BUCKETS, venueTimeBuckets, isHappeningNow, currentDayKey, currentMinutes } from '@/lib/timeBuckets';
import useResolvedVenues from '@/hooks/useResolvedVenues';
import { useFoodTruckTypeIds } from '@/hooks/useTruckStops';
import { format } from 'date-fns';
import { useSubscription } from '@/lib/SubscriptionContext';
import { maxFavorites } from '@/lib/entitlements';
import UpgradePrompt from '@/components/UpgradePrompt';
import PullToRefresh from '@/components/PullToRefresh';
import { loadExploreFilters, saveExploreFilters, clearExploreFilters } from '@/lib/exploreFilterSession';
import { Crown, Lock } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PAGE_SIZE = 20;
const NEAR_RADIUS_MILES = 5; // "near me" radius

// Haversine distance in miles between two lat/lng points
function milesBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseNear(searchStr) {
  const raw = new URLSearchParams(searchStr).get('near');
  if (!raw) return null;
  const [lat, lng] = raw.split(',').map(Number);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

export default function Explore() {
  const { isPremium, tier } = useSubscription();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [rawVenues, setVenues] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const _urlParams = new URLSearchParams(window.location.search);
  // Filters selected earlier in this browser session (restored on re-entry).
  // URL params always win over the restored snapshot.
  const _saved = loadExploreFilters() || {};
  const _restoreSet = (param, savedList) =>
    new Set(_urlParams.get(param) ? _urlParams.get(param).split(',').filter(Boolean) : (savedList || []));
  const [search, setSearch] = useState(_urlParams.get('q') || _saved.search || '');
  const [selectedDay, setSelectedDay] = useState(_saved.selectedDay || '');
  const [selectedCategory, setSelectedCategory] = useState(_saved.selectedCategory || '');

  const { locationPrefs, loaded: locationLoaded } = useLocationPrefs();
  // Cascading area filter: { state_code, market_id, area, city, zip_code }
  const [areaFilter, setAreaFilter] = useState(
    _urlParams.get('area')
      ? { state_code: '', market_id: '', area: _urlParams.get('area'), city: '', zip_code: '' }
      : (_saved.areaFilter || { state_code: '', market_id: '', area: '', city: '', zip_code: '' })
  );
  const [nearCoords, setNearCoords] = useState(parseNear(window.location.search) || _saved.nearCoords || null);
  const [selectedAmenities, setSelectedAmenities] = useState(
    () => _restoreSet('amenities', _saved.selectedAmenities)
  );
  const [venueAmenities, setVenueAmenities] = useState([]);
  // v3 filter model
  const [venueTypes, setVenueTypes] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [happyHourItems, setHappyHourItems] = useState([]);
  const [selectedVenueTypeIds, setSelectedVenueTypeIds] = useState(
    () => _restoreSet('venue_type', _saved.selectedVenueTypeIds)
  );
  const [selectedCuisineIds, setSelectedCuisineIds] = useState(
    () => _restoreSet('cuisine', _saved.selectedCuisineIds)
  );
  const [selectedDeals, setSelectedDeals] = useState(
    () => _restoreSet('deals', _saved.selectedDeals)
  );
  const [selectedTimes, setSelectedTimes] = useState(
    () => _restoreSet('time', _saved.selectedTimes)
  );
  const [happeningNow, setHappeningNow] = useState(!!_saved.happeningNow);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState(
    new URLSearchParams(window.location.search).get('view') === 'calendar' ? 'calendar' : 'list'
  ); // 'list' | 'calendar'
  const [premiumOnly, setPremiumOnly] = useState(!!_saved.premiumOnly);
  // 'cards' | 'compact' — persisted layout for the main results list
  const [layoutMode, setLayoutMode] = useState(() => {
    return localStorage.getItem('exploreLayoutMode') === 'compact' ? 'compact' : 'cards';
  });
  const setLayout = (mode) => { setLayoutMode(mode); localStorage.setItem('exploreLayoutMode', mode); };
  const [selectedPrice, setSelectedPrice] = useState(Number(_urlParams.get('price')) || _saved.selectedPrice || 0); // 0 = any
  const [showAllResults, setShowAllResults] = useState(false);
  // Food trucks resolve to the dated stop for the time in view (now / chosen day / rest of today).
  const truckTypeIds = useFoodTruckTypeIds();
  const venues = useResolvedVenues(
    rawVenues,
    happeningNow ? 'now' : selectedDay ? 'weekday' : 'today',
    { weekday: selectedDay }
  );

  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

  // Re-sync filters from the URL whenever the query string changes. This page stays
  // mounted (KeepAliveTabs), so a NEW voice search navigating to /explore?q=... must
  // update state here — the initial useState only runs on first mount.
  const routerLocation = useRouterLocation();
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const V3_PARAMS = ['venue_type', 'cuisine', 'deals', 'time'];
    if (!params.has('q') && !params.has('area') && !params.has('day') && !params.has('price') && !params.has('near') && !params.has('amenities') && !V3_PARAMS.some(p => params.has(p))) return;
    setSelectedVenueTypeIds(new Set((params.get('venue_type') || '').split(',').filter(Boolean)));
    setSelectedCuisineIds(new Set((params.get('cuisine') || '').split(',').filter(Boolean)));
    setSelectedDeals(new Set((params.get('deals') || '').split(',').filter(Boolean)));
    setSelectedTimes(new Set((params.get('time') || '').split(',').filter(Boolean)));
    setSearch(params.get('q') || '');
    setAreaFilter(prev => ({ ...prev, area: params.get('area') || '' }));
    setNearCoords(parseNear(routerLocation.search));
    setSelectedPrice(Number(params.get('price')) || 0);
    setSelectedAmenities(new Set((params.get('amenities') || '').split(',').filter(Boolean)));
    const urlDay = params.get('day');
    if (urlDay && DAYS.includes(urlDay)) {
      setSelectedDay(urlDay);
    } else if (params.get('q')) {
      // A keyword search shouldn't be narrowed by the day filter — or by "now"
      setSelectedDay('');
      setHappeningNow(false);
    }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.search]);

  // When arriving straight from onboarding, apply the area the user just picked.
  // The LocationContext was loaded before onboarding saved the profile, so its
  // area is stale — the navigation state carries the fresh pick directly.
  useEffect(() => {
    const navArea = routerLocation.state?.area;
    if (navArea) {
      setAreaFilter(prev => ({ ...prev, area: navArea }));
      setSelectedDay(''); // don't hide the picked area behind today's day filter
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.state?.area]);

  // Apply the user's saved territory (area) as the default area filter.
  // Skip when a voice/keyword search is active in the URL — an explicit search
  // must not be narrowed back down by the saved area.
  useEffect(() => {
    if (!locationLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('q') || params.get('area') || params.get('near')) return;
    if (routerLocation.state?.area) return; // onboarding hand-off already set it
    if (locationPrefs.area && !areaFilter.area) {
      setAreaFilter(prev => ({ ...prev, area: locationPrefs.area }));
    }
  }, [locationLoaded, locationPrefs.area]);

  const loadData = useCallback(async () => {
    // Secondary data (filters, amenities, news, events) fills in independently so
    // the venue list can render as soon as venues arrive.
    base44.entities.VenueType.list('sort_order', 200).then(r => setVenueTypes(r.filter(x => x.is_active !== false))).catch(() => {});
    base44.entities.Cuisine.list('sort_order', 200).then(r => setCuisines(r.filter(x => x.is_active !== false))).catch(() => {});
    base44.entities.HappyHourItem.list('-created_date', 10000).then(setHappyHourItems).catch(() => {});
    base44.entities.VenueAmenity.list('-created_date', 10000).then(setVenueAmenities).catch(() => {});
    base44.entities.NewsArticle.list('-updated_at', 20).then(n => setNews(n.filter(a => a.status === 'published').slice(0, 3))).catch(() => {});
    base44.entities.VenueEvent.list('event_date', 500).then(setEvents).catch(() => {});
    base44.auth.me().catch(() => null).then(u => u ? base44.entities.Favorite.list() : []).then(setFavorites).catch(() => {});
    const v = await base44.entities.Venue.filter({ status: 'active' }, '-rating', 5000).catch(() => []);
    // Flatten venue data if needed
    const venuesList = v.map(venue => {
      if (venue.data && typeof venue.data === 'object') {
        return { ...venue.data, id: venue.id };
      }
      return venue;
    }).filter(x => x.status === 'active');
    setVenues(venuesList);
  }, []);

  useEffect(() => {
    // Only honor a day coming from the URL — no filters are applied by default
    const urlDay = _urlParams.get('day');
    if (urlDay && DAYS.includes(urlDay)) {
      setSelectedDay(urlDay);
    }

    loadData().finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(venues.map(v => v.category).filter(Boolean))];
    return cats.sort();
  }, [venues]);

  // Load the area catalog so we can render area names for the venues' area keys.
  const [areaCatalog, setAreaCatalog] = useState([]);
  useEffect(() => {
    base44.entities.LocationArea.list('', 500).then(setAreaCatalog).catch(() => setAreaCatalog([]));
  }, []);
  const territory = useTerritoryScope({ locationPrefs, areas: areaCatalog, venues });
  const areaNameByKey = useMemo(() => {
    const m = {};
    for (const a of areaCatalog) m[a.area_id] = a.area_name;
    return m;
  }, [areaCatalog]);

  // Calculate trending areas based on venue count and featured status
  const trendingAreas = useMemo(() => {
    // Count all venues per area (clicking a trending area clears the day filter,
    // so the chip count must reflect the full area, not just today's venues).
    const stats = venues.reduce((acc, v) => {
      const key = v.area;
      if (!key) return acc;
      if (!acc[key]) acc[key] = { count: 0, featured: 0, fanFavorite: 0 };
      acc[key].count++;
      if (v.is_featured) acc[key].featured++;
      if (v.is_fan_favorite) acc[key].fanFavorite++;
      return acc;
    }, {});

    return Object.entries(stats)
      .map(([key, s]) => ({
        key,
        name: areaNameByKey[key] || key,
        ...s,
        score: s.count + (s.featured * 2) + (s.fanFavorite * 1.5),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [venues, areaNameByKey]);

  // Happy hour items indexed by venue, so the derived deal filters stay O(1) per venue.
  const itemsByVenue = useMemo(() => {
    const m = {};
    for (const item of happyHourItems) {
      const key = String(item.venue_id);
      if (!m[key]) m[key] = [];
      m[key].push(item);
    }
    return m;
  }, [happyHourItems]);


  const userCoords = useUserCoords();
  const filtered = useMemo(() => {
    // Time-of-day filters read the venue's schedule for the day in view (or today).
    const activeDay = selectedDay || today;
    const nowMin = currentMinutes();
    const nowDay = currentDayKey();
    const STOP_WORDS = new Set(['and', 'or', 'the', 'a', 'an', 'with', 'that', 'has', 'have', 'me', 'find', 'place', 'places', 'somewhere', 'near', 'in', 'on', 'at', 'for', 'of', 'to', 'serves', 'serving', 'got', 'bar', 'bars', 'pub', 'pubs', 'spot', 'spots', 'restaurant', 'restaurants']);
    const searchLower = search ? search.toLowerCase().trim() : '';
    const searchTokens = searchLower
      ? searchLower.split(/\s+/).filter(t => t.length > 1 && !STOP_WORDS.has(t))
      : [];

    const matched = venues.filter(v => {
      // Location first: when "near me" was spoken, keep only venues within the radius.
      // This narrows the set dramatically before any keyword/amenity matching runs.
      // Food trucks only appear when the user picks a food-truck venue type.
      // A truck with no confirmed upcoming stop still lists, labelled "No upcoming
      // location posted" — it just carries no coordinates, so no map pin and it
      // drops out of radius / "near me" results.
      if (v._truck && ![...selectedVenueTypeIds].some(id => truckTypeIds.has(id))) return false;

      if (nearCoords) {
        // Trucks carry only their selected stop's coordinates (null when none).
        if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng) || (v.lat === 0 && v.lng === 0)) return false;
        if (milesBetween(nearCoords.lat, nearCoords.lng, v.lat, v.lng) > NEAR_RADIUS_MILES) return false;
      }
      // Search filter - token based across name, category, address, neighborhood,
      // and the venue's amenities. Each meaningful word in the query must match
      // somewhere, so "wine and burgers" finds venues offering both — not just
      // a venue whose name literally contains the phrase.
      if (searchLower) {
        // Whole-phrase name match still wins outright (e.g. searching a venue name)
        // Also compare with spaces/punctuation removed so "momos" finds "Mo Mo's".
        const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchesName = v.name?.toLowerCase().includes(searchLower)
          || (squash(searchLower).length > 2 && squash(v.name).includes(squash(searchLower)));
        if (!matchesName) {
          if (searchTokens.length > 0) {
            const venueAmenLabels = venueAmenities
              .filter(a => String(a.venue_id) === String(v.id))
              .flatMap(a => {
                const found = ALL_AMENITIES.find(x => x.slug === a.amenity_slug);
                // Include both the human label and the raw slug (slugs like "burgers"
                // carry the keyword even when no label is matched)
                return [(found?.label || '').toLowerCase(), String(a.amenity_slug || '').replace(/_/g, ' ').toLowerCase()];
              });
            const haystack = [
              v.name, v.category, v.address, v.city, v.zip_code, v.description,
              ...(v.tags || []), ...venueAmenLabels,
            ].filter(Boolean).join(' ').toLowerCase();
            // Require every SPECIFIC token to match. Generic words like "bar"/"pub"
            // are stripped out as stop-words, so "wine bar" requires "wine" — it
            // won't return every venue that merely contains "bar".
            const allTokensMatch = searchTokens.every(t => haystack.includes(t));
            if (!allTokensMatch) return false;
          } else {
            // Query was only generic/stop-words (e.g. just "bar") — plain substring
            const haystack = [v.name, v.category, v.address, v.city, v.zip_code]
              .filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(searchLower)) return false;
          }
        }
      }
      // Amenity filters are precise (each spoken "and" feature = one slug) and must
      // always be enforced, even alongside a keyword query.
      if (selectedAmenities.size > 0) {
        const venueAmenSlugs = new Set(
          venueAmenities.filter(a => String(a.venue_id) === String(v.id)).map(a => a.amenity_slug)
        );
        for (const slug of selectedAmenities) {
          if (!venueAmenSlugs.has(slug)) return false;
        }
      }

      // Venue type / cuisine come from the v3 catalogs (arrays of Base44 ids).
      if (selectedVenueTypeIds.size > 0) {
        const ids = v.venue_type_ids || [];
        if (!ids.some(id => selectedVenueTypeIds.has(id))) return false;
      }
      if (selectedCuisineIds.size > 0) {
        const ids = v.cuisine_ids || [];
        if (!ids.some(id => selectedCuisineIds.has(id))) return false;
      }
      // Deal filters are DERIVED from the venue's structured happy hour items.
      if (selectedDeals.size > 0) {
        const items = itemsByVenue[String(v.id)] || [];
        for (const dealId of selectedDeals) {
          const def = DEAL_FILTERS.find(d => d.id === dealId);
          if (!def || !items.some(def.match)) return false;
        }
      }
      // Time-of-day is derived from the schedule — a separate axis from the day pills.
      if (selectedTimes.size > 0) {
        const buckets = new Set(venueTimeBuckets(v, activeDay));
        let hit = false;
        for (const t of selectedTimes) if (buckets.has(t)) { hit = true; break; }
        if (!hit) return false;
      }
      if (happeningNow && v._truck) {
        // "Now" for trucks = a stop whose serving window contains this moment.
        if (!v._stop) return false;
      } else if (happeningNow) {
        if (!v.days?.includes(nowDay)) return false;
        if (!isHappeningNow(v, nowDay, nowMin)) return false;
      }

      // A search query takes precedence over area/price/premium — but amenity
      // filters above were already applied.
      if (searchLower) return true;

      if (selectedDay) {
        // A truck's days come from its confirmed stops, not a happy-hour day list.
        // Trucks were already resolved against the selected day's stops.
        if (v._truck) {
          if (!v._stop) return false;
        } else if (!v.days?.includes(selectedDay)) return false;
      }
      if (selectedCategory && v.category !== selectedCategory) return false;
      // Area hierarchy + city/zip facets (any combination)
      if (areaFilter.state_code && v.state_code !== areaFilter.state_code) return false;
      if (areaFilter.market_id && v.market_id !== areaFilter.market_id) return false;
      // No explicit area/market picked: keep results inside the user's home territory.
      if (!areaFilter.market_id && !areaFilter.area && !areaFilter.city && !areaFilter.zip_code && territory.market_id && v.market_id !== territory.market_id) return false;
      if (areaFilter.area && v.area !== areaFilter.area) return false;
      if (areaFilter.city && !(v.city || '').toLowerCase().includes(areaFilter.city.toLowerCase())) return false;
      if (areaFilter.zip_code && String(v.zip_code || '') !== areaFilter.zip_code) return false;
      if (premiumOnly && v.subscription_tier !== 'premium' && v.subscription_tier !== 'platinum') return false;
      if (selectedPrice > 0 && Number(v.price_level) !== selectedPrice) return false;
      return true;
    });
    // Closest first whenever we know where the user is; venues without coordinates go last.
    const origin = nearCoords || userCoords;
    if (origin) {
      const dist = (v) => (Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0))
        ? milesBetween(origin.lat, origin.lng, v.lat, v.lng) : Infinity;
      return [...matched].sort((a, b) => dist(a) - dist(b));
    }
    return matched;
  }, [userCoords, venues, search, selectedDay, selectedCategory, areaFilter, selectedAmenities, premiumOnly, selectedPrice, nearCoords, venueAmenities, selectedVenueTypeIds, selectedCuisineIds, selectedDeals, selectedTimes, happeningNow, itemsByVenue, today, territory]);

  // Keep the session snapshot in sync so returning from a venue page restores
  // exactly what the user had selected.
  useEffect(() => {
    saveExploreFilters({
      search, selectedDay, selectedCategory, areaFilter, nearCoords, premiumOnly, selectedPrice, happeningNow,
      selectedAmenities: [...selectedAmenities],
      selectedVenueTypeIds: [...selectedVenueTypeIds],
      selectedCuisineIds: [...selectedCuisineIds],
      selectedDeals: [...selectedDeals],
      selectedTimes: [...selectedTimes],
    });
  }, [search, selectedDay, selectedCategory, areaFilter, nearCoords, premiumOnly, selectedPrice, happeningNow, selectedAmenities, selectedVenueTypeIds, selectedCuisineIds, selectedDeals, selectedTimes]);

  // Collapse the results list back to 4 whenever the filter criteria change
  useEffect(() => {
    setShowAllResults(false);
  }, [search, selectedDay, selectedCategory, areaFilter, selectedAmenities, premiumOnly, selectedPrice, selectedVenueTypeIds, selectedCuisineIds, selectedDeals, selectedTimes, happeningNow]);

  const visibleResults = showAllResults ? filtered : filtered.slice(0, 4);
  const featured = venues.filter(v => v.is_featured);
  const fanFaves = venues.filter(v => v.is_fan_favorite);
  const newVenues = venues.filter(v => v.is_new);

  const favoriteIds = new Set(favorites.map(f => f.venue_id?.toString()));
  const amenitiesByVenue = {};
  for (const a of venueAmenities) (amenitiesByVenue[String(a.venue_id)] ||= []).push(a.amenity_slug);

  const handleToggleFavorite = async (venue) => {
    const existing = favorites.find(f => f.venue_id?.toString() === venue.id.toString());
    if (existing) {
      await base44.entities.Favorite.delete(existing.id);
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
    } else {
      // Enforce free-tier favorites limit (free = 1 saved venue)
      const limit = maxFavorites(tier);
      if (limit !== Infinity && favorites.length >= limit) {
        setUpgradeFeature('Unlimited Saved Favorites');
        setShowUpgrade(true);
        return;
      }
      const created = await base44.entities.Favorite.create({ venue_id: venue.id });
      setFavorites(prev => [...prev, created]);
    }
  };

  const toggleNearMe = () => {
    // Already active → turn it off
    if (nearCoords) { setNearCoords(null); setPage(1); return; }
    if (!('geolocation' in navigator)) {
      toast({ title: 'Location unavailable', description: 'Your device does not support location services.', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords); // share with distance badges
        setNearCoords(coords);
        setAreaFilter({ state_code: '', market_id: '', area: '', city: '', zip_code: '' }); // mutually exclusive with area filter
        setSelectedDay(''); // show all nearby venues regardless of happy-hour day
        setHappeningNow(false); // ...and regardless of what's open this minute
        setPage(1);
        setLocating(false);
        const nearbyCount = venues.filter(
          v => Number.isFinite(v.lat) && Number.isFinite(v.lng) &&
               milesBetween(coords.lat, coords.lng, v.lat, v.lng) <= NEAR_RADIUS_MILES
        ).length;
        toast({
          title: nearbyCount > 0 ? `${nearbyCount} venue${nearbyCount === 1 ? '' : 's'} within ${NEAR_RADIUS_MILES} mi` : 'No venues within 5 miles',
          description: nearbyCount > 0
            ? 'Showing what’s closest to you now.'
            : 'You may be outside our current coverage area. Try clearing “Near me”.',
        });
      },
      () => {
        toast({ title: 'Location unavailable', description: "We couldn't get your location. Please allow location access and try again.", variant: 'destructive' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleDaySelect = (day) => {
    setSelectedDay(selectedDay === day ? '' : day);
    setPage(1);
  };

  const emptyAreaFilter = { state_code: '', market_id: '', area: '', city: '', zip_code: '' };
  const hasAreaFilter = areaFilter.state_code || areaFilter.market_id || areaFilter.area || areaFilter.city || areaFilter.zip_code;

  const clearFilters = () => {
    setSearch(''); setSelectedDay(''); setSelectedCategory(''); setAreaFilter(emptyAreaFilter); setSelectedAmenities(new Set()); setPremiumOnly(false); setSelectedPrice(0); setNearCoords(null);
    setSelectedVenueTypeIds(new Set()); setSelectedCuisineIds(new Set()); setSelectedDeals(new Set()); setSelectedTimes(new Set()); setHappeningNow(false);
    clearExploreFilters();
    setPage(1);
  };

  useEffect(() => {
    const onReset = () => { clearFilters(); setShowAllResults(false); setViewMode('list'); };
    window.addEventListener('explore:reset', onReset);
    return () => window.removeEventListener('explore:reset', onReset);
  });

  const clearPanelFilters = () => {
    setSelectedVenueTypeIds(new Set()); setSelectedCuisineIds(new Set()); setSelectedDeals(new Set()); setSelectedTimes(new Set()); setSelectedAmenities(new Set());
    setPage(1);
  };

  const panelSelectedCount = selectedVenueTypeIds.size + selectedCuisineIds.size + selectedDeals.size + selectedTimes.size + selectedAmenities.size;

  const hasActiveFilters = search || selectedDay || selectedCategory || hasAreaFilter || selectedAmenities.size > 0 || premiumOnly || selectedPrice > 0 || nearCoords || panelSelectedCount > 0 || happeningNow;

  const venueTypeNameById = useMemo(() => Object.fromEntries(venueTypes.map(t => [t.id, t.name])), [venueTypes]);
  const cuisineNameById = useMemo(() => Object.fromEntries(cuisines.map(c => [c.id, c.name])), [cuisines]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 px-5 pt-4 pb-4 text-white overflow-hidden">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search venues, deals, city or ZIP..."
            className="pl-9 bg-white text-foreground border-0 shadow-lg h-10 rounded-xl"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); setSelectedDay(''); }}
          />
        </div>

        {/* Area + City, then Near me + ZIP. State/Market live in the user's profile. */}
        <div className="mt-2">
          <ExploreLocationFilters
            value={areaFilter}
            onChange={(next) => { setAreaFilter(next); setPage(1); }}
            nearActive={!!nearCoords}
            locating={locating}
            onToggleNear={toggleNearMe}
            venues={venues}
          />
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="px-4 py-4">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-3 hover:underline"
          >
            <List className="w-4 h-4" /> Back to list
          </button>
          <CalendarView venues={venues} events={events} />
        </div>
      )}

      <div className={viewMode === 'calendar' ? 'hidden' : ''}>
       <PullToRefresh onRefresh={loadData}>
        <div className="px-4 py-4 space-y-5">

        {/* Quick filters — one tap, available to every user */}
        <QuickFilterChips
          venueTypes={venueTypes}
          selectedVenueTypeIds={selectedVenueTypeIds}
          onVenueTypesChange={(next) => { setSelectedVenueTypeIds(next); setPage(1); }}
          happeningNow={happeningNow}
          onToggleHappeningNow={() => { setHappeningNow(p => !p); setPage(1); }}
        />

        {/* Day Pills — always visible */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter by Day</p>
            {selectedDay && selectedDay !== today && (
              <button onClick={() => setSelectedDay(today)} className="text-xs text-primary hover:underline">
                Back to Today
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {DAYS.map(day => {
              const isActive = selectedDay === day;
              const isToday = day === today;
              return (
                <button
                  key={day}
                  onClick={() => handleDaySelect(day)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-md'
                      : isToday
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-xs font-bold">{day}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amenity + Premium + price filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              // The full filter panel is a Premium feature
              if (!isPremium) {
                setUpgradeFeature('Advanced Filters');
                setShowUpgrade(true);
                return;
              }
              setShowFiltersPanel(!showFiltersPanel);
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 font-semibold text-xs transition-all shadow-sm ${
              showFiltersPanel
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-card border-primary/40 text-primary hover:bg-primary/5 hover:border-primary'
            }`}
          >
            {!isPremium && <Lock className="w-3.5 h-3.5 flex-shrink-0" />}
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
            {showFiltersPanel ? 'Hide Filters' : '✨ Filters'}
            {!isPremium && <Crown className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />}
            {panelSelectedCount > 0 && (
              <span className="ml-0.5 bg-white text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">{panelSelectedCount}</span>
            )}
          </button>
          <button
            onClick={() => {
              // Filtering to premium-only specials is itself a Premium feature
              if (!isPremium) {
                setUpgradeFeature('Premium-Only Specials');
                setShowUpgrade(true);
                return;
              }
              setPremiumOnly(p => !p);
              setPage(1);
            }}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
              premiumOnly ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-card border-border text-muted-foreground hover:border-amber-400'
            }`}
          >
            {!isPremium && <Lock className="w-3 h-3" />}
            👑 Premium
          </button>

          {/* Price Level Filter — same row to save vertical space */}
          {[1, 2, 3, 4].map(level => (
            <button
              type="button"
              key={level}
              onClick={(e) => { e.stopPropagation(); setSelectedPrice(selectedPrice === level ? 0 : level); setPage(1); }}
              className={`flex-1 min-w-[52px] py-2 rounded-lg border-2 text-xs font-bold transition-colors ${
                selectedPrice === level
                  ? 'bg-green-600 text-white border-green-600 shadow-md'
                  : 'bg-card border-border text-muted-foreground hover:border-green-400 hover:text-green-700'
              }`}
            >
              {'$'.repeat(level)}
            </button>
          ))}
        </div>



        {/* Selected amenity chips — always visible when amenities are selected */}
        {selectedAmenities.size > 0 && !showFiltersPanel && (
          <div className="flex flex-wrap gap-1.5 -mt-2">
            {[...selectedAmenities].map(slug => {
              const amenity = ALL_AMENITIES.find(a => a.slug === slug);
              const label = amenity?.label || slug;
              return (
                <button
                  key={slug}
                  onClick={() => { const next = new Set(selectedAmenities); next.delete(slug); setSelectedAmenities(next); setPage(1); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-white border border-primary"
                >
                  {label} <X className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded filters panel */}
        {showFiltersPanel && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 max-h-[50vh] overflow-y-auto">
            <FilterPanelV3
              venueTypes={venueTypes}
              cuisines={cuisines}
              selectedVenueTypeIds={selectedVenueTypeIds}
              onVenueTypesChange={(next) => { setSelectedVenueTypeIds(next); setPage(1); }}
              selectedCuisineIds={selectedCuisineIds}
              onCuisinesChange={(next) => { setSelectedCuisineIds(next); setPage(1); }}
              selectedDeals={selectedDeals}
              onDealsChange={(next) => { setSelectedDeals(next); setPage(1); }}
              selectedTimes={selectedTimes}
              onTimesChange={(next) => { setSelectedTimes(next); setPage(1); }}
              selectedAmenities={selectedAmenities}
              onAmenitiesChange={(next) => { setSelectedAmenities(next); setPage(1); }}
              onClearAll={clearPanelFilters}
              totalSelected={panelSelectedCount}
            />
            </div>
            <div className="px-4 py-3 bg-card border-t border-border">
              <Button className="w-full font-bold" onClick={() => setShowFiltersPanel(false)}>
                Show {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </Button>
            </div>
          </div>
        )}

        {/* Active filter indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{filtered.length} venues</span>
            {search && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch('')}>{search} <X className="w-3 h-3" /></Badge>}
            {selectedCategory && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedCategory('')}>{selectedCategory} <X className="w-3 h-3" /></Badge>}
            {areaFilter.area && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setAreaFilter({ ...areaFilter, area: '' })}>{areaNameByKey[areaFilter.area] || areaFilter.area} <X className="w-3 h-3" /></Badge>}
            {areaFilter.city && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setAreaFilter({ ...areaFilter, city: '' })}>{areaFilter.city} <X className="w-3 h-3" /></Badge>}
            {areaFilter.zip_code && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setAreaFilter({ ...areaFilter, zip_code: '' })}>ZIP {areaFilter.zip_code} <X className="w-3 h-3" /></Badge>}
            {nearCoords && <Badge className="gap-1 cursor-pointer bg-blue-600 hover:bg-blue-700" onClick={() => setNearCoords(null)}><MapPin className="w-3 h-3" /> Near me ({NEAR_RADIUS_MILES} mi) <X className="w-3 h-3" /></Badge>}
            {selectedAmenities.size > 0 && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedAmenities(new Set())}>{selectedAmenities.size} amenities <X className="w-3 h-3" /></Badge>}
            {happeningNow && <Badge className="gap-1 cursor-pointer bg-green-600 hover:bg-green-700" onClick={() => setHappeningNow(false)}>Happening Now <X className="w-3 h-3" /></Badge>}
            {[...selectedVenueTypeIds].map(id => (
              <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => { const next = new Set(selectedVenueTypeIds); next.delete(id); setSelectedVenueTypeIds(next); }}>
                {venueTypeNameById[id] || 'Venue type'} <X className="w-3 h-3" />
              </Badge>
            ))}
            {[...selectedCuisineIds].map(id => (
              <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => { const next = new Set(selectedCuisineIds); next.delete(id); setSelectedCuisineIds(next); }}>
                {cuisineNameById[id] || 'Cuisine'} <X className="w-3 h-3" />
              </Badge>
            ))}
            {[...selectedDeals].map(id => (
              <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => { const next = new Set(selectedDeals); next.delete(id); setSelectedDeals(next); }}>
                {DEAL_FILTERS.find(d => d.id === id)?.label || id} <X className="w-3 h-3" />
              </Badge>
            ))}
            {[...selectedTimes].map(id => (
              <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => { const next = new Set(selectedTimes); next.delete(id); setSelectedTimes(next); }}>
                {TIME_BUCKETS.find(b => b.id === id)?.label || id} <X className="w-3 h-3" />
              </Badge>
            ))}
            {premiumOnly && <Badge className="gap-1 cursor-pointer bg-amber-500 hover:bg-amber-600" onClick={() => setPremiumOnly(false)}>👑 Premium Only <X className="w-3 h-3" /></Badge>}
            {selectedPrice > 0 && <Badge className="gap-1 cursor-pointer bg-green-600 hover:bg-green-700" onClick={() => setSelectedPrice(0)}>{'$'.repeat(selectedPrice)} <X className="w-3 h-3" /></Badge>}
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-sm transition-colors">
              <X className="w-4 h-4" /> Clear all
            </button>
          </div>
        )}

        {/* Main venue list */}
        <section id="venue-results">

          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-base font-heading font-bold">
              {selectedDay
                ? `${selectedDay === today ? "Today's" : selectedDay + "'s"} Happy Hours`
                : 'All Venues'}
              {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({filtered.length})</span>}
            </h2>
            {/* View toggle: Cards / List / Calendar */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 flex-shrink-0">
              <button
                onClick={() => setLayout('cards')}
                className={`p-1.5 rounded-md transition-colors ${layoutMode === 'cards' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
                aria-label="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('compact')}
                className={`p-1.5 rounded-md transition-colors ${layoutMode === 'compact' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className="p-1.5 rounded-md text-muted-foreground transition-colors"
                aria-label="Calendar view"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-60 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/955e5d4a4_FlowerwithSixPetalsGraphic2.png" alt="flower" className="w-16 h-16 mx-auto mb-3" />
              <p className="font-semibold">No venues found</p>
              <p className="text-sm mt-1">Try a different day or clear filters</p>
              <button onClick={clearFilters} className="mt-3 text-sm text-primary hover:underline">Clear filters</button>
            </div>
          ) : (
            <>
              {layoutMode === 'compact' ? (
                <div className="space-y-2">
                  {visibleResults.map(venue => (
                    <VenueListRow
                      key={venue.id}
                      venue={venue}
                      isFavorite={favoriteIds.has(venue.id?.toString())}
                      onToggleFavorite={handleToggleFavorite}
                    amenitySlugs={amenitiesByVenue[String(venue.id)]}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleResults.map(venue => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      isFavorite={favoriteIds.has(venue.id?.toString())}
                      onToggleFavorite={handleToggleFavorite}
                    amenitySlugs={amenitiesByVenue[String(venue.id)]}
                    />
                  ))}
                </div>
              )}
              {!showAllResults && filtered.length > 4 && (
                <div className="flex justify-center mt-5">
                  <Button variant="outline" onClick={() => setShowAllResults(true)}>
                    See more ({filtered.length - 4} more)
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Trending Areas */}
        {trendingAreas.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-heading font-bold flex items-center gap-1.5">
                🔥 Trending Areas
              </h2>
              {areaFilter.area && (
                <button onClick={() => setAreaFilter({ ...areaFilter, area: '' })} className="text-xs text-primary hover:underline">
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {trendingAreas.map((a) => (
                <button
                  key={a.key}
                  onClick={() => {
                    const clearing = areaFilter.area === a.key;
                    if (clearing) {
                      // Toggling the active area off — just clear it.
                      setAreaFilter(prev => ({ ...prev, area: '' }));
                    } else {
                      // Clicking a trending area clears every other filter and
                      // shows only that area's venues, regardless of day (venue
                      // day values are inconsistent, so a day gate would hide matches).
                      setSearch('');
                      setSelectedCategory('');
                      setSelectedAmenities(new Set());
                      setSelectedVenueTypeIds(new Set());
                      setSelectedCuisineIds(new Set());
                      setSelectedDeals(new Set());
                      setSelectedTimes(new Set());
                      setHappeningNow(false);
                      setPremiumOnly(false);
                      setSelectedPrice(0);
                      setNearCoords(null);
                      setSelectedDay('');
                      setAreaFilter({ ...emptyAreaFilter, area: a.key });
                    }
                    setPage(1);
                    document.getElementById('venue-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    areaFilter.area === a.key
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <p className={`text-xs font-bold truncate ${areaFilter.area === a.key ? 'text-white' : 'text-foreground'}`}>
                    {a.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${areaFilter.area === a.key ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {a.count} venues
                    </span>
                    {a.featured > 0 && (
                      <span className={`text-xs ${areaFilter.area === a.key ? 'text-white/80' : 'text-primary font-semibold'}`}>
                        ⭐ {a.featured}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Featured Section — only show when no search active */}
        {!search && !selectedCategory && !hasAreaFilter && featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-heading font-bold flex items-center gap-1.5">
                ⭐ Featured
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {featured.map(venue => (
                <div key={venue.id} className="flex-shrink-0 w-64">
                  <VenueCard
                    venue={venue}
                    isFavorite={favoriteIds.has(venue.id?.toString())}
                    onToggleFavorite={handleToggleFavorite}
                    compact
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fan Favorites — only show when no filters */}
        {!search && !selectedCategory && !hasAreaFilter && fanFaves.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-heading font-bold">💜 Fan Favorites</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {fanFaves.map(venue => (
                <div key={venue.id} className="flex-shrink-0 w-64">
                  <VenueCard
                    venue={venue}
                    isFavorite={favoriteIds.has(venue.id?.toString())}
                    onToggleFavorite={handleToggleFavorite}
                    compact
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* News Strip — only on home with no filters */}
        {!search && !selectedCategory && !hasAreaFilter && news.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-heading font-bold flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-primary" /> Latest News
              </h2>
              <Link to="/news" className="text-xs text-primary font-semibold hover:underline">See all</Link>
            </div>
            <div className="space-y-2">
              {news.map(article => (
                <div key={article.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Newspaper className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-1">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.excerpt}</p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0 text-xs self-start">{article.category}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        </div>
       </PullToRefresh>
      </div>

      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={upgradeFeature}
        requiredTier="premium"
      />
    </div>
  );
}