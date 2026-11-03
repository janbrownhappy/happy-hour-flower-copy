// Rybbit custom events. Safe no-op when the Rybbit script is missing or blocked.
export function trackEvent(name, props) {
  try {
    if (typeof window !== 'undefined' && window.rybbit && typeof window.rybbit.event === 'function') {
      window.rybbit.event(name, props);
    }
  } catch {
    // never let analytics break the app
  }
}

// Fire at most once per browser for a given key (persists across reloads).
export function trackEventOnce(key, name, props) {
  try {
    const k = `rybbit_once_${key}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, '1');
  } catch {
    // storage unavailable — still track
  }
  trackEvent(name, props);
}