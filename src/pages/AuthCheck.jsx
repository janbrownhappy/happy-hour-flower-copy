import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { safeReturnTo } from '@/lib/authReturnTo';
import { trackEventOnce } from '@/lib/rybbit';

export default function AuthCheck() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const user = await base44.auth.me();
        const urlParams = new URLSearchParams(window.location.search);
        const isNewUser = urlParams.get('is_new_user') === 'true';
        if (isNewUser && user?.id) trackEventOnce(`account_created_${user.id}`, 'account_created', { method: 'google' });

        // Honor an explicit returnTo (e.g. a marketing-site CTA) for social login too.
        const returnTo = safeReturnTo();
        if (returnTo && returnTo !== '/') {
          window.location.href = returnTo;
          return;
        }

        if (user?.role === 'venue_owner') {
          // Check if they have venues yet
          const venues = await base44.entities.Venue.filter({ owner_id: user.id }).catch(() => []);
          window.location.href = venues.length > 0 ? '/venue-owner' : '/onboarding/venue';
        } else if (isNewUser) {
          window.location.href = '/onboarding/profile';
        } else {
          window.location.href = '/explore';
        }
      } catch (error) {
        navigate('/login');
      }
    };

    checkRole();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
}