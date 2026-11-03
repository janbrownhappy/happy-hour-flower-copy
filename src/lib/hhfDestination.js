// Client-side HHF destination builder for already-validated ids (e.g. OneSignal deep links).
// QR routing validates on the server via base44/shared/hhfDestination.ts.
export function resolveHHFDestination(type, id, extra = {}) {
  switch (type) {
    case 'venue': return id ? `/venue/${id}` : '/explore';
    case 'special': return extra.venueId ? `/venue/${extra.venueId}?special=${id}` : '/explore';
    case 'event': return extra.venueId ? `/venue/${extra.venueId}?event=${id}` : '/explore';
    case 'consumer_premium': return '/plans/consumer';
    case 'venue_premium': return '/plans/venue';
    case 'signup': return '/register';
    case 'onboarding': return '/onboarding';
    default: return '/explore';
  }
}