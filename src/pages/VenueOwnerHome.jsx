import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Clock, Image, Star, ChevronRight,
  CheckCircle, AlertCircle, PlusCircle, Eye,
  LayoutDashboard, TrendingUp, Zap, Calendar,
  BarChart3, BookOpen, DollarSign, Megaphone,
  MessageSquarePlus, LifeBuoy, LogOut, Compass, Building2, Truck
  } from 'lucide-react';
import { foodTruckTypeIds, isFoodTruck } from '@/lib/truckSchedule';
import { openFeedback, openChangelog, openMessenger, isFeaturebaseConfigured } from '@/lib/featurebase';
import TierBadge from '@/components/TierBadge';
import OwnerBillingOverview from '@/components/venue/OwnerBillingOverview';
import OfferActivityDashboard from '@/components/venue/OfferActivityDashboard';
import DownloadVenueData from '@/components/venue/DownloadVenueData';
import DeleteVenueAccountSection from '@/components/venue/DeleteVenueAccountSection';
import ChainManagement from '@/components/venue/ChainManagement';
import RoleSummaryBanner, { resolveDashboardRole } from '@/components/venue/RoleSummaryBanner';
import { PHASE2 } from '@/lib/phase2Features';
import { VENUE_PREMIUM, VENUE_PLATINUM } from '@/lib/pricing';

function statusColor(s) {
  if (s === 'active') return 'bg-emerald-500';
  if (s === 'pending') return 'bg-amber-500';
  return 'bg-slate-500';
}
function statusLabel(s) {
  if (s === 'active') return 'Live';
  if (s === 'pending') return 'Pending Review';
  return s || 'Draft';
}

