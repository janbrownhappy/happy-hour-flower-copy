import * as amplitude from '@amplitude/analytics-browser';
import { getAnalyticsConfig } from '@/functions/getAnalyticsConfig';

// Centralized Amplitude service. All app code goes through these helpers —
// never call the Amplitude SDK directly elsewhere. Failures never throw.
const BLOCKED = /(email|phone|dob|birth|lat$|lng$|latitude|longitude|address|password|token|redemption|card)/i;
let readyPromise = null;
const fired = new Set();

function clean(props = {}) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (BLOCKED.test(k) || v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

export function initializeAnalytics() {
  if (readyPromise) return readyPromise;
  // Start Amplitude only after the page has loaded and the browser is idle; early events wait in line.
  const afterLoad = new Promise((resolve) => {
    const idle = () => (window.requestIdleCallback ? requestIdleCallback(resolve, { timeout: 4000 }) : setTimeout(resolve, 2000));
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  });
  readyPromise = afterLoad.then(() => getAnalyticsConfig({}))
    .then(({ data }) => {
      if (!data?.amplitude_api_key) return false;
      // Session Replay is turned off for performance.
      return amplitude.init(data.amplitude_api_key, { autocapture: false, defaultTracking: false }).promise
        .then(() => true);
    })
    .catch(() => false);
  return readyPromise;
}

const whenReady = (fn) => initializeAnalytics().then((ok) => { if (ok) fn(); }).catch(() => {});

export function trackEvent(name, props) {
  whenReady(() => amplitude.track(name, clean(props)));
}

// Track and wait (max timeoutMs) for delivery — used right before a redirect.
export function trackEventAndWait(name, props, timeoutMs = 800) {
  const sent = initializeAnalytics()
    .then((ok) => (ok ? amplitude.track(name, clean(props)).promise : null))
    .catch(() => null);
  return Promise.race([sent, new Promise((r) => setTimeout(r, timeoutMs))]);
}

// Fire an event at most once per page lifetime for a given key (guards against re-renders).
export function trackOnce(key, name, props) {
  if (fired.has(key)) return;
  fired.add(key);
  trackEvent(name, props);
}

export function setUserProperties(props) {
  whenReady(() => {
    const id = new amplitude.Identify();
    Object.entries(clean(props)).forEach(([k, v]) => id.set(k, v));
    amplitude.identify(id);
  });
}

export function identifyUser(userId, props) {
  whenReady(() => {
    if (amplitude.getUserId() !== userId) amplitude.setUserId(userId);
  });
  if (props) setUserProperties(props);
}

export function resetUser() {
  fired.clear();
  whenReady(() => amplitude.reset());
}

export function getDeviceId() {
  try { return amplitude.getDeviceId() || ''; } catch (_) { return ''; }
}

export function trackRevenue({ productId, price, revenueType }) {
  whenReady(() => {
    const r = new amplitude.Revenue().setProductId(productId).setPrice(Number(price) || 0);
    if (revenueType) r.setRevenueType(revenueType);
    amplitude.revenue(r);
  });
}