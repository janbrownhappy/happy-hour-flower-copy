import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ORIGIN = 'https://happyhourflower.com';
const NOINDEX = ['/admin', '/portal', '/onboarding', '/login', '/register', '/forgot-password', '/reset-password', '/oauth', '/auth-check', '/profile', '/settings', '/favorites', '/venue-owner', '/VenueOwnerHome', '/venue-ads', '/financial-overview', '/action-items', '/prd-download', '/WalletDesigner', '/StaffRedeem', '/nfc-unlock', '/claim-thank-you', '/blog/rss.xml'];
const PUBLIC = ['/', '/site/consumers', '/site/venues', '/site/venues/list-your-happy-hour', '/site/happy-hour-flower-vs-yelp-google-maps', '/site/pricing', '/site/pricing/consumers', '/site/pricing/venues', '/blog', '/greenville-neighborhoods', '/preregister', '/claim-venue', '/terms', '/privacy', '/cookies'];
const ALIAS = { '/LandingPage': '/', '/site': '/', '/site/landing': '/', '/plans': '/site/pricing', '/plans/consumer': '/site/pricing/consumers', '/plans/venue': '/site/pricing/venues' };

const setTag = (selector, create, apply) => {
  let el = document.head.querySelector(selector);
  if (!apply) { el?.remove(); return; }
  if (!el) { el = create(); document.head.appendChild(el); }
  apply(el);
};

// Per-route robots meta + canonical link.
export default function SeoHead() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
    const noindex = NOINDEX.some((p) => path === p || path.startsWith(p + '/'));
    const canonical = noindex ? null : ALIAS[path] ?? (PUBLIC.includes(path) || path.startsWith('/blog/') ? path : null);
    setTag('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }),
      noindex && ((el) => el.setAttribute('content', 'noindex, nofollow')));
    setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      canonical && ((el) => el.setAttribute('href', ORIGIN + canonical)));
  }, [pathname]);
  return null;
}