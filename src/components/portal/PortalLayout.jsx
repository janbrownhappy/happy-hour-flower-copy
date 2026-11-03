import { Link, Outlet } from 'react-router-dom';
import SiteBreadcrumbs from '@/components/site/SiteBreadcrumbs';

// Standalone desktop-first layout for the public Venue Claim Portal.
// Portal-branded header + the app's existing footer style (links reused inline
// so the portal stays self-contained and publish-safe with no app shell / bottom nav).
export default function PortalLayout() {
  return (
    <div className="force-light min-h-screen flex flex-col bg-[#faf7f2]">
      {/* Portal header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2.5">
            <img
              src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/fbf1b44f7_navlogo.webp"
              alt="Happy Hour Flower"
              className="w-9 h-9 rounded-full"
            />
            <div className="leading-tight">
              <span className="block font-heading text-lg font-bold text-amber-900">Happy Hour Flower</span>
              <span className="block text-[11px] text-amber-700/70 font-semibold tracking-wide uppercase">Venue Portal</span>
            </div>
          </Link>
          <Link
            to="/portal"
            className="text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
          >
            Find your venue
          </Link>
        </div>
      </header>

      {/* Page content */}
      <SiteBreadcrumbs />
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Shared footer */}
      <footer className="border-t border-amber-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-amber-900/60">
            © {new Date().getFullYear()} Happy Hour Flower · Greenville, SC
          </p>
          <div className="flex items-center gap-5 text-sm text-amber-900/60">
            <a href="/terms" className="hover:text-amber-900 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-amber-900 transition-colors">Privacy</a>
            <a href="/cookies" className="hover:text-amber-900 transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}