export default function VenueOwnerHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [venues, setVenues] = useState([]);
  const [amenityCounts, setAmenityCounts] = useState({});
  const [myCollabRoles, setMyCollabRoles] = useState([]); // [{ venue_id, role }] for current user
  const [loading, setLoading] = useState(true);
  const [truckTypeIds, setTruckTypeIds] = useState(new Set());

  useEffect(() => {
    base44.entities.VenueType.list().then(t => setTruckTypeIds(foodTruckTypeIds(t))).catch(() => {});
  }, []);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const loadVenues = async (me) => {
    const [allVenues, collaborations] = await Promise.all([
      base44.entities.Venue.list(),
      base44.entities.VenueCollaborator.list().catch(() => []),
    ]);
    // Get venues where user is owner OR collaborator
    const myCollabs = collaborations.filter(c => c.user_id === me.id);
    const collabVenueIds = myCollabs.map(c => c.venue_id);
    setMyCollabRoles(myCollabs.map(c => ({ venue_id: c.venue_id, role: c.role })));
    const accessibleVenues = allVenues.filter(v =>
      v.owner_id === me.id || collabVenueIds.includes(v.id)
    );
    setVenues(accessibleVenues);
    // Owners land on their venue's full dashboard first (once per session, so Back still reaches this page).
    if (accessibleVenues.length === 1 && !sessionStorage.getItem('hh_owner_landed')) {
      sessionStorage.setItem('hh_owner_landed', '1');
      navigate(`/venue-dashboard/${accessibleVenues[0].id}`, { replace: true });
      return;
    }
    // Count amenities per venue — only fetch if user has venues
    const counts = {};
    if (accessibleVenues.length > 0) {
      const amenities = await base44.entities.VenueAmenity.list();
      amenities.forEach(a => {
        const key = String(a.venue_id);
        counts[key] = (counts[key] || 0) + 1;
      });
    }
    setAmenityCounts(counts);
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) { navigate('/login'); return; }
      await base44.functions.invoke('linkApprovedClaims', {}).catch(() => null);
      const me = await base44.auth.me();
      setUser(me);
      await loadVenues(me);
      setLoading(false);

      // Load analytics
      try {
        const analyticsData = await base44.functions.getVenueAnalytics({});
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const dashboardRole = resolveDashboardRole(user, venues, myCollabRoles);
  const isOwner = dashboardRole === 'brand_owner';
  const dashboardTitle = {
    brand_owner: 'Owner Dashboard',
    regional_manager: 'Regional Dashboard',
    location_admin: 'Location Dashboard',
  }[dashboardRole];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-heading font-bold text-white">{dashboardTitle}</h1>
              <p className="text-slate-400 text-xs truncate">{user?.full_name || user?.email}</p>
            </div>
            <Link
              to="/explore"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-2 text-sm font-medium transition-colors flex-shrink-0"
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Explore</span>
            </Link>
            <button
              onClick={() => base44.auth.logout('/login')}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-2 text-sm font-medium transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Venue Cards */}
        {venues.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-2xl border border-slate-700">
            <p className="text-4xl mb-4">🏪</p>
            <h2 className="text-white font-semibold text-lg mb-2">No venues yet</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Get your happy hour in front of thousands of locals in Greenville</p>
            <Link to="/onboarding/venue">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Your Venue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {venues.map(venue => {
              const amenityCount = amenityCounts[String(venue.id)] || 0;
              const dealCount = venue.deals?.filter(d => d?.trim()).length || 0;
              return (
                <div key={venue.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-white font-bold text-lg leading-tight truncate">{venue.name}</h2>
                          <TierBadge tier={venue.subscription_tier} />
                          {isFoodTruck(venue, truckTypeIds) && (
                            <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                              <Truck className="w-3 h-3" /> Food Truck
                            </span>
                          )}
                          {venue.brand_name && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                              <Building2 className="w-3 h-3" /> {venue.brand_name}
                            </span>
                          )}
                        </div>
                        {venue.address && (
                          <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> {venue.address}
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusColor(venue.status)} text-white text-xs flex-shrink-0 flex items-center gap-1`}>
                        {venue.status === 'active'
                          ? <><CheckCircle className="w-3 h-3" /> Live</>
                          : <><AlertCircle className="w-3 h-3" /> {statusLabel(venue.status)}</>
                        }
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {venue.happy_hour_start ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" />
                          {venue.happy_hour_start}–{venue.happy_hour_end}
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> No hours set
                        </span>
                      )}
                      <span className="text-slate-600">·</span>
                      <span className={`flex items-center gap-1 ${dealCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <Zap className="w-3 h-3" /> {dealCount} deal{dealCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className={`flex items-center gap-1 ${amenityCount > 0 ? 'text-sky-400' : 'text-slate-500'}`}>
                        <Star className="w-3 h-3" /> {amenityCount} amenit{amenityCount !== 1 ? 'ies' : 'y'}
                      </span>
                    </div>

                    <div className="flex gap-3 mt-3 pt-3 border-t border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-sm font-semibold text-white">{venue.view_count || 0}</span>
                        <span className="text-xs text-slate-400">views</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-sm font-semibold text-white">{venue.favorite_count || 0}</span>
                        <span className="text-xs text-slate-400">saves</span>
                      </div>
                    </div>

                    {venue.days?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                          <span
                            key={d}
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              venue.days.includes(d)
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-700 text-slate-600'
                            }`}
                          >
                            {d.slice(0,3)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {dealCount > 0 && (
                    <div className="px-4 pb-3">
                      <div className="bg-slate-700/50 rounded-lg px-3 py-2 space-y-1">
                        {venue.deals.filter(d => d?.trim()).slice(0, 3).map((deal, i) => (
                          <p key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">🎉</span>{deal}
                          </p>
                        ))}
                        {dealCount > 3 && (
                          <p className="text-xs text-slate-500">+{dealCount - 3} more…</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="px-4 pb-3">
                    <Link to={`/venue-dashboard/${venue.id}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors">
                      <LayoutDashboard className="w-4 h-4" /> Open Full Dashboard <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="border-t border-slate-700">
                    <div className="grid grid-cols-2 divide-x divide-slate-700">
                      <Link to={`/venue-dashboard/${venue.id}#hours`} className="flex flex-col items-center justify-center gap-1 py-3 hover:bg-slate-700/50 transition-colors">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-amber-300 font-medium">Hours & Deals</span>
                      </Link>
                      <Link to={`/venue/${venue.id}`} className="flex flex-col items-center justify-center gap-1 py-3 hover:bg-slate-700/50 transition-colors">
                        <Eye className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">Preview</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link to="/onboarding/venue">
              <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 rounded-2xl text-slate-400 hover:border-amber-500 hover:text-amber-400 transition-colors">
                <PlusCircle className="w-5 h-5" />
                <span className="font-medium">Add Another Venue</span>
              </button>
            </Link>
          </div>
        )}

        {/* Best Practices link */}
        <Link to="/best-practices" className="block">
          <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 hover:from-amber-500/25 hover:to-orange-500/15 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Deal Posting Best Practices</p>
              <p className="text-slate-400 text-xs">Tips to get discovered and drive more foot traffic</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Role-aware summary — stats tailored to Brand Owner / Regional Manager / Location Admin */}
        {venues.length > 0 && (
          <RoleSummaryBanner role={dashboardRole} venues={venues} amenityCounts={amenityCounts} />
        )}

        {/* Feedback / What's New / Support */}
        {isFeaturebaseConfigured() && (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={openFeedback} className="bg-slate-800 border border-slate-700 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-slate-700/60 transition-colors">
              <MessageSquarePlus className="w-5 h-5 text-amber-400" />
              <span className="text-xs text-slate-300 font-medium text-center">Feedback</span>
            </button>
            <button onClick={openChangelog} className="bg-slate-800 border border-slate-700 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-slate-700/60 transition-colors">
              <Megaphone className="w-5 h-5 text-sky-400" />
              <span className="text-xs text-slate-300 font-medium text-center">What's New</span>
            </button>
            <button onClick={openMessenger} className="bg-slate-800 border border-slate-700 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-slate-700/60 transition-colors">
              <LifeBuoy className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-slate-300 font-medium text-center">Support</span>
            </button>
          </div>
        )}

        {/* Monthly Analytics Widget */}
        {!analyticsLoading && analytics && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Monthly Performance</p>
                  <p className="text-slate-400 text-xs">Past 30 days</p>
                </div>
              </div>
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-sky-400">{analytics.views.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-0.5">Total Views</p>
              </div>
              <div className="text-center border-x border-slate-700">
                <p className="text-2xl font-bold text-amber-400">{analytics.favorites.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-0.5">Total Saves</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{analytics.reviews.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-0.5">New Reviews</p>
              </div>
            </div>

            {/* Per-venue breakdown */}
            {analytics.venues.length > 0 && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400 font-medium mb-2">By Venue</p>
                <div className="space-y-2">
                  {analytics.venues.slice(0, 3).map(venue => (
                    <div key={venue.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate max-w-[150px]">{venue.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {venue.views}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Star className="w-3 h-3" /> {venue.favorites}
                        </span>
                      </div>
                    </div>
                  ))}
                  {analytics.venues.length > 3 && (
                    <p className="text-xs text-slate-500">+{analytics.venues.length - 3} more venues…</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Per-offer activity dashboard — views & redeem clicks per deal */}
        {venues.some(v => v.owner_id === user?.id) && (
          <OfferActivityDashboard userId={user?.id} venues={venues} />
        )}

        {/* Summary stats — owner only (role banner covers other roles) */}
        {isOwner && venues.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
              <p className="text-2xl font-bold text-white">{venues.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Venue{venues.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
              <p className="text-2xl font-bold text-emerald-400">{venues.filter(v => v.status === 'active').length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Live</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
              <p className="text-2xl font-bold text-sky-400">
                {venues.reduce((sum, v) => sum + (v.view_count || 0), 0)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Total Views</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
              <p className="text-2xl font-bold text-amber-400">
                {venues.reduce((sum, v) => sum + (v.favorite_count || 0), 0)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Total Saves</p>
            </div>
          </div>
        )}

        {/* Chain / multi-location management — for owners with more than one owned venue */}
        {venues.filter(v => v.owner_id === user?.id).length > 1 && (
          <ChainManagement
            user={user}
            ownedVenues={venues.filter(v => v.owner_id === user?.id)}
            onChange={() => user && loadVenues(user)}
          />
        )}

        {/* Financial overview link */}
        {venues.some(v => v.owner_id === user?.id) && (
          <Link to="/financial-overview" className="block">
            <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 hover:from-emerald-500/25 hover:to-teal-500/15 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Financial Overview</p>
                <p className="text-slate-400 text-xs">Total earnings by venue & full payment history</p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Venue Plans */}
        {isOwner && (
          <Link to={venues[0]?.id ? `/plans/venue?venue_id=${venues[0].id}` : '/plans/venue'} className="block">
            <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 hover:from-amber-500/25 hover:to-orange-500/15 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Venue Plans</p>
                <p className="text-slate-400 text-xs">Compare plans and upgrade your venue</p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Advertise in the app */}
        {venues.some(v => v.owner_id === user?.id) && (
          <Link to="/venue-ads" className="block">
            <div className="bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/40 rounded-2xl p-4 flex items-center gap-3 hover:from-violet-500/25 hover:to-fuchsia-500/15 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Advertise in the App</p>
                <p className="text-slate-400 text-xs">Buy a rotating ad placement shown to free users</p>
              </div>
              <ChevronRight className="w-5 h-5 text-violet-400 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Billing overview across all venues */}
        {venues.some(v => v.owner_id === user?.id) && <OwnerBillingOverview />}


        {/* Download all venue data */}
        {venues.some(v => v.owner_id === user?.id) && (
          <DownloadVenueData user={user} venues={venues} />
        )}

        {/* Delete account — owner only */}
        {isOwner && <DeleteVenueAccountSection user={user} venues={venues} />}

        {/* Profile link */}
        <div className="text-center pb-4">
          <Link to="/profile" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}