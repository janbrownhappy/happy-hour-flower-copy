import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";

// Simple inline SVG icons for providers without lucide equivalents
const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.42.07 2.4.83 3.23.85.98-.19 1.93-.99 3.27-.84 1.67.19 2.92.93 3.7 2.36-3.4 1.98-2.86 6.47.78 7.76-.47 1.19-1.06 2.38-2.98 2.73zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.4 2H2v9.4h9.4V2zm10.6 0h-9.4v9.4H22V2zm-10.6 10.6H2V22h9.4v-9.4zm10.6 0h-9.4V22H22v-9.4z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function SocialAuthButtons({ redirectTo = "/", checkRoleRedirect = false }) {
  const handleSocialLogin = async (provider) => {
    if (checkRoleRedirect) {
      // For login, we route through a check page that handles role-based routing.
      // Forward any returnTo from the current URL so social login honors the
      // marketing-site CTA destination too.
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const authCheckDest = returnTo
        ? `/auth-check?returnTo=${encodeURIComponent(returnTo)}`
        : "/auth-check";
      base44.auth.loginWithProvider(provider, authCheckDest);
    } else {
      base44.auth.loginWithProvider(provider, redirectTo);
    }
  };

  return (
    <div className="space-y-3 mb-6">
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium"
        onClick={() => handleSocialLogin("google")}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium"
        onClick={() => handleSocialLogin("apple")}
      >
        <AppleIcon />
        <span className="ml-2">Continue with Apple</span>
      </Button>

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium"
        onClick={() => handleSocialLogin("microsoft")}
      >
        <MicrosoftIcon />
        <span className="ml-2">Continue with Microsoft</span>
      </Button>

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium text-[#1877F2] border-[#1877F2]/30 hover:bg-[#1877F2]/5"
        onClick={() => handleSocialLogin("facebook")}
      >
        <FacebookIcon />
        <span className="ml-2">Continue with Facebook</span>
      </Button>
    </div>
  );
}