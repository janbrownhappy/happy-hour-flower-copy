import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import AuthAwareCTA from "@/components/AuthAwareCTA";

export default function Welcome() {
  const { user } = useAuth();

  // If already logged in, show a "go to your dashboard" view instead
  if (user) {
    const dashboardPath = user.role === 'venue_owner' ? '/venue-owner' : '/explore';
    const dashboardLabel = user.role === 'venue_owner' ? 'Go to Venue Dashboard' : 'Explore Happy Hours';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "linear-gradient(160deg, #1a2a6c 0%, #1e3a8a 50%, #162455 100%)" }}>
        <div className="mb-8 flex flex-col items-center">
          <img
            src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/fbf1b44f7_navlogo.webp"
            alt="Happy Hour Flower"
            className="w-28 h-28 rounded-2xl object-cover shadow-2xl"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <Link to="/admin/login" className="text-blue-300/70 text-xs hover:text-blue-200 transition-colors mt-2 underline underline-offset-2">
            Admin Login
          </Link>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-blue-200">{user.full_name || user.email}</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <Link
            to={dashboardPath}
            className="flex items-center justify-between w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-6 py-4 transition-colors"
          >
            {dashboardLabel}
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(160deg, #1a2a6c 0%, #1e3a8a 50%, #162455 100%)" }}>
      
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <img
          src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/fbf1b44f7_navlogo.webp"
          alt="Happy Hour Flower"
          className="w-28 h-28 rounded-2xl object-cover shadow-2xl"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <Link to="/admin/login" className="text-blue-300/70 text-xs hover:text-blue-200 transition-colors mt-2 underline underline-offset-2">
          Admin Login
        </Link>
      </div>

      {/* Headline */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-1">Welcome to</h1>
        <h1 className="text-4xl font-bold text-amber-400 mb-4">Happy Hour Flower</h1>
        <p className="text-blue-200 text-base">Let's get you set up in under 90 seconds.</p>
      </div>

      {/* Role selector */}
      <div className="w-full max-w-sm">
        <p className="text-center text-blue-300 text-xs font-semibold tracking-widest uppercase mb-4">
          I am a...
        </p>

        {/* Explorer path */}
        <Link
          to="/register?role=user"
          className="flex items-center gap-4 w-full rounded-2xl border border-amber-500/50 bg-blue-900/40 p-4 mb-4 hover:bg-blue-800/50 transition-colors group"
        >
          <div className="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
            🍹
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-lg leading-tight">Happy Hour Explorer</p>
            <p className="text-blue-200 text-sm mt-0.5 leading-snug">
              I want to find the best happy hours near me, save my favorites, and get deals first.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Venue owner path */}
        <Link
          to="/register?role=venue_owner"
          className="flex items-center gap-4 w-full rounded-2xl border border-blue-500/40 bg-blue-900/40 p-4 mb-8 hover:bg-blue-800/50 transition-colors group"
        >
          <div className="w-14 h-14 rounded-xl bg-blue-700 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
            🏢
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-lg leading-tight">Venue / Bar Owner</p>
            <p className="text-blue-200 text-sm mt-0.5 leading-snug">
              I want to list my happy hours, manage specials, and reach local customers.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-blue-300 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Sign in — prominent for returning users */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full rounded-2xl border border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold px-6 py-3.5 transition-colors"
        >
          I already have an account — Sign in
        </Link>

        {/* Explore — auth-aware: routes to login (returnTo=/explore) if signed out, straight to Explore if signed in */}
        <AuthAwareCTA
          to="/explore"
          className="flex items-center justify-center gap-2 w-full rounded-2xl text-blue-200 hover:text-white font-medium px-6 py-3 mt-3 transition-colors disabled:opacity-60"
        >
          Just browsing? Explore happy hours
        </AuthAwareCTA>

        {/* Legal */}
        <p className="text-center text-blue-300/50 text-xs mt-6">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-blue-200">Terms</Link>
          {" & "}
          <Link to="/privacy" className="underline hover:text-blue-200">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}