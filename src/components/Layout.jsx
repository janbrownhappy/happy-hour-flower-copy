import { useOutlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Newspaper, MapPin, Heart, User, Building2, Mic, ArrowLeft, LogOut, MessagesSquare, Shield, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/Breadcrumbs';
import NotificationBell from '@/components/NotificationBell';
import VoiceSearchDialog from '@/components/VoiceSearchDialog';
import KeepAliveTabs from '@/components/KeepAliveTabs';
import BottomNavigation from '@/components/BottomNavigation';
import ConsumerAdOverlay from '@/components/ads/ConsumerAdOverlay';
import FeaturebaseLauncher from '@/components/featurebase/FeaturebaseLauncher';
import { useState, useEffect, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import useGeofenceWatcher from '@/hooks/useGeofenceWatcher';
import useDespiaArrivalTracking from '@/hooks/useDespiaArrivalTracking';
import DeviceTestOverlay from '@/components/DeviceTestOverlay';
import useAndroidBackButton from '@/hooks/useAndroidBackButton';
import { resetUser } from '@/lib/analytics';

// Tabs whose state + scroll position are preserved when switching between them
const KEEP_ALIVE_PATHS = ['/explore', '/map', '/news', '/ask-local', '/favorites', '/profile'];

// Root routes show the brand logo in the header; all other child routes show a Back button
const ROOT_PATHS = ['/explore', '/map', '/favorites', '/profile', '/more'];

const navItems = [
  { path: '/explore', label: 'Explore', icon: Home },
  { path: '/map', label: 'Map', icon: MapPin },
  { path: '/favorites', label: 'Favorites', icon: Heart },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/more', label: 'More', icon: MoreHorizontal },
];
const TAB_PATHS = navItems.map((n) => n.path);

export default function Layout() {
  const location = useLocation();
  // Each animated page keeps its own route element, so an exiting page can't swallow the next one.
  const outlet = useOutlet();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Activate the geofence watcher only for consumers who opted into location services.
      try {
        const profiles = await base44.entities.Profile.filter({ created_by_id: u.id });
        setLocationEnabled(!!profiles[0]?.location_services_enabled);
      } catch {
        // ignore — watcher stays off
      }
    }).catch(() => {});
  }, []);

  // Watches GPS and fires arrival notifications when the user enters a venue's geofence.
  useGeofenceWatcher(locationEnabled);
  // Phase 4: Despia native background GPS → backend Arrival Engine (no-op outside Despia).
  useDespiaArrivalTracking(user);
  // Android hardware back button → in-app history
  useAndroidBackButton(ROOT_PATHS);

  const isVenueOwner = user?.role === 'venue_owner';
  const isAdmin = user?.role === 'admin' || ['jan.brown@happyhourflower.com', 'jb@happyhourflower.com'].includes(user?.email?.toLowerCase());
  const isKeepAlive = KEEP_ALIVE_PATHS.includes(location.pathname);
  const isRootRoute = ROOT_PATHS.includes(location.pathname);
  const isProfilePage = location.pathname === '/profile';

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/explore');
  };

  // The marketing-site chat widget must not cover the app's bottom nav
  useEffect(() => {
    document.body.classList.add('in-app-shell');
    return () => document.body.classList.remove('in-app-shell');
  }, []);

  // Per-tab stack history: remember the last screen visited inside each tab
  const [currentTab, setCurrentTab] = useState(TAB_PATHS.includes(location.pathname) ? location.pathname : '/explore');
  const [tabStacks, setTabStacks] = useState({});
  useEffect(() => {
    const full = location.pathname + location.search;
    if (TAB_PATHS.includes(location.pathname)) {
      setCurrentTab(location.pathname);
      if (!location.search) setTabStacks((s) => ({ ...s, [location.pathname]: null }));
    } else {
      setTabStacks((s) => ({ ...s, [currentTab]: full }));
    }
  }, [location.pathname, location.search]);

  const handleNavTap = (e, path) => {
    if (path === '/explore') {
      // Explore always opens fresh: cleared filters, scrolled to the top
      e.preventDefault();
      setTabStacks((s) => ({ ...s, [path]: null }));
      if (location.pathname !== path || location.search) navigate(path);
      window.dispatchEvent(new CustomEvent('explore:reset'));
      setTimeout(() => window.dispatchEvent(new CustomEvent('keepalive:scroll-top', { detail: { path } })), 50);
      return;
    }
    if (location.pathname === path) {
      // Re-tapping the already-active tab scrolls its keep-alive container back to the top
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('keepalive:scroll-top', { detail: { path } }));
    } else {
      // Return to the last screen visited inside this tab (its own stack)
      e.preventDefault();
      navigate(tabStacks[path] || path);
    }
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto shadow-xl bg-background flex flex-col overflow-hidden overscroll-none">
      {/* Top Header */}
      <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] select-none bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {isRootRoute ? (
            <Link to="/explore" className="flex items-center gap-2">
              <img src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/fbf1b44f7_navlogo.webp" alt="Happy Hour Flower" className="w-9 h-9 rounded-full" />
              <span className="font-heading text-lg font-bold text-foreground">Happy Hour Flower</span>
            </Link>
          ) : (
            <button
              onClick={handleBack}
              aria-label="Go back"
              className="flex items-center gap-1.5 -ml-2 px-2 py-2 rounded-lg text-foreground hover:bg-muted transition-colors tap-target"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-heading text-base font-bold">Back</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceOpen(true)}
              aria-label="Voice search"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm hover:scale-105 transition-transform"
            >
              <Mic className="w-4 h-4" />
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors bg-amber-50 px-3 py-1.5 rounded-full"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            {isVenueOwner && (
              <Link
                to="/venue-owner"
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/30 transition-colors px-4 py-2 rounded-full"
              >
                <Building2 className="w-4 h-4" />
                Owner Dashboard
              </Link>
            )}
            {!isVenueOwner && user && <NotificationBell userId={user.id} />}
            {isProfilePage && (
              <button
                onClick={() => { resetUser(); base44.auth.logout('/'); }}
                aria-label="Sign out"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive bg-destructive/10 px-3 py-1.5 rounded-full transition-colors tap-target"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <Breadcrumbs />

      {/* Main Content */}
      {isKeepAlive ? (
        // Explore / Map / News stay mounted; each manages its own scroll inside a bounded region
        <main className="flex-1 min-h-0 pb-20 overscroll-none">
          <KeepAliveTabs />
        </main>
      ) : (
        // All other pages use normal page-level scroll, with a slide transition between them
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ x: '100%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-30%', opacity: 0 }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" /></div>}>
                {outlet}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* Bottom Nav */}
      <BottomNavigation
        items={navItems}
        tabPaths={TAB_PATHS}
        pathname={location.pathname}
        currentTab={currentTab}
        tabStacks={tabStacks}
        onTap={handleNavTap}
      />

      <VoiceSearchDialog open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      {!isVenueOwner && <ConsumerAdOverlay user={user} />}
      <DeviceTestOverlay isAdmin={isAdmin} />
      <FeaturebaseLauncher />
    </div>
  );
}