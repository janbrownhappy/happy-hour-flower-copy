import { lazy } from 'react';

// A lazily-loaded page chunk can fail to fetch when the preview/deploy rebuilt
// between page load and navigation (the old hashed URL no longer exists, or the
// dev server is still rebuilding). Retry the fetch a few times with a short
// backoff, then reload the app once so the fresh module map is picked up.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function lazyWithRetry(importer) {
  return lazy(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const mod = await importer();
        sessionStorage.removeItem('chunk-reload-attempted');
        return mod;
      } catch {
        await wait(600 * (attempt + 1));
      }
    }

    // Still failing — the module map itself is stale. Reload once.
    const key = 'chunk-reload-attempted';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
      // Never resolves — the page is reloading.
      return new Promise(() => {});
    }
    sessionStorage.removeItem(key);
    // Final attempt so the real error surfaces in the error boundary.
    return importer();
  });
}