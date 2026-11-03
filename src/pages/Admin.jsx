import { useState, useEffect, Suspense } from 'react';
import { base44 } from '@/api/base44Client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useReviewsEnabled from '@/hooks/useReviewsEnabled';
import {
  AdminVenues, AdminQualityReport, AdminVenueReview, AdminListings,
  AdminNews, NewsCategoriesAdmin, AdminUsers, AdminAnalytics, AppUsageAnalytics,
  PopularityAnalytics, AmenityAnalytics, FilterCatalogSetup, AdminReviews, AdminReviewsToggle,
  NeighborhoodEditor, BulkNeighborhoodReassign, BulkVenueImport, LocationHierarchyEditor, CreateVenueFromWebsite, AdminInstagramQueue,
  EmailTemplatesAdmin, AdminMessagingLimits, AdminMessageLog, VenuePerformanceCharts,
  AmbassadorLeaderboard, AdminVenueClaims, SubscriptionGrowth, ResourceLinks, AdminActivityLog,
  AdminExpiringDeals, AdminIncompleteVenues, VenueRevenueTracker, ListingActivityCharts,
  AdminListingIssues, AppStoreLaunchChecklist, DemoAccountsSetup, SlackNotificationSettings, SeoPagesSettings, AdminBillingHealth,
  AdminChurn, AdminAttritionWatch, AdminRetention, AdminBeacons, AdminAutomations,
  AdminEmails, AdminAdApprovals, AdminAdPricing, AdminAdPerformance, AdminHouseAds,
  AdminFeatureFlags, AdminVenueOverrides, AdminAskLocal, VenueDedupePanel,
  AdminFoodTruckSchedule, ScrapeReviewPanel, AdminNearbyTester, MissingPhotosPanel, ExecutiveKpiDashboard, ImportReviewPanel, UnassignedAreaPanel,
} from '@/components/admin/adminPanels';
import { LayoutDashboard, Mail, MessageSquare, BarChart2, Trophy, ShieldCheck, Crown, Link, ExternalLink, Users, AlertTriangle, Activity, Clock, DollarSign, MapPin, Store, Flag, Rocket, UserCheck, CreditCard, Bluetooth, Zap, Megaphone, Menu, Sparkles, TrendingDown, TrendingUp, Wand2, Star, MessagesSquare, ShieldAlert, Copy, Truck, ImageOff, Check } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AdminLocationProvider, useAdminLocation } from '@/lib/AdminLocationContext';
import AnalyticsLocationFilter from '@/components/admin/AnalyticsLocationFilter';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AIVenueEnrichment from '@/components/admin/enrichment/VenueEnrichmentPanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PHASE2 } from '@/lib/phase2Features';

// Tabs whose content is venue-based and should respect the shared territory filter.
const TERRITORY_TABS = new Set([
  'analytics', 'popularity', 'venues', 'listings', 'reviews', 'claims', 'listing-issues',
  'billing-health', 'churn', 'attrition-watch', 'expiring', 'incomplete', 'missing-photos',
  'beacons', 'subscriptions', 'revenue', 'ambassadors', 'performance',
  'message-log', 'messaging', 'neighborhoods', 'users', 'amenity-analytics', 'app-usage',
  'news', 'food-trucks', 'executive-kpis',
]);

export default function Admin() {
  return (
    <AdminLocationProvider>
      <AdminInner />
    </AdminLocationProvider>
  );
}

