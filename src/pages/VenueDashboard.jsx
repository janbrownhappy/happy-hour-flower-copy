import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { compressAndUpload } from '@/lib/imageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Image, MapPin, Clock, Star, Plus, Trash2, Save,
  CheckCircle, AlertCircle, ArrowLeft, Settings,
  LayoutDashboard, Eye, Zap, Crown, Users, Copy, Send, ShieldAlert, BarChart3, Gift, Swords, CalendarCheck, Receipt, Navigation, Bluetooth, Megaphone, Truck
} from 'lucide-react';
import MySchedule from '@/components/venue/schedule/MySchedule';
import { foodTruckTypeIds, isFoodTruck } from '@/lib/truckSchedule';
import { deleteVenue } from '@/functions/deleteVenue';
import TierBadge from '@/components/TierBadge';
import AmenitySelectionDialog from '@/components/AmenitySelectionDialog';
import HoursDealsEditor from '@/components/HoursDealsEditor';
import UpgradePrompt from '@/components/UpgradePrompt';
import CollaboratorManager from '@/components/CollaboratorManager';
import VenueMessenger from '@/components/VenueMessenger';
import VenueEventsEditor from '@/components/VenueEventsEditor';
import { venueHasFeature } from '@/lib/featureTiers';
import { PHASE2 } from '@/lib/phase2Features';
import { enforceVenueLimits, maxDescriptionLength } from '@/lib/entitlements';
import SocialSharePanel from '@/components/venue/SocialSharePanel';
import VenueAnalytics from '@/components/VenueAnalytics';
import StaffManager from '@/components/venue/StaffManager';
import AmbassadorPanel from '@/components/venue/AmbassadorPanel';
import CompetitorInsights from '@/components/venue/CompetitorInsights';
import ReservationLinksEditor from '@/components/venue/ReservationLinksEditor';
import VenueBilling from '@/components/venue/VenueBilling';
import LoyaltyEnrollmentDashboard from '@/components/venue/LoyaltyEnrollmentDashboard';
import GeofenceSetup from '@/components/venue/GeofenceSetup';
import GeofenceAddonPanel from '@/components/venue/GeofenceAddonPanel';
import BeaconManager from '@/components/venue/BeaconManager';
import { canUseGeofenceAddon } from '@/lib/entitlements';
import ErrorBoundary from '@/components/ErrorBoundary';
import { stampFieldProvenance, buildPhotoProvenance } from '@/lib/provenance';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TABS = [
  { id: 'info', label: 'Venue Info', icon: MapPin },
  { id: 'hours', label: 'Hours & Deals', icon: Clock },
  { id: 'truck-schedule', label: 'Truck Schedule', icon: Truck, truckOnly: true },
  { id: 'amenities', label: 'Amenities', icon: Star },
  { id: 'reservations', label: 'Reservations', icon: CalendarCheck },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'messaging', label: 'Message Fans', icon: Send },
  { id: 'collaborators', label: 'Team', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Clock },
  { id: 'ambassador', label: 'Followers', icon: Gift },
  { id: 'billing', label: 'Billing', icon: Receipt, ownerOnly: true },
  // Premium
  { id: 'events', label: 'Events', icon: Clock },
  { id: 'social', label: 'Social Sharing', icon: Megaphone },
  // Platinum
  { id: 'wallet', label: 'Wallet Passes', icon: Crown },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'insights', label: 'Competitor Insights', icon: Swords },
  ...(PHASE2.geofencing ? [{ id: 'geofence', label: 'Geofence', icon: Navigation }] : []),
  ...(PHASE2.beacons ? [{ id: 'beacons', label: 'Beacons', icon: Bluetooth }] : []),
];

