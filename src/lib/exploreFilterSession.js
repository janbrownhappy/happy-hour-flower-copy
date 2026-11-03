// Keeps the Explore page's selected filters alive for the browser session, so
// navigating into a venue detail page and back doesn't reset them.
const KEY = 'exploreFilters';

export function loadExploreFilters() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveExploreFilters(state) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — filters just won't persist
  }
}

export function clearExploreFilters() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}