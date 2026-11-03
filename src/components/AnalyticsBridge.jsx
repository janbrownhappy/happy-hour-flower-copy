import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { initializeAnalytics, identifyUser, trackOnce } from '@/lib/analytics';
import { creditEvent, getStoredTouch } from '@/lib/attributionClient';

// Initializes Amplitude, identifies the user (user.id only) and attaches stored QR attribution.
export default function AnalyticsBridge({ user }) {
  const lastId = useRef(null);

  useEffect(() => {
    initializeAnalytics();
    trackOnce('app_opened', 'app_opened');
  }, []);

  useEffect(() => {
    if (!user?.id || lastId.current === user.id) return;
    lastId.current = user.id;
    const isVenue = user.role === 'venue_owner';
    (async () => {
      const isNew = Date.now() - new Date(user.created_date).getTime() < 24 * 60 * 60 * 1000;
      const signupKey = `hhf_signup_tracked_${user.id}`;
      const needsSignup = isNew && !localStorage.getItem(signupKey);
      const attr = getStoredTouch() || needsSignup ? await creditEvent(needsSignup ? 'signup' : 'touch') : null;
      const profile = (await base44.entities.Profile.filter({ created_by_id: user.id }).catch(() => []))[0];
      const loc = profile?.location_preferences || {};
      const props = {
        user_type: isVenue ? 'venue' : user.role === 'admin' ? 'admin' : 'consumer',
        signup_date: user.created_date?.slice(0, 10),
        market: loc.market_name || loc.market, city: loc.city, state: loc.state_code,
        subscription_tier: profile?.subscription_tier || 'free', subscription_status: profile?.subscription_status,
        location_permission: profile?.location_services_enabled ? 'granted' : 'unknown',
        notification_permission: typeof Notification !== 'undefined' ? Notification.permission : undefined,
        ...(attr || {}),
      };
      identifyUser(user.id, props);
      if (needsSignup) {
        localStorage.setItem(signupKey, '1');
        trackOnce(signupKey, isVenue ? 'venue_signup_completed' : 'consumer_signup_completed', attr || {});
      }
    })().catch(() => {});
  }, [user?.id]);

  return null;
}