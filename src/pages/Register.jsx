import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, MapPin, Cake } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import { toast } from "@/components/ui/use-toast";
import { setVenueOwnerRole } from "@/functions/setVenueOwnerRole";
import { meetsMinimumAge, MIN_AGE } from "@/lib/ageVerification";
import { safeReturnTo } from "@/lib/authReturnTo";
import { trackEventOnce as trackRybbitOnce } from "@/lib/rybbit";

export default function Register() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role"); // "user" or "venue_owner"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zipCode, setZipCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAlreadyRegistered(false);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!dateOfBirth) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!meetsMinimumAge(dateOfBirth)) {
      setError(`You must be at least ${MIN_AGE} years old to use this app.`);
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered") || msg.includes("in use")) {
        setAlreadyRegistered(true);
      } else {
        setError(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Already-registered user re-entering their email? If they already have a
      // complete profile, skip onboarding entirely and send them into the app.
      const me = await base44.auth.me().catch(() => null);
      if (me?.id) trackRybbitOnce(`account_created_${me.id}`, 'account_created', { method: 'email' });
      let existingProfiles = [];
      if (me) {
        existingProfiles = await base44.entities.Profile.filter({ created_by_id: me.id }).catch(() => []);
        // Fallback: some accounts have a profile keyed by email rather than created_by_id
        if (existingProfiles.length === 0 && me.email) {
          existingProfiles = await base44.entities.Profile.filter({ email: me.email }).catch(() => []);
        }
      }
      const existingProfile = existingProfiles[0];
      const hasCompleteProfile = existingProfile?.zip_code && existingProfile.zip_code.trim();

      // Resume a pending flow (e.g. AI-assistant OAuth consent) after sign-up
      if (new URLSearchParams(window.location.search).get("returnTo")) {
        window.location.href = safeReturnTo();
        return;
      }
      if (me?.role === "admin") {
        window.location.href = "/admin";
        return;
      }
      if (me?.role === "venue_owner") {
        window.location.href = "/venue-owner";
        return;
      }
      if (hasCompleteProfile) {
        // Returning consumer with a finished profile — no re-onboarding.
        window.location.href = "/explore";
        return;
      }

      if (roleParam === "venue_owner") {
        // Store date of birth for legal age-verification before redirecting
        await base44.entities.Profile.create({ date_of_birth: dateOfBirth }).catch(() => {});
        // Set the role to venue_owner before redirecting so App.jsx doesn't treat them as a consumer
        await setVenueOwnerRole({}).catch(() => {});
        window.location.href = "/onboarding/venue";
      } else {
        // Show the profile step to collect name + zip before entering app
        setShowOtp(false);
        setShowProfile(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both your first and last name.");
      return;
    }
    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    try {
      await base44.auth.updateMe({ full_name: fullName });
      await base44.entities.Profile.create({
        display_name: fullName,
        zip_code: zipCode,
        date_of_birth: dateOfBirth,
      });
      window.location.href = "/onboarding/profile";
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  if (showProfile) {
    return (
      <AuthLayout
        icon={UserPlus}
        title="Almost there!"
        subtitle="Just a couple more details to personalize your experience"
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                autoFocus
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip Code</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="zipCode"
                type="text"
                placeholder="29601"
                maxLength={10}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">We use this to show you happy hours near you.</p>
          </div>
          <Button
            type="submit"
            className="w-full h-12 font-medium"
            disabled={loading || !firstName.trim() || !lastName.trim() || !zipCode.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Let's Go! 🌸"
            )}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SocialAuthButtons checkRoleRedirect />

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {alreadyRegistered && (
        <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <p className="font-medium text-foreground mb-1">You're already registered 🌸</p>
          <p className="text-muted-foreground mb-3">
            An account with <span className="font-medium text-foreground">{email}</span> already exists. Just sign in to continue.
          </p>
          <Link to="/login">
            <Button type="button" className="w-full h-11 font-medium">
              Sign In Instead
            </Button>
          </Link>
        </div>
      )}

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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <div className="relative">
            <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="dob"
              type="date"
              autoComplete="bday"
              max={new Date().toISOString().split("T")[0]}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You must be {MIN_AGE} or older. We advertise alcohol-related deals, so age verification is required by law.
          </p>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <a
            href="https://happyhourflower.com/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="text-primary font-medium hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </AuthLayout>
  );
}