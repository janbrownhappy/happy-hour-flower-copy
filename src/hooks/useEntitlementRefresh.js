import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const getEntitlements = (payload) => base44.functions.invoke('getEntitlements', payload);

// Re-checks RevenueCat access: on demand, on ?purchase=success, and when the
// app returns to the foreground after a Safari checkout. Polls every 3s for up
// to 30s until `isUnlocked(result)` is true.
export default function useEntitlementRefresh({ venueId, isUnlocked, onResult }) {
  const [activating, setActivating] = useState(false);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const timer = useRef(null);
  const cbs = useRef({ isUnlocked, onResult });
  cbs.current = { isUnlocked, onResult };

  const check = useCallback(async () => {
    const { data } = await getEntitlements(venueId ? { venue_id: venueId } : {});
    cbs.current.onResult?.(data);
    return data;
  }, [venueId]);

  const poll = useCallback(() => {
    clearInterval(timer.current);
    setActivating(true);
    const started = Date.now();
    const tick = async () => {
      const data = await check().catch(() => null);
      if ((data && cbs.current.isUnlocked(data)) || Date.now() - started > 30000) {
        clearInterval(timer.current);
        setActivating(false);
        if (data && cbs.current.isUnlocked(data)) setAwaitingReturn(false);
      }
    };
    tick();
    timer.current = setInterval(tick, 3000);
  }, [check]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('purchase') === 'success') poll();
    else check().catch(() => {});
    return () => clearInterval(timer.current);
  }, [check, poll]);

  useEffect(() => {
    if (!awaitingReturn) return;
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', poll);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', poll);
    };
  }, [awaitingReturn, poll]);

  return { activating, awaitingReturn, setAwaitingReturn, refresh: poll };
}