import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Shield } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      const user = await base44.auth.me();
      
      // CRITICAL: Block admin users from standard login - they must use admin portal
      if (user?.role === 'admin') {
        await base44.auth.logout();
        setError("Admin users must log in via the secure admin portal (/admin/login)");
        setLoading(false);
        return;
      }
      
      sessionStorage.setItem('hh_login_event', '1');
      // Honor an explicit returnTo (e.g. a marketing-site CTA), else fall back
      // to role-based defaults.
      const returnTo = safeReturnTo();
      // Attach any approved venue claims made with this email (portal claims are anonymous).
      const link = await base44.functions.invoke('linkApprovedClaims', {}).catch(() => null);
      if (link?.data?.isOwner && (returnTo === "/" || returnTo === "/explore")) {
        window.location.href = link.data.venueId ? `/venue-dashboard/${link.data.venueId}` : "/venue-owner";
      } else if (returnTo && returnTo !== "/") {
        window.location.href = returnTo;
      } else if (user?.role === 'venue_owner') {
        const venues = await base44.entities.Venue.filter({ owner_id: user.id }).catch(() => []);
        window.location.href = venues.length > 0 ? "/venue-owner" : "/onboarding/venue";
      } else {
        window.location.href = "/explore";
      }
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <SocialAuthButtons redirectTo="/explore" checkRoleRedirect={true} />

      {/* Admin security notice */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <strong className="font-semibold">Admin users:</strong> For enhanced security, you must log in via the{" "}
          <Link to="/admin/login" className="underline font-semibold hover:text-amber-900">
            secure admin portal
          </Link>{" "}
          with two-factor authentication.
        </div>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}