function AdminInner() {
  const { locationFilter, setLocationFilter } = useAdminLocation();
  const [counts, setCounts] = useState({ venues: 0, listings: 0, news: 0, users: 0, claims: 0, claimsTotal: 0, claimsProcessed: 0, issues: 0, atRisk: 0, pendingAds: 0, localReports: 0 });
  const [drillDown, setDrillDown] = useState({ type: null, data: [] });
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab'));
  const [enrichVenueId, setEnrichVenueId] = useState('');
  const [emailToEdit, setEmailToEdit] = useState(null);
  const { enabled: reviewsEnabled } = useReviewsEnabled();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list(),
      base44.entities.Listing.list(),
      base44.entities.NewsArticle.list(),
      base44.entities.Profile.list(),
      base44.entities.VenueClaimRequest.list().catch(() => []),
      base44.entities.ListingIssue.filter({ status: 'open' }).catch(() => []),
      base44.entities.AdCampaign.filter({ status: 'pending' }).catch(() => []),
      base44.entities.LocalPostReport.filter({ status: 'open' }).catch(() => []),
    ]).then(([v, l, n, u, allClaims, openIssues, pendingAds, localReports]) => {
      const pending = allClaims.filter(c => c.status === 'pending').length;
      const processed = allClaims.filter(c => c.status !== 'pending').length;
      const atRisk = v.filter(x => x.billing_status === 'past_due' || x.billing_status === 'canceled').length;
      setCounts({ venues: v.length, listings: l.length, news: n.length, users: u.length, claims: pending, claimsTotal: allClaims.length, claimsProcessed: processed, issues: openIssues.length, atRisk, pendingAds: pendingAds.length, localReports: localReports.length });
    });
  }, []);

  const openDrillDown = async (type) => {
    let data = [];
    if (type === 'venues') data = await base44.entities.Venue.list();
    else if (type === 'listings') data = await base44.entities.Listing.list();
    else if (type === 'news') data = await base44.entities.NewsArticle.list();
    else if (type === 'users') data = await base44.entities.Profile.list();
    setDrillDown({ type, data });
  };

  const groups = [
    {
      label: "Overview & Analytics",
      tabs: [
        { value: "executive-kpis", label: "Executive KPIs", icon: <TrendingUp className="w-4 h-4" /> },
        { value: "analytics", label: "Analytics", icon: <LayoutDashboard className="w-4 h-4" /> },
        { value: "popularity", label: "Popularity", icon: <TrendingUp className="w-4 h-4" /> },
        { value: "app-usage", label: "App Usage", icon: <Activity className="w-4 h-4" /> },
        { value: "amenity-analytics", label: "Amenity Analytics", icon: <BarChart2 className="w-4 h-4" /> },
        { value: "performance", label: "Performance", icon: <BarChart2 className="w-4 h-4" /> },
        { value: "listing-activity", label: "Listing Activity", icon: <BarChart2 className="w-4 h-4" /> },
      ],
    },
    {
      label: "Venues & Listings",
      tabs: [
        { value: "venues", label: "Venues", icon: <Store className="w-4 h-4" /> },
        { value: "venue-from-website", label: "Add Venue from Website", icon: <Store className="w-4 h-4" /> },
        { value: "bulk-import", label: "Bulk Import Venues", icon: <Store className="w-4 h-4" /> },
        { value: "import-review", label: "Review Imports", icon: <Check className="w-4 h-4" /> },
        { value: "instagram-queue", label: "Instagram Queue", icon: <Megaphone className="w-4 h-4" /> },
        { value: "missing-area", label: "Venues Missing Area", icon: <Store className="w-4 h-4" /> },
        { value: "venue-review", label: "Verify Research", icon: <ShieldCheck className="w-4 h-4" /> },
        { value: "quality-report", label: "Quality Report", icon: <ShieldAlert className="w-4 h-4" /> },
        { value: "ai-enrichment", label: "AI Enrichment", icon: <Wand2 className="w-4 h-4" /> },
        { value: "dedupe", label: "Duplicates", icon: <Copy className="w-4 h-4" /> },
        { value: "scrape-review", label: "Scrape Review", icon: <ShieldAlert className="w-4 h-4" /> },
        { value: "listings", label: "Listings", icon: <LayoutDashboard className="w-4 h-4" /> },
        ...(reviewsEnabled ? [{ value: "reviews", label: "Reviews", icon: <LayoutDashboard className="w-4 h-4" /> }] : []),
        ...(PHASE2.beacons ? [{ value: "beacons", label: "Beacons", icon: <Bluetooth className="w-4 h-4" /> }] : []),
        { value: "food-trucks", label: "Food Trucks", icon: <Truck className="w-4 h-4" /> },
        { value: "nearby-test", label: "Nearby Detection", icon: <MapPin className="w-4 h-4" /> },
        { value: "incomplete", label: "Incomplete", icon: <AlertTriangle className="w-4 h-4" /> },
        { value: "missing-photos", label: "Missing Photos", icon: <ImageOff className="w-4 h-4" /> },
        { value: "expiring", label: "Expiring Deals", icon: <Clock className="w-4 h-4" /> },
      ],
    },
    {
      label: "Content",
      tabs: [
        { value: "news", label: "News", icon: <LayoutDashboard className="w-4 h-4" /> },
        { value: "news-categories", label: "News Categories", icon: <LayoutDashboard className="w-4 h-4" /> },
        { value: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      label: "Locations",
      tabs: [
        { value: "locations", label: "Locations", icon: <MapPin className="w-4 h-4" /> },
        { value: "neighborhoods", label: "Areas", icon: <MapPin className="w-4 h-4" /> },
        { value: "bulk-reassign", label: "Bulk Reassign", icon: <MapPin className="w-4 h-4" /> },
      ],
    },
    {
      label: "Messaging",
      tabs: [
        { value: "email-templates", label: "Email Templates", icon: <Mail className="w-4 h-4" /> },
        { value: "auto-emails", label: "Automatic Emails", icon: <Mail className="w-4 h-4" /> },
        { value: "messaging", label: "Messaging", icon: <MessageSquare className="w-4 h-4" /> },
        { value: "message-log", label: "Msg Log", icon: <MessageSquare className="w-4 h-4" /> },
        { value: "ambassadors", label: "Ambassadors", icon: <Trophy className="w-4 h-4" /> },
      ],
    },
    {
      label: "Revenue & Billing",
      tabs: [
        { value: "revenue", label: "Revenue", icon: <DollarSign className="w-4 h-4" /> },
        { value: "subscriptions", label: "Subscriptions", icon: <Crown className="w-4 h-4" /> },
        { value: "billing-health", label: "Billing Health", icon: <CreditCard className="w-4 h-4" />, badge: counts.atRisk },
        { value: "churn", label: "Churn", icon: <TrendingDown className="w-4 h-4" /> },
        { value: "attrition-watch", label: "Attrition Watch", icon: <AlertTriangle className="w-4 h-4" /> },
        { value: "retention", label: "Retention", icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
    {
      label: "Advertising",
      tabs: [
        { value: "ad-approvals", label: "Ad Approvals", icon: <Megaphone className="w-4 h-4" />, badge: counts.pendingAds },
        { value: "house-ads", label: "House Ads", icon: <Megaphone className="w-4 h-4" /> },
        { value: "ad-performance", label: "Ad Performance", icon: <BarChart2 className="w-4 h-4" /> },
        { value: "ad-pricing", label: "Ad Pricing", icon: <DollarSign className="w-4 h-4" /> },
      ],
    },
    {
      label: "Moderation",
      tabs: [
        { value: "claims", label: "Claims", icon: <ShieldCheck className="w-4 h-4" />, badge: counts.claims },
        { value: "listing-issues", label: "Listing Issues", icon: <Flag className="w-4 h-4" />, badge: counts.issues },
        { value: "ask-local", label: "Ask a Local", icon: <MessagesSquare className="w-4 h-4" />, badge: counts.localReports },
        { value: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      label: "System & Tools",
      tabs: [
        { value: "filter-catalogs", label: "Filter Catalogs", icon: <Sparkles className="w-4 h-4" /> },
        { value: "feature-flags", label: "Features", icon: <Sparkles className="w-4 h-4" /> },
        { value: "venue-overrides", label: "Venue Overrides", icon: <Sparkles className="w-4 h-4" /> },
        { value: "automations", label: "Automations", icon: <Zap className="w-4 h-4" /> },
        { value: "resources", label: "Resources", icon: <Link className="w-4 h-4" /> },
        { value: "app-store-launch", label: "App Store Launch", icon: <Rocket className="w-4 h-4" /> },
        { value: "demo-accounts", label: "Demo Accounts", icon: <UserCheck className="w-4 h-4" /> },
        { value: "slack", label: "Slack Alerts", icon: <MessageSquare className="w-4 h-4" /> },
        { value: "seo-pages", label: "SEO Pages", icon: <MapPin className="w-4 h-4" /> },
        { value: "reviews-settings", label: "Reviews Setting", icon: <Star className="w-4 h-4" /> },
      ],
    },
  ];

  const currentTab = activeTab || (counts.claims > 0 ? "claims" : "analytics");

  // Which group panels are expanded — start with the group containing the active tab open.
  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    groups.forEach(g => { init[g.label] = g.tabs.some(t => t.value === (activeTab || (counts.claims > 0 ? "claims" : "analytics"))); });
    return init;
  });
  const toggleGroup = (label) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  // Selecting a tab from the mobile drawer should also close the drawer.
  const handleSelectTab = (value) => {
    setActiveTab(value);
    setMobileNavOpen(false);
  };

  // Resolve the active tab's label for the mobile header title.
  const currentTabLabel = groups.flatMap(g => g.tabs).find(t => t.value === currentTab)?.label || 'Dashboard';

  return (
    <>
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex w-52 shrink-0 bg-card border-r border-border flex-col overflow-y-auto">
        <AdminSidebar
          groups={groups}
          counts={counts}
          currentTab={currentTab}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          onSelectTab={handleSelectTab}
          onOpenDrillDown={openDrillDown}
        />
      </div>

      {/* Mobile top header — only visible on mobile */}
      <div className="md:hidden flex items-center gap-3 p-3 bg-card border-b border-border shrink-0">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Open admin menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Admin</p>
          <p className="font-heading font-bold text-base leading-tight truncate">{currentTabLabel}</p>
        </div>
      </div>

      {/* Mobile slide-out drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-72 max-w-[85vw] overflow-y-auto">
          <AdminSidebar
            groups={groups}
            counts={counts}
            currentTab={currentTab}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            onSelectTab={handleSelectTab}
            onOpenDrillDown={(type) => { setMobileNavOpen(false); openDrillDown(type); }}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {TERRITORY_TABS.has(currentTab) && (
          <div className="mb-5">
            <AnalyticsLocationFilter value={locationFilter} onChange={setLocationFilter} />
          </div>
        )}
        <ErrorBoundary key={currentTab} message="This admin section failed to load.">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
        {currentTab === "executive-kpis" && <ExecutiveKpiDashboard />}
        {currentTab === "analytics" && <AdminAnalytics />}
        {currentTab === "popularity" && <PopularityAnalytics />}
        {currentTab === "app-usage" && <AppUsageAnalytics />}
        {currentTab === "amenity-analytics" && <AmenityAnalytics />}
        {currentTab === "venues" && <AdminVenues />}
        {currentTab === "venue-review" && <AdminVenueReview />}
        {currentTab === "quality-report" && (
          <AdminQualityReport
            onGoToEnrichment={(id) => { setEnrichVenueId(id); setActiveTab('ai-enrichment'); }}
          />
        )}
        {currentTab === "ai-enrichment" && <AIVenueEnrichment initialVenueId={enrichVenueId} />}
        {currentTab === "dedupe" && <VenueDedupePanel />}
        {currentTab === "scrape-review" && <ScrapeReviewPanel />}
        {currentTab === "food-trucks" && <AdminFoodTruckSchedule />}
        {currentTab === "nearby-test" && <AdminNearbyTester />}
        {currentTab === "listings" && <AdminListings />}
        {currentTab === "news" && <ErrorBoundary message="The News section failed to load. Please try again."><AdminNews /></ErrorBoundary>}
        {currentTab === "news-categories" && <NewsCategoriesAdmin />}
        {currentTab === "users" && <AdminUsers />}
        {currentTab === "reviews" && reviewsEnabled && <AdminReviews />}
        {currentTab === "reviews-settings" && <AdminReviewsToggle />}
        {currentTab === "locations" && <LocationHierarchyEditor />}
        {currentTab === "neighborhoods" && <NeighborhoodEditor />}
        {currentTab === "bulk-reassign" && <BulkNeighborhoodReassign />}
        {currentTab === "bulk-import" && <BulkVenueImport />}
        {currentTab === "import-review" && <ImportReviewPanel />}
        {currentTab === "missing-area" && <UnassignedAreaPanel />}
        {currentTab === "instagram-queue" && <AdminInstagramQueue />}
        {currentTab === "venue-from-website" && <div className="max-w-5xl"><CreateVenueFromWebsite /></div>}
        {currentTab === "email-templates" && <EmailTemplatesAdmin initialTemplateName={emailToEdit} onConsumeInitial={() => setEmailToEdit(null)} />}
        {currentTab === "messaging" && <AdminMessagingLimits />}
        {currentTab === "message-log" && <AdminMessageLog />}
        {currentTab === "performance" && <VenuePerformanceCharts onDrillDown={openDrillDown} />}
        {currentTab === "listing-activity" && <ListingActivityCharts />}
        {currentTab === "ambassadors" && <AmbassadorLeaderboard />}
        {currentTab === "claims" && <AdminVenueClaims />}
        {currentTab === "listing-issues" && <AdminListingIssues />}
        {currentTab === "revenue" && <VenueRevenueTracker />}
        {currentTab === "subscriptions" && <SubscriptionGrowth />}
        {currentTab === "billing-health" && <AdminBillingHealth />}
        {currentTab === "churn" && <AdminChurn />}
        {currentTab === "attrition-watch" && <AdminAttritionWatch />}
        {currentTab === "retention" && <AdminRetention />}
        {currentTab === "resources" && <ResourceLinks />}
        {currentTab === "activity" && <AdminActivityLog />}
        {currentTab === "expiring" && <AdminExpiringDeals />}
        {currentTab === "incomplete" && <AdminIncompleteVenues />}
        {currentTab === "missing-photos" && <MissingPhotosPanel />}
        {currentTab === "app-store-launch" && <AppStoreLaunchChecklist />}
        {currentTab === "demo-accounts" && <DemoAccountsSetup />}
        {currentTab === "slack" && <SlackNotificationSettings />}
        {currentTab === "seo-pages" && <SeoPagesSettings />}
        {currentTab === "beacons" && PHASE2.beacons && <AdminBeacons />}
        {currentTab === "automations" && <AdminAutomations />}
        {currentTab === "auto-emails" && <AdminEmails onEditEmail={(name) => { setEmailToEdit(name); setActiveTab('email-templates'); }} />}
        {currentTab === "ad-approvals" && <AdminAdApprovals />}
        {currentTab === "house-ads" && <AdminHouseAds />}
        {currentTab === "ad-performance" && <AdminAdPerformance />}
        {currentTab === "ad-pricing" && <AdminAdPricing />}
        {currentTab === "filter-catalogs" && <FilterCatalogSetup />}
        {currentTab === "feature-flags" && <AdminFeatureFlags />}
        {currentTab === "venue-overrides" && <AdminVenueOverrides />}
        {currentTab === "ask-local" && <AdminAskLocal />}
        </Suspense>
        </ErrorBoundary>
      </div>
    </div>
      {/* Drill-down Dialog */}
      <Dialog open={!!drillDown.type} onOpenChange={() => setDrillDown({ type: null, data: [] })}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="capitalize">
                {drillDown.type === 'venues' ? 'Venues' : 
                 drillDown.type === 'listings' ? 'Listings' :
                 drillDown.type === 'news' ? 'News Articles' : 'Users'}
                {' '}({drillDown.data.length})
              </DialogTitle>
              {drillDown.type === 'venues' && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setDrillDown({ type: null, data: [] }); setActiveTab('venues'); }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Manage Venues
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2">
              {drillDown.data.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {item.name || item.title || item.email || 'Unnamed'}
                      </p>
                      {(item.category || item.address || item.city || item.neighborhood) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[item.category, item.address, item.city, item.zip_code].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {item.neighborhood && (
                        <p className="text-xs text-muted-foreground">{item.neighborhood}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.status && (
                          <Badge variant={item.status === 'active' || item.status === 'approved' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        )}
                        {item.subscription_tier && (
                          <Badge variant="outline" className="capitalize">
                            {item.subscription_tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {item.created_date && (
                        <p>Created: {new Date(item.created_date).toLocaleDateString()}</p>
                      )}
                      {item.view_count && <p>{item.view_count} views</p>}
                      {item.rating && <p>★ {item.rating}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}