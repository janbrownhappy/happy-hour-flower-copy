import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import usePageSeo from '@/lib/usePageSeo';
import SeoPageHero from '@/components/site/SeoPageHero';
import SeoLinkGrid from '@/components/seo/SeoLinkGrid';
import { marketSlug, siteUrl, isSeoEnabled } from '@/lib/seoLanding';

export default function HappyHourIndex() {
  const [markets, setMarkets] = useState([]);
  useEffect(() => {
    base44.entities.LocationMarket.filter({ is_active: true }, { sort: 'display_order', limit: 100 }).then(p => setMarkets(p.items.filter(isSeoEnabled)));
  }, []);
  const names = markets.map(m => m.market_name).join(', ');
  usePageSeo({
    title: 'Happy Hours by City | Happy Hour Flower',
    description: `Find happy hour deals in ${names || 'your city'}.`,
    url: siteUrl('/happy-hour'),
    faqs: [{ q: 'Which cities does Happy Hour Flower cover?', a: names || 'See the list of markets on this page.' }],
  });
  return (
    <div>
      <SeoPageHero eyebrow="Happy hour guide" title="Happy hours near you" intro="Pick your city to see today's deals, neighborhoods and specials." />
      <SeoLinkGrid title="Markets" links={markets.map(m => ({ to: `/happy-hour/${marketSlug(m.market_id)}`, label: `${m.market_name}, ${m.state_code}` }))} />
    </div>
  );
}