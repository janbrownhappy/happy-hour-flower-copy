import { base44 } from '@/api/base44Client';

let cached = null;

// Fetches public-safe app config once per page load.
export function getClientConfig() {
  if (!cached) {
    cached = base44.functions.invoke('getClientConfig', {})
      .then((res) => res.data)
      .catch(() => { cached = null; return { disabled_features: [], settings: {}, venue_overrides: {} }; });
  }
  return cached;
}