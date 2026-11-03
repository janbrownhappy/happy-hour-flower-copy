// RevenueCat web checkout links. Purchases always open in a new window so the
// Despia native app hands them off to Safari (no native IAP commands).

export const isDespia = () =>
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('despia');

const withPackage = (url, packageId) =>
  packageId ? `${url}?package_id=${encodeURIComponent(packageId)}` : url;

export const consumerCheckoutUrl = (userId, packageId) =>
  withPackage(`https://pay.rev.cat/dggpxdkmubuomxgh/${encodeURIComponent(userId)}`, packageId);

export const venueCheckoutUrl = (venueId, packageId) =>
  withPackage(`https://pay.rev.cat/zvjafumdtirhzghr/${encodeURIComponent('venue_' + venueId)}`, packageId);

export const openExternal = (url) => window.open(url, '_blank');

export const CONSUMER_PACKAGES = { monthly: '$rc_monthly', annual: '$rc_annual', weekend: 'weekend_pass' };

export const VENUE_PACKAGES = {
  'venue-premium': { monthly: '$rc_monthly', annual: '$rc_annual' },
  'venue-platinum': { monthly: 'platinum_monthly', annual: 'platinum_annual' },
  'venue-platinum-plus': { monthly: 'platinum_plus_monthly', annual: 'platinum_plus_annual' },
};