import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import AuthAwareCTA from "@/components/AuthAwareCTA";

const LOGO_URL = "https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/fbf1b44f7_navlogo.webp";

const NAV_LINKS = [
  { label: "For Consumers", to: "/site/consumers" },
  { label: "For Venues", to: "/site/venues" },
  { label: "Pricing", to: "/site/pricing" },
  { label: "Local Guides", to: "/happy-hour" },
  { label: "Blog", to: "/blog" },
];

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/site" className="flex items-center gap-2">
          <img src={LOGO_URL} width={36} height={36} decoding="async" alt="Happy Hour Flower" className="w-9 h-9 rounded-full" onError={(e) => { e.target.style.display = 'none'; }} />
          <span className="font-heading font-bold text-lg text-gray-900">Happy Hour Flower</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors ${location.pathname === l.to ? "text-amber-600" : "text-gray-600 hover:text-gray-900"}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/welcome"
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
          >
            Get Started
          </Link>
          <AuthAwareCTA
            to="/explore"
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            Open the App
          </AuthAwareCTA>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="md:hidden p-2 -mr-2 text-gray-700"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block text-base font-medium text-gray-700 py-1"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/welcome"
            onClick={() => setOpen(false)}
            className="block text-base font-semibold text-amber-600 py-1"
          >
            Get Started
          </Link>
          <AuthAwareCTA
            to="/explore"
            className="w-full justify-center bg-amber-500 hover:bg-amber-400 text-white font-bold text-base px-4 py-3 rounded-xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            Open the App
          </AuthAwareCTA>
        </div>
      )}
    </nav>
  );
}