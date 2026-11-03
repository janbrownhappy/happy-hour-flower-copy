import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Tracks app opens, logins, and time spent in the app.
// Creates one AppSession record per app load and updates its duration as the
// user spends time in the app (on tab hide/close and periodically).
export default function useSessionTracker(user) {
  useEffect(() => {
    let sessionId = null;
    let startMs = Date.now();
    let accumulatedSeconds = 0;
    let lastActiveMs = Date.now();
    let cancelled = false;

    // A login event is recorded when this load arrived from the auth flow.
    const isLoginEvent = new URLSearchParams(window.location.search).get('is_new_user') !== null
      || sessionStorage.getItem('hh_login_event') === '1';

    const create = async () => {
      try {
        const session = await base44.entities.AppSession.create({
          user_id: user?.id || '',
          user_email: user?.email || '',
          event_type: isLoginEvent ? 'login' : 'app_open',
          started_at: new Date().toISOString(),
          duration_seconds: 0,
          platform: navigator.userAgent || '',
        });
        if (cancelled) return;
        sessionId = session.id;
        sessionStorage.removeItem('hh_login_event');
      } catch {
        // Non-blocking — tracking failures must never break the app
      }
    };

    const flush = async () => {
      if (!sessionId) return;
      const now = Date.now();
      accumulatedSeconds += Math.round((now - lastActiveMs) / 1000);
      lastActiveMs = now;
      try {
        await base44.entities.AppSession.update(sessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: accumulatedSeconds,
        });
      } catch {
        // ignore
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      } else {
        lastActiveMs = Date.now();
      }
    };

    create();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flush);
    // Periodic flush so long sessions are captured even if the user never closes the tab
    const interval = setInterval(flush, 60000);

    return () => {
      cancelled = true;
      flush();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flush);
      clearInterval(interval);
    };
  }, [user?.id]);
}