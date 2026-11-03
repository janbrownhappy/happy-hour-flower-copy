import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import lazyWithRetry from '@/lib/lazyWithRetry';
const lazy = lazyWithRetry;
import PageNotFound from './lib/PageNotFound';
import { isBlockedRequest } from '@/lib/blockedPaths';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { appParams } from '@/lib/app-params';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';

// The app shell, its tab pages and the admin panel are lazy-loaded so the public
// home page doesn't download them. lazyWithRetry retries failed chunk fetches.
const Layout = lazy(() => import('@/components/Layout'));
const Explore = lazy(() => import('@/pages/Explore'));
const News = lazy(() => import('@/pages/News'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const AskLocal = lazy(() => import('@/pages/AskLocal'));
const MapView = lazy(() => import('@/pages/MapView'));
const Profile = lazy(() => import('@/pages/Profile'));
const Admin = lazy(() => import('@/pages/Admin'));

const VenueDetail = lazy(() => import('@/pages/VenueDetail'));

const AdminMarketing = lazy(() => import('@/pages/AdminMarketing'));
const PRDDownload = lazy(() => import('@/pages/PRDDownload'));
const SuggestVenue = lazy(() => import('@/pages/SuggestVenue'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const VenueOnboarding = lazy(() => import('@/pages/VenueOnboarding'));
const VenueDashboard = lazy(() => import('@/pages/VenueDashboard'));
const VenueSetupWizard = lazy(() => import('@/pages/VenueSetupWizard'));
const VenueOwnerHome = lazy(() => import('@/pages/VenueOwnerHome'));
const VenueAds = lazy(() => import('@/pages/VenueAds'));
const FinancialOverview = lazy(() => import('@/pages/FinancialOverview'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Welcome = lazy(() => import('@/pages/Welcome'));
const CustomerOnboarding = lazy(() => import('@/pages/CustomerOnboarding'));
const WelcomeOnboarding = lazy(() => import('@/pages/WelcomeOnboarding'));
const Plans = lazy(() => import('@/pages/Plans'));
const ConsumerPlans = lazy(() => import('@/pages/ConsumerPlans'));
const VenuePlans = lazy(() => import('@/pages/VenuePlans'));
const AuthCheck = lazy(() => import('@/pages/AuthCheck'));
const VerifyAge = lazy(() => import('@/pages/VerifyAge'));
const ClaimVenue = lazy(() => import('@/pages/ClaimVenue'));
const ClaimThankYou = lazy(() => import('@/pages/ClaimThankYou'));
const Settings = lazy(() => import('@/pages/Settings'));
const More = lazy(() => import('@/pages/More'));
const ActionItems = lazy(() => import('@/pages/ActionItems'));
const BestPractices = lazy(() => import('@/pages/BestPractices'));
const GreenvilleNeighborhoods = lazy(() => import('@/pages/GreenvilleNeighborhoods'));
const WalletDesigner = lazy(() => import('@/pages/WalletDesigner'));
const StaffRedeem = lazy(() => import('@/pages/StaffRedeem'));
const NfcUnlock = lazy(() => import('@/pages/NfcUnlock'));
const WalletPassView = lazy(() => import('@/pages/WalletPassView'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('@/pages/CookiePolicy'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const AdminSetup = lazy(() => import('@/pages/AdminSetup'));
const PortalSearch = lazy(() => import('@/pages/portal/PortalSearch'));
const PortalClaim = lazy(() => import('@/pages/portal/PortalClaim'));
const PortalAdd = lazy(() => import('@/pages/portal/PortalAdd'));
const PortalThankYou = lazy(() => import('@/pages/portal/PortalThankYou'));
const PortalProof = lazy(() => import('@/pages/portal/PortalProof'));
const AdminBlog = lazy(() => import('@/pages/AdminBlog'));
const AdminChangelog = lazy(() => import('@/pages/AdminChangelog'));
const AdminQrCodes = lazy(() => import('@/pages/AdminQrCodes'));
const AdminQrDetail = lazy(() => import('@/pages/AdminQrDetail'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));
const ConsumerTestPlan = lazy(() => import('@/pages/ConsumerTestPlan'));
const VenueTestPlan = lazy(() => import('@/pages/VenueTestPlan'));
import QrRedirect from '@/pages/QrRedirect';
import AnalyticsBridge from '@/components/AnalyticsBridge';
import OneSignalUserLink from '@/components/OneSignalUserLink';
import SeoHead from '@/components/SeoHead';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import PortalLayout from '@/components/portal/PortalLayout';
import { SubscriptionProvider } from '@/lib/SubscriptionContext';
import { LocationProvider } from '@/lib/LocationContext';
import { base44 } from '@/api/base44Client';
import { meetsMinimumAge } from '@/lib/ageVerification';
import useSessionTracker from '@/hooks/useSessionTracker';
import useSystemTheme from '@/hooks/useSystemTheme';
import FeaturebaseRoot from '@/components/featurebase/FeaturebaseRoot';

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
  </div>
);

const RegisterRedirect = () => {
  const { user } = useAuth();
  // Logged-in users hitting /register go to their dashboard
  if (user?.role === 'venue_owner') return <Navigate to="/venue-owner" replace />;
  return <Navigate to="/explore" replace />;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, authChecked } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Track app opens, logins, and time spent in the app
  useSessionTracker(user);
  useSystemTheme();

  // Hard gate: only run ONCE after auth is confirmed, not on every navigation
  useEffect(() => {
    if (!user || !authChecked) return;
    const isVenueOwner = user.role === 'venue_owner';
    const isAdmin = user.role === 'admin';
    if (isAdmin) return;
    // Venue owners skip consumer onboarding but must still pass the 21+ birthday check
    if (isVenueOwner) {
      if (['/verify-age', '/onboarding/venue', '/login', '/register'].some(p => location.pathname.startsWith(p))) return;
      base44.entities.Profile.filter({ created_by_id: user.id }).then(profiles => {
        if (!meetsMinimumAge(profiles[0]?.date_of_birth)) navigate('/verify-age', { replace: true });
      }).catch(() => {});
      return;
    }

    const onboardingPaths = ['/onboarding/profile', '/onboarding/venue', '/onboarding/welcome', '/onboarding', '/login', '/register', '/forgot-password', '/reset-password', '/auth-check', '/plans'];
    if (onboardingPaths.some(p => location.pathname.startsWith(p))) return;

    // Don't run the profile-completeness redirect while returning from Stripe Checkout.
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('session_id')) return;

    // Check profile completeness — only redirect if zip is missing (name is optional)
    base44.entities.Profile.filter({ created_by_id: user.id }).then(profiles => {
      const profile = profiles[0];
      const hasZip = profile?.zip_code && profile.zip_code.trim();
      // Everyone must pass the 21+ birthday check, including Google sign-ups and older accounts
      if (!hasZip || !meetsMinimumAge(profile?.date_of_birth)) {
        navigate('/onboarding/profile', { replace: true });
      }
    }).catch(() => {
      // If we can't fetch, let them through — don't block on error
    });
  }, [user?.id, authChecked]); // Only run when user identity changes, NOT on every route change

  // Handle post-auth redirects once (but NOT for password reset flows)
  useEffect(() => {
    if (!user || !authChecked) return;

    const urlParams = new URLSearchParams(window.location.search);
    const isNewUser = urlParams.get('is_new_user') === 'true';
    const isVenueOwner = user.role === 'venue_owner';
    const isAdmin = user.role === 'admin';
    const isAuthPage = ['/login', '/register'].includes(location.pathname);
    const isPasswordResetPage = ['/forgot-password', '/reset-password'].includes(location.pathname);

    if (isPasswordResetPage) return;

    if (!isAuthPage) return;

    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    if (isVenueOwner) {
      if (isNewUser) {
        navigate('/onboarding/venue', { replace: true });
      } else {
        base44.entities.Venue.filter({ owner_id: user.id }).then(venues => {
          navigate(venues.length > 0 ? '/venue-owner' : '/onboarding/venue', { replace: true });
        }).catch(() => {
          navigate('/venue-owner', { replace: true });
        });
      }
    } else if (isNewUser) {
      navigate('/onboarding/profile', { replace: true });
    } else {
      navigate('/explore', { replace: true });
    }
  }, [user, authChecked]);

  // Probe deny list — answer with the not-found page before auth or data loads.
  if (isBlockedRequest(location.pathname, location.search)) {
    return <PageNotFound />;
  }

  if (isLoadingPublicSettings || isLoadingAuth || !authChecked) {
    // The app entry screen renders immediately; the sign-in check finishes in the background.
    if (location.pathname === '/') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <SeoHead />
          <Routes>
            <Route path="/" element={<Welcome />} />
          </Routes>
        </Suspense>
      );
    }
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Welcome is always the root — shown to everyone
  // Unauthenticated users only get auth routes + welcome
  if (!user) {
    return (
      <FeaturebaseRoot user={null}>
      <Suspense fallback={<RouteFallback />}>
      <AnalyticsBridge user={null} />
      <SeoHead />
      <Routes>
        <Route path="/q/:shortCode" element={<QrRedirect />} />
        <Route path="/oauth/consent" element={<OAuthConsent />} />
        <Route path="/review/consumer" element={<ConsumerTestPlan />} />
        <Route path="/review/venue" element={<VenueTestPlan />} />
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalSearch />} />
          <Route path="/portal/claim/:venueId" element={<PortalClaim />} />
          <Route path="/portal/add" element={<PortalAdd />} />
          <Route path="/portal/thank-you" element={<PortalThankYou />} />
          <Route path="/portal/proof/:claimId" element={<PortalProof />} />
        </Route>
        <Route path="/WalletDesigner" element={<Navigate to="/login" replace />} />
        <Route path="/StaffRedeem" element={<Navigate to="/login" replace />} />
        {['/admin/*', '/financial-overview', '/action-items', '/prd-download', '/nfc-unlock', '/venue-owner', '/venue-ads', '/profile', '/settings', '/favorites'].map((p) => (
          <Route key={p} path={p} element={<Navigate to="/login" replace />} />
        ))}
        <Route path="/VenueOwnerHome" element={<Navigate to="/login" replace />} />
        {/* Signed-in app screens keep sending logged-out visitors home, as before */}
        {['/explore', '/map', '/news', '/ask-local', '/more', '/venue/:id', '/best-practices', '/suggest', '/greenville-neighborhoods', '/claim-venue', '/claim-thank-you', '/wallet-pass/:id', '/plans/*', '/onboarding/*', '/venue-dashboard/:id', '/venue-setup/:id', '/wallet-designer/:id', '/staff-redeem/:id', '/auth-check', '/verify-age'].map((p) => (
          <Route key={p} path={p} element={<Navigate to="/" replace />} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      </Suspense>
      </FeaturebaseRoot>
    );
  }

  return (
    <FeaturebaseRoot user={user}>
    <SubscriptionProvider user={user}>
      <LocationProvider user={user}>
      <ErrorBoundary resetKey={location.pathname} message="This page hit an error. Tap Try Again or reload the app.">
      <Suspense fallback={<RouteFallback />}>
      <AnalyticsBridge user={user} />
      <OneSignalUserLink user={user} />
      <SeoHead />
      <Routes>
        <Route path="/q/:shortCode" element={<QrRedirect />} />
        <Route path="/oauth/consent" element={<OAuthConsent />} />
        <Route path="/review/consumer" element={<ConsumerTestPlan />} />
        <Route path="/review/venue" element={<VenueTestPlan />} />
        {/* Root — straight into the app for the signed-in role */}
        <Route
          path="/"
          element={<Navigate to={user.role === 'admin' ? '/admin' : user.role === 'venue_owner' ? '/venue-owner' : '/explore'} replace />}
        />
        <Route path="/welcome" element={<Welcome />} />

        {/* Auth (kept available so links/redirects resolve) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterRedirect />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth-check" element={<AuthCheck />} />
        <Route path="/verify-age" element={<VerifyAge />} />

        {/* Onboarding (standalone, no app shell) */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/profile" element={<CustomerOnboarding />} />
        <Route path="/onboarding/welcome" element={<WelcomeOnboarding />} />
        <Route path="/onboarding/venue" element={<VenueOnboarding />} />

        {/* Consumer app shell */}
        <Route element={<Layout />}>
          <Route path="/explore" element={<Explore />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/news" element={<News />} />
          <Route path="/ask-local" element={<AskLocal />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/venue/:id" element={<VenueDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/more" element={<More />} />
          <Route path="/best-practices" element={<BestPractices />} />
          <Route path="/suggest" element={<SuggestVenue />} />
          <Route path="/greenville-neighborhoods" element={<GreenvilleNeighborhoods />} />
          <Route path="/claim-venue" element={<ClaimVenue />} />
          <Route path="/claim-thank-you" element={<ClaimThankYou />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/action-items" element={<ActionItems />} />
          </Route>
          <Route path="/wallet-pass/:id" element={<WalletPassView />} />
        </Route>

        {/* Plans */}
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/consumer" element={<ConsumerPlans />} />
        <Route path="/plans/venue" element={<VenuePlans />} />

        {/* Venue owner (standalone) */}
        <Route path="/venue-owner" element={<VenueOwnerHome />} />
        <Route path="/venue-dashboard/:id" element={<VenueDashboard />} />
        <Route path="/venue-setup/:id" element={<VenueSetupWizard />} />
        <Route path="/venue-ads" element={<VenueAds />} />
        <Route path="/financial-overview" element={<FinancialOverview />} />
        <Route path="/wallet-designer/:id" element={<WalletDesigner />} />
        <Route path="/staff-redeem/:id" element={<StaffRedeem />} />
        <Route path="/nfc-unlock" element={<NfcUnlock />} />

        {/* Admin (role-guarded) */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/marketing" element={<AdminMarketing />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/admin/changelog" element={<AdminChangelog />} />
          <Route path="/admin/qr" element={<AdminQrCodes />} />
          <Route path="/admin/qr/:id" element={<AdminQrDetail />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Public content + portal */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route element={<AdminProtectedRoute />}>
          <Route path="/prd-download" element={<PRDDownload />} />
        </Route>
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalSearch />} />
          <Route path="/portal/claim/:venueId" element={<PortalClaim />} />
          <Route path="/portal/add" element={<PortalAdd />} />
          <Route path="/portal/thank-you" element={<PortalThankYou />} />
          <Route path="/portal/proof/:claimId" element={<PortalProof />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      </LocationProvider>
    </SubscriptionProvider>
    </FeaturebaseRoot>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App