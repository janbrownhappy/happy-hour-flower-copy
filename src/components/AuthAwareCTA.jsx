import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

/**
 * A marketing-site call-to-action that leads to an app surface.
 *
 * Behaves like a normal clickable element, but resolves its destination based
 * on auth state:
 *  - loading auth  -> disabled, subtle spinner, waits for auth to settle
 *  - no user       -> navigates to /login?returnTo=<destination>
 *  - user present  -> navigates directly to <destination>
 *
 * `to` is the intended app path, including any params (e.g. "/venue/123").
 * Styling is entirely up to the caller via `className` / `children`, so the
 * resting state looks identical to a plain link/button.
 */
export default function AuthAwareCTA({ to, className, children, ...props }) {
  const { user, isLoadingAuth, authChecked } = useAuth();
  const navigate = useNavigate();
  const resolving = isLoadingAuth || !authChecked;

  const handleClick = () => {
    if (resolving) return;
    if (user) {
      navigate(to);
    } else {
      navigate(`/login?returnTo=${encodeURIComponent(to)}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={resolving}
      aria-busy={resolving}
      className={className}
      {...props}
    >
      {resolving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}