export default function VenueDashboard() {
  const navigate = useNavigate();
  const { id: venueId } = useParams();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [showAmenityDialog, setShowAmenityDialog] = useState(false);
  const [savedAmenities, setSavedAmenities] = useState([]);
  const [formData, setFormData] = useState({
    name: '', address: '', description: '', category: '', price_level: null,
    happy_hour_start: '', happy_hour_end: '',
    days: [], deals: [''], photo_urls: [],
    website: '', facebook_url: '', instagram_url: '', tiktok_url: '', threads_url: '', youtube_url: '', x_url: '',
  });
  const [dealInputs, setDealInputs] = useState(['']);
  const [photoInput, setPhotoInput] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStage, setPhotoStage] = useState('');
  const [upgradePrompt, setUpgradePrompt] = useState({ open: false, feature: '', tier: 'premium' });
  const [userRole, setUserRole] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isTruck, setIsTruck] = useState(false);

  useEffect(() => {
    // Check hash for tab
    const hash = window.location.hash.replace('#', '');
    if (TABS.find(t => t.id === hash)) setActiveTab(hash); // TABS already excludes Phase 2 tabs
    if (venueId) {
      Promise.all([loadVenue(), loadAmenities(), loadActivityLogs()]);
    }
  }, [venueId]);

  const loadUserRole = async (loadedVenue) => {
    const currentUser = await base44.auth.me();
    const v = loadedVenue || venue;
    // Admin users always get owner access
    if (currentUser.role === 'admin') {
      setUserRole('owner');
      return;
    }
    // Check if user is owner
    if (v && v.owner_id === currentUser.id) {
      setUserRole('owner');
      return;
    }
    // Check if user is collaborator
    const collaborations = await base44.entities.VenueCollaborator.filter({ 
      venue_id: String(venueId),
      user_id: currentUser.id 
    });
    if (collaborations.length > 0) {
      setUserRole(collaborations[0].role);
    } else {
      setUserRole('viewer');
    }
  };

  const loadAmenities = async () => {
    const records = await base44.entities.VenueAmenity.filter({ venue_id: String(venueId) });
    setSavedAmenities(records);
  };

  const loadActivityLogs = async () => {
    const logs = await base44.entities.ActivityLog.filter({ venue_id: String(venueId) }, '-created_date', 50);
    setActivityLogs(logs);
  };

  const logActivity = async (action, description, changes = {}) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.ActivityLog.create({
        venue_id: String(venueId),
        user_id: user.id,
        user_name: user.full_name || user.email,
        action,
        description,
        changes,
      });
      // Refresh logs
      loadActivityLogs();
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const loadVenue = async () => {
    // Fetch venue and user in parallel
    let v, user;
    try {
      [v, user] = await Promise.all([
        base44.entities.Venue.get(venueId),
        base44.auth.me(),
      ]);
    } catch {
      setLoading(false);
      return;
    }
    if (!v) { setLoading(false); return; }
    
    // Check access: owner or collaborator
    const isOwner = v.owner_id === user.id || user.role === 'admin';
    if (!isOwner) {
      const collaborations = await base44.entities.VenueCollaborator.filter({ 
        venue_id: String(venueId),
        user_id: user.id 
      });
      if (collaborations.length === 0) {
        setLoading(false);
        return;
      }
    }
    
    setVenue(v);
    setCurrentUser(user);
    // Mobile venues get the date-by-date Truck Schedule tab instead of a fixed address.
    base44.entities.VenueType.list('sort_order', 200)
      .then(types => {
        const truck = isFoodTruck(v, foodTruckTypeIds(types));
        setIsTruck(truck);
        // Food trucks land on their weekly location & hours schedule.
        if (truck) setActiveTab(t => (t === 'info' || t === 'hours' ? 'truck-schedule' : t));
      })
      .catch(() => setIsTruck(false));
    loadUserRole(v);
    setFormData({
      name: v.name || '',
      address: v.address || '',
      description: v.description || '',
      category: v.category || '',
      price_level: v.price_level || null,
      happy_hour_start: v.happy_hour_start || '',
      happy_hour_end: v.happy_hour_end || '',
      days: v.days || [],
      deals: v.deals?.length > 0 ? v.deals : [''],
      photo_urls: v.photo_urls || [],
      photo_thumbs: v.photo_thumbs || {},
      website: v.website || '',
      facebook_url: v.facebook_url || '',
      instagram_url: v.instagram_url || '',
      tiktok_url: v.tiktok_url || '',
      threads_url: v.threads_url || '',
      youtube_url: v.youtube_url || '',
      x_url: v.x_url || '',
    });
    setDealInputs(v.deals?.length > 0 ? v.deals : ['']);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const filteredDeals = dealInputs.filter(d => d.trim());
    
    // Enforce deal limit for free tier venues
    if (!canUnlimitedSpecials && filteredDeals.length > 1) {
      setSaving(false);
      showUpgrade('Multiple Deals & Specials');
      return;
    }

    // Enforce photo limit for free tier venues
    if (!canUnlimitedPhotos && formData.photo_urls.length > 1) {
      setSaving(false);
      showUpgrade('Unlimited Photos');
      return;
    }
    
    // Track changes for activity log
    const changes = {};
    if (formData.name !== venue.name) changes.name = { old: venue.name, new: formData.name };
    if (formData.address !== venue.address) changes.address = { old: venue.address, new: formData.address };
    if (formData.description !== venue.description) changes.description = { old: venue.description, new: formData.description };
    if (formData.category !== venue.category) changes.category = { old: venue.category, new: formData.category };
    if (formData.happy_hour_start !== venue.happy_hour_start) changes.happy_hour_start = { old: venue.happy_hour_start, new: formData.happy_hour_start };
    if (formData.happy_hour_end !== venue.happy_hour_end) changes.happy_hour_end = { old: venue.happy_hour_end, new: formData.happy_hour_end };
    if (JSON.stringify(formData.days) !== JSON.stringify(venue.days)) changes.days = { old: venue.days, new: formData.days };
    if (JSON.stringify(filteredDeals) !== JSON.stringify(venue.deals)) changes.deals = { old: venue.deals, new: filteredDeals };
    if (JSON.stringify(formData.photo_urls) !== JSON.stringify(venue.photo_urls)) changes.photo_urls = { old: venue.photo_urls, new: formData.photo_urls };
    
    const payload = enforceVenueLimits(tier, { ...formData, deals: filteredDeals });
    // Record who set these values so automated enrichment can never overwrite them.
    payload.field_provenance = stampFieldProvenance(venue, payload, editorSource);
    payload.photo_provenance = buildPhotoProvenance(venue, payload.photo_urls || [], editorSource);
    await base44.entities.Venue.update(venueId, payload);
    
    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      const changedFields = Object.keys(changes).join(', ');
      await logActivity('updated', `Updated venue details: ${changedFields}`, changes);
    }
    
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Refresh local venue data
    loadVenue();
  };

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));
  // An HHF admin editing someone else's venue is an admin write; everyone else here is the venue side.
  const editorSource = currentUser?.role === 'admin' && venue?.owner_id !== currentUser?.id ? 'hhf_admin' : 'venue_owner';

  const toggleDay = (day) =>
    set('days', formData.days.includes(day) ? formData.days.filter(d => d !== day) : [...formData.days, day]);

  const handleDuplicate = async () => {
    if (!confirm(`Duplicate "${venue.name}"? This will create a new venue with the same settings (name will be "${venue.name} (Copy)").`)) {
      return;
    }
    
    setDuplicating(true);
    try {
      // Get current user
      const user = await base44.auth.me();
      
      // Copy venue data with modified name
      const duplicateData = {
        ...venue,
        name: `${venue.name} (Copy)`,
        owner_id: user.id,
        status: 'pending', // Reset status to pending for review
        created_date: undefined, // Don't copy system fields
        updated_date: undefined,
        id: undefined,
      };
      
      // Remove system fields that shouldn't be copied
      delete duplicateData.created_date;
      delete duplicateData.updated_date;
      delete duplicateData.id;
      
      // Create the duplicate venue
      const newVenue = await base44.entities.Venue.create(duplicateData);
      
      // Copy amenities if they exist
      if (savedAmenities.length > 0) {
        const amenityCopies = savedAmenities.map(a => ({
          venue_id: newVenue.id,
          amenity_slug: a.amenity_slug,
        }));
        await base44.entities.VenueAmenity.bulkCreate(amenityCopies);
      }
      
      alert(`Venue duplicated successfully! "${venue.name} (Copy)" has been created and is pending review.`);
      
      // Navigate to the new venue's dashboard
      navigate(`/venue-dashboard/${newVenue.id}`);
    } catch (error) {
      console.error('Duplicate error:', error);
      alert('Error duplicating venue: ' + error.message);
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== venue.name) return;
    setDeleting(true);
    try {
      const res = await deleteVenue({ venueId });
      if (res?.success) {
        navigate('/venue-owner');
      } else {
        alert('Failed to delete venue: ' + (res?.error || 'Unknown error'));
        setDeleting(false);
      }
    } catch (err) {
      alert('Failed to delete venue: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
      setDeleting(false);
    }
  };

  const tier = venue?.subscription_tier || 'free';
  const canUnlimitedPhotos = venueHasFeature(tier, 'unlimited-photos');
  const canUnlimitedSpecials = venueHasFeature(tier, 'unlimited-specials');
  const canAmenities = venueHasFeature(tier, 'custom-tags-amenities');
  const canWalletPasses = venueHasFeature(tier, 'wallet-passes');
  const isPlatinum = tier === 'platinum';
  // The paid Beacon & Geofencing add-on (Platinum only) gates both tabs.
  const addonActive = canUseGeofenceAddon(venue);
  const canCompetitorInsights = venueHasFeature(tier, 'competitive-visibility-report');
  const canEvents = tier !== 'free';
  const canSocialTools = venueHasFeature(tier, 'social-promotion-tools');
  const canLongDescription = venueHasFeature(tier, 'enhanced-venue-profile');
  const descMax = maxDescriptionLength(tier);
  const canEdit = userRole === 'owner' || userRole === 'editor';

  const showUpgrade = (feature, requiredTier = 'venue_premium') =>
    setUpgradePrompt({ open: true, feature, tier: requiredTier });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-lg">Venue not found.</p>
        <Button onClick={() => navigate('/venue-owner')} className="bg-amber-500 hover:bg-amber-600">Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/venue-owner')} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-heading font-bold text-white truncate">{venue.name}</h1>
              <TierBadge tier={venue.subscription_tier} />
            </div>
            <div className="flex items-center gap-2">
              {venue.status === 'active' ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle className="w-3 h-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertCircle className="w-3 h-3" /> Pending Review
                </span>
              )}
            </div>
          </div>
          <Link to={`/venue/${venue.id}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <Eye className="w-4 h-4" /> Preview
          </Link>
          {userRole === 'owner' && (
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
              title="Duplicate this venue to create a similar location"
            >
              <Copy className="w-4 h-4" /> {duplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border-b border-slate-700 px-4">
        {(() => {
          const visibleTabs = TABS.filter(tab =>
            (!tab.ownerOnly || userRole === 'owner') && (!tab.truckOnly || isTruck) && !(isTruck && tab.id === 'hours')
          ).sort((a, b) => (b.id === 'truck-schedule') - (a.id === 'truck-schedule'));
          const ActiveIcon = visibleTabs.find(t => t.id === activeTab)?.icon || MapPin;
          return (
            <div className="max-w-2xl mx-auto">
              {/* Mobile: dropdown picker — far easier than scrolling 18 tabs on a phone */}
              <div className="sm:hidden py-2.5">
                <div className="relative">
                  <ActiveIcon className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={activeTab}
                    onChange={e => setActiveTab(e.target.value)}
                    className="w-full h-11 pl-9 pr-9 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium appearance-none focus:outline-none focus:border-amber-500"
                  >
                    {visibleTabs.map(tab => (
                      <option key={tab.id} value={tab.id}>{tab.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
                </div>
              </div>

              {/* Tablet/desktop: scrollable tab strip */}
              <p className="hidden sm:flex items-center justify-end gap-1 px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                Scroll to see more options →
              </p>
              <div className="hidden sm:flex overflow-x-auto scrollbar-hide">
                {visibleTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'border-amber-500 text-amber-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
       <ErrorBoundary key={activeTab}>

        {/* ── VENUE INFO TAB ── */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Venue Name</Label>
                <Input value={formData.name} onChange={e => set('name', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="e.g., The Scoundrel" />
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Address</Label>
                <Input value={formData.address} onChange={e => set('address', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="123 Main St, Greenville, SC" />
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Category</Label>
                <Input value={formData.category} onChange={e => set('category', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="e.g., Sports Bar, Cocktail Lounge" />
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Price Level</Label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => set('price_level', formData.price_level === level ? null : level)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-colors ${
                        formData.price_level === level
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-amber-500/50'
                      }`}
                    >
                      {'$'.repeat(level)}
                    </button>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-1">Select the price range for your venue</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Description</Label>
                  <span className={`text-xs ${
                    formData.description.length >= descMax
                      ? 'text-amber-400'
                      : formData.description.length > descMax * 0.9
                        ? 'text-amber-500/80'
                        : 'text-slate-500'
                  }`}>
                    {formData.description.length}/{descMax}
                  </span>
                </div>
                <Textarea value={formData.description}
                  onChange={e => set('description', e.target.value.slice(0, descMax))}
                  maxLength={descMax}
                  className="bg-slate-700 border-slate-600 text-white mt-1" rows={4}
                  placeholder="Tell customers what makes your happy hour special…" />
                {!canLongDescription && (
                  <p className="text-slate-500 text-xs mt-1">
                    Free plan: {descMax} characters. Premium venues get 1,000.
                  </p>
                )}
              </div>
            </div>

            {/* Website & Social Media — premium & platinum venues */}
            {(tier === 'premium' || tier === 'platinum') && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" /> Website & Social Media
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">These links appear on your public venue page.</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Website</Label>
                  <Input value={formData.website} onChange={e => set('website', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://yourvenue.com" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Facebook</Label>
                  <Input value={formData.facebook_url} onChange={e => set('facebook_url', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://facebook.com/yourvenue" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Instagram</Label>
                  <Input value={formData.instagram_url} onChange={e => set('instagram_url', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://instagram.com/yourvenue" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">TikTok</Label>
                  <Input value={formData.tiktok_url} onChange={e => set('tiktok_url', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://tiktok.com/@yourvenue" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Threads</Label>
                  <Input value={formData.threads_url} onChange={e => set('threads_url', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://threads.net/@yourvenue" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">YouTube</Label>
                  <Input value={formData.youtube_url} onChange={e => set('youtube_url', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://youtube.com/@yourvenue" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">X (Twitter)</Label>
                  <Input value={formData.x_url} onChange={e => set('x_url', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11" placeholder="https://x.com/yourvenue" />
                </div>
              </div>
            )}
            {canEdit && <SaveButton saving={saving} saved={saved} status={venue.status} onClick={handleSave} disabled={!formData.name} />}
            {!canEdit && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">You have view-only access. Contact an owner or editor to make changes.</p>
              </div>
            )}
          </div>
        )}

        {/* ── HOURS & DEALS TAB ── */}
        {activeTab === 'hours' && (
          <HoursDealsEditor
            venue={venue}
            canEdit={canEdit}
            canUnlimitedSpecials={canUnlimitedSpecials}
            maxDays={canUnlimitedSpecials ? null : 3}
            onSave={async (scheduleData) => {
              await base44.entities.Venue.update(venueId, enforceVenueLimits(tier, scheduleData));
              await logActivity('deals_updated', 'Updated happy hour schedule and deals');
              setSaved(true);
              setTimeout(() => setSaved(false), 2500);
              loadVenue();
            }}
            onUpgrade={(feature) => showUpgrade(feature)}
          />
        )}

        {/* ── TRUCK SCHEDULE TAB ── */}
        {activeTab === 'truck-schedule' && isTruck && (
          <div id="truck-schedule">
            <MySchedule venue={venue} canEdit={canEdit} />
          </div>
        )}

        {/* ── AMENITIES TAB ── */}
        {activeTab === 'amenities' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Active Amenities
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{savedAmenities.length} selected</p>
                </div>
                <Button variant="outline" size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => setShowAmenityDialog(true)}>
                  <Settings className="w-4 h-4 mr-1.5" /> Manage
                </Button>
              </div>
              {savedAmenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {savedAmenities.map(r => (
                    <Badge key={r.id} className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1">
                      {r.amenity_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">✨</p>
                  <p className="text-slate-400 text-sm">No amenities selected yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Click Manage to add WiFi, outdoor seating, parking and more.</p>
                </div>
              )}
            </div>
            <AmenitySelectionDialog
              open={showAmenityDialog}
              onOpenChange={setShowAmenityDialog}
              venueId={venueId}
              subscriptionTier={venue.subscription_tier}
              provenance={editorSource}
              onSaved={loadAmenities}
            />
          </div>
        )}


        {/* ── RESERVATIONS TAB ── */}
        {activeTab === 'reservations' && (
          <ReservationLinksEditor
            venue={venue}
            canEdit={canEdit}
            onPolicySaved={(val) => setVenue(prev => ({ ...prev, reservation_policy: val }))}
          />
        )}

        {/* ── GEOFENCE TAB (Phase 2) ── */}
        {activeTab === 'geofence' && PHASE2.geofencing && (
          addonActive ? (
            <GeofenceSetup
              venue={venue}
              canEdit={canEdit}
              onSaved={(update) => setVenue(prev => ({ ...prev, ...update }))}
            />
          ) : isPlatinum ? (
            <GeofenceAddonPanel
              venue={venue}
              canEdit={canEdit}
              onActivated={loadVenue}
            />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #0f1117)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                    <Navigation className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-base">Geofenced Arrival Alerts</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">Platinum add-on</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">Welcome customers with a notification the moment they walk into your venue's geofence. Available as a paid add-on for Platinum venues.</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold rounded-xl"
                  onClick={() => navigate(`/plans/venue?venue_id=${venueId}&focus=platinum`)}
                >
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Platinum
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── BEACONS TAB (Phase 2) ── */}
        {activeTab === 'beacons' && PHASE2.beacons && (
          addonActive ? (
            <BeaconManager venueId={venueId} venueName={venue.name} canEdit={canEdit} />
          ) : isPlatinum ? (
            <GeofenceAddonPanel
              venue={venue}
              canEdit={canEdit}
              onActivated={loadVenue}
            />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #0f1117)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                    <Bluetooth className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-base">Beacon Support</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">Platinum add-on</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">Place Bluetooth beacons inside or near your venue to trigger hyper-precise coupons at the door, bar, or exit. Available as a paid add-on for Platinum venues.</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold rounded-xl"
                  onClick={() => navigate(`/plans/venue?venue_id=${venueId}&focus=platinum`)}
                >
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Platinum
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── PHOTOS TAB ── */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {!canUnlimitedPhotos && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-amber-300 text-sm">Free plan: 1 photo max. Upgrade for unlimited photos.</p>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => showUpgrade('Unlimited Photos')}>
                  Upgrade
                </Button>
              </div>
            )}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              <p className="text-white font-semibold flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-500" /> Photos
                <span className="text-slate-400 text-xs font-normal ml-1">({formData.photo_urls.length}{!canUnlimitedPhotos ? '/1' : ''} uploaded)</span>
              </p>
              {(canUnlimitedPhotos || formData.photo_urls.length < 1) && (
                <div className="space-y-2">
                  {/* File upload button */}
                  <label className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-600 rounded-xl text-sm font-medium cursor-pointer transition-colors ${photoUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500 hover:text-amber-400 text-slate-300'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoUploading(true);
                        try {
                          const { url, thumbUrl } = await compressAndUpload(file, setPhotoStage);
                          set('photo_urls', [...formData.photo_urls, url]);
                          set('photo_thumbs', { ...(formData.photo_thumbs || {}), [url]: thumbUrl });
                        } catch (err) {
                          alert(err.message || 'Upload failed. Please try again.');
                        } finally {
                          setPhotoUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    {photoUploading
                      ? <><div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> {photoStage === 'optimizing' ? 'Optimizing…' : 'Uploading…'}</>
                      : <><Plus className="w-4 h-4" /> Upload Photo from Device</>
                    }
                  </label>
                  {/* URL input fallback */}
                  <div className="flex gap-2">
                    <Input value={photoInput} onChange={e => setPhotoInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault();
                        if (photoInput.trim()) { set('photo_urls', [...formData.photo_urls, photoInput.trim()]); setPhotoInput(''); }
                      }}}
                      className="bg-slate-700 border-slate-600 text-white flex-1 text-xs" placeholder="Or paste image URL and press Enter…" />
                    <Button onClick={() => {
                      if (photoInput.trim()) { set('photo_urls', [...formData.photo_urls, photoInput.trim()]); setPhotoInput(''); }
                    }} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {!canUnlimitedPhotos && formData.photo_urls.length >= 1 && (
                <button onClick={() => showUpgrade('Unlimited Photos')}
                  className="w-full py-2 border border-dashed border-amber-500/40 rounded-lg text-sm text-amber-400 hover:border-amber-500 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add more photos (Premium)
                </button>
              )}
              {formData.photo_urls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {formData.photo_urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover rounded-xl" />
                      <button onClick={() => set('photo_urls', formData.photo_urls.filter((_, j) => j !== i))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                  <p className="text-3xl mb-2">📸</p>
                  <p className="text-slate-400 text-sm">No photos yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Paste an image URL above to add your first photo.</p>
                </div>
              )}
            </div>
            {canEdit && <SaveButton saving={saving} saved={saved} status={venue.status} onClick={handleSave} disabled={!formData.name} />}
            {!canEdit && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">You have view-only access. Contact an owner or editor to make changes.</p>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Customer Reviews
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {venue.review_count || 0} review{venue.review_count !== 1 ? 's' : ''} · {venue.rating?.toFixed(1) || '0'} star rating
                  </p>
                </div>
              </div>
              <div className="text-center py-8">
                <p className="text-3xl mb-2">⭐</p>
                <p className="text-slate-400 text-sm">Reviews are managed by the platform</p>
                <p className="text-slate-500 text-xs mt-1">Customer feedback appears here once approved</p>
              </div>
            </div>
          </div>
        )}

        {/* ── EVENTS TAB ── */}
        {activeTab === 'events' && (
          canEvents ? (
            <VenueEventsEditor venueId={venueId} canEdit={canEdit} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(245,166,35,0.12), #0f1117)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f5a623, rgba(245,166,35,0.3))' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Crown className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-base">Event Scheduling</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-semibold">Premium</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">Schedule recurring events and special occasions like trivia nights, live music, and more.</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 font-semibold rounded-xl"
                  onClick={() => showUpgrade('Event Scheduling')}
                >
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── MESSAGE FANS TAB ── */}
        {activeTab === 'messaging' && (
          <VenueMessenger
            venueId={venueId}
            venueName={venue.name}
            subscriptionTier={venue.subscription_tier}
          />
        )}

        {/* ── SOCIAL SHARING TAB ── */}
        {activeTab === 'social' && (
          canSocialTools ? (
            <SocialSharePanel venue={venue} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(245,166,35,0.12), #0f1117)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f5a623, rgba(245,166,35,0.3))' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Crown className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-base">Social Sharing Tools</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-semibold">Premium</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">Turn your happy hour deals into ready-to-post social copy, then share straight to Facebook or X.</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 font-semibold rounded-xl"
                  onClick={() => showUpgrade('Social Media Sharing Tools')}
                >
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── WALLET PASSES TAB ── */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {!canWalletPasses ? (
              <div className="relative overflow-hidden rounded-2xl border border-purple-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #0f1117)' }}>
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                      <Crown className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-base">Wallet Passes</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">Platinum</span>
                      </div>
                      <p className="text-slate-400 text-sm mt-0.5">Create branded loyalty cards and coupons your customers can save to Apple Wallet or Google Pay.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Loyalty Cards', 'Coupons', 'Custom Colors', 'Logo Upload', 'Issue & Redeem'].map(f => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">{f}</span>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold rounded-xl"
                    onClick={() => navigate(`/plans/venue?venue_id=${venueId}&focus=platinum`)}
                  >
                    <Crown className="w-4 h-4 mr-2" /> Upgrade to Platinum
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="relative overflow-hidden rounded-2xl border border-amber-500/20 cursor-pointer group"
                  style={{ background: 'radial-gradient(ellipse at top left, rgba(245,166,35,0.1), #0f1117)' }}
                  onClick={() => navigate(`/wallet-designer/${venueId}`)}
                >
                  <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f5a623, rgba(245,166,35,0.3))' }} />
                  <div className="p-6 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <Crown className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-base">Wallet Designer</p>
                      <p className="text-slate-400 text-sm mt-0.5">Create branded loyalty cards and coupons your customers can save to Apple Wallet or Google Pay.</p>
                      <div className="flex gap-2 mt-2.5 flex-wrap">
                        {['Loyalty Cards', 'Coupons', 'Custom Colors', 'Logo Upload', 'Issue & Redeem'].map(f => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 font-semibold rounded-xl"
                  onClick={() => navigate(`/wallet-designer/${venueId}`)}
                >
                  <Crown className="w-4 h-4 mr-2" /> Open Wallet Designer
                </Button>

                {/* Staff Management */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                  <p className="text-white font-semibold flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-amber-500" /> Staff Pass Validators
                  </p>
                  <StaffManager venueId={venueId} venueName={venue?.name} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MEMBERS (LOYALTY ENROLLMENT) TAB ── */}
        {activeTab === 'members' && (
          canWalletPasses ? (
            <LoyaltyEnrollmentDashboard venueId={String(venueId)} venueName={venue.name} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #0f1117)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-base">Loyalty Members</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">Platinum</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">See new members signing up for your loyalty programs in real-time.</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold rounded-xl"
                  onClick={() => navigate(`/plans/venue?venue_id=${venueId}&focus=platinum`)}
                >
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Platinum
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── COLLABORATORS TAB ── */}
        {activeTab === 'collaborators' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <CollaboratorManager venueId={venueId} />
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <VenueAnalytics venueId={venueId} venueName={venue.name} />
        )}

        {/* ── COMPETITOR INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          canCompetitorInsights ? (
            <CompetitorInsights venueId={venueId} venueName={venue.name} canEdit={canEdit} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #0f1117)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                    <Swords className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-base">Competitor Insights</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">Platinum</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">Track up to 4 competing venues and benchmark your views, favorites, and reviews against theirs.</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold rounded-xl"
                  onClick={() => navigate(`/plans/venue?venue_id=${venueId}&focus=platinum`)}
                >
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Platinum
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── AMBASSADOR TAB ── */}
        {activeTab === 'ambassador' && currentUser && (
          <AmbassadorPanel
            venue={venue}
            user={currentUser}
            onVenueUpdate={setVenue}
          />
        )}

        {/* ── BILLING TAB ── */}
        {activeTab === 'billing' && userRole === 'owner' && (
          <VenueBilling venueId={venueId} venueName={venue.name} />
        )}

        {/* ── ACTIVITY LOG TAB ── */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> Recent Activity
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">Track edits and updates made by collaborators</p>
                </div>
              </div>
              {activityLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityLogs.map((log, index) => (
                    <div key={log.id || index} className="border-b border-slate-700 pb-3 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium text-sm">{log.user_name}</span>
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full capitalize">
                              {log.action.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm">{log.description}</p>
                          <p className="text-slate-500 text-xs mt-1">
                            {new Date(log.created_date).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-slate-400 text-sm">No activity yet</p>
                  <p className="text-slate-500 text-xs mt-1">Changes made to this venue will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
       </ErrorBoundary>
      </div>

      {/* ── DANGER ZONE (owner only) ── */}
      {userRole === 'owner' && (
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 text-sm font-medium py-2 list-none">
              <ShieldAlert className="w-4 h-4" />
              Danger Zone
              <span className="ml-auto text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
            </summary>
            <div className="mt-3 bg-red-950/30 border border-red-800/40 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-red-300 font-semibold text-sm">Delete this venue</p>
                <p className="text-slate-400 text-xs mt-1">
                  This permanently removes the venue, all its amenities, events, collaborators, and wallet passes.
                  {venue?.subscription_tier !== 'free' && ' Your active subscription will also be cancelled.'}
                  {' '}This action cannot be undone.
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Type <span className="text-red-300 font-mono">{venue?.name}</span> to confirm:</p>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="bg-slate-900 border-red-800/50 text-white text-sm"
                  placeholder={venue?.name}
                />
              </div>
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== venue?.name || deleting}
                className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {deleting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Deleting…</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" /> Permanently Delete Venue</>
                )}
              </Button>
            </div>
          </details>
        </div>
      )}

      <UpgradePrompt
        open={upgradePrompt.open}
        onClose={() => setUpgradePrompt(p => ({ ...p, open: false }))}
        feature={upgradePrompt.feature}
        requiredTier={upgradePrompt.tier}
      />
    </div>
  );
}

function SaveButton({ saving, saved, status, onClick, disabled }) {
  return (
    <Button onClick={onClick} disabled={saving || disabled}
      className={`w-full py-3 font-semibold text-white rounded-xl transition-colors ${
        saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
      }`}>
      {saving ? (
        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</>
      ) : saved ? (
        <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
      ) : (
        <><Save className="w-4 h-4 mr-2" /> {status === 'active' ? 'Update Listing' : 'Submit for Review'}</>
      )}
    </Button>
  );
}