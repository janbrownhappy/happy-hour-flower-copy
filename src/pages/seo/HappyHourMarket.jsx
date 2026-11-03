import { useParams } from 'react-router-dom';
import usePageSeo from '@/lib/usePageSeo';
import useSeoMarket from '@/hooks/useSeoMarket';
import SeoPageHero from '@/components/site/SeoPageHero';
import SeoLinkGrid from '@/components/seo/SeoLinkGrid';
import SeoVenueList from '@/components/seo/SeoVenueList';
import SeoNotFound from '@/components/seo/SeoNotFound';
import { DAYS, slugify, siteUrl } from '@/lib/seoLanding';

export default function HappyHourMarket() {
  const { market: slug } = useParams();
  const { loading, market, areas, count } = useSeoMarket(slug);
  const name = market?.market_name || '';
  usePageSeo({
    title: `Best Happy Hours in ${name}, ${market?.state_code || ''} | Happy Hour Flower`,
    description: `${count || 0} venues with happy hour deals in ${name}. Browse by neighborhood or day.`,
    url: siteUrl(`/happy-hour/${slug}`),
    faqs: [{ q: `How many happy hours are in ${name}?`, a: `Happy Hour Flower lists ${count || 0} venues in ${name}.` }],
  });
  if (loading) return null;
  if (!market) return <SeoNotFound />;
  const base = `/happy-hour/${slug}`;
  return (
    <div>
      <SeoPageHero eyebrow={`${name}, ${market.state_code}`} title={`Happy hours in ${name}`} intro={`${count} venues with happy hour deals across ${areas.length} neighborhoods.`} cta={{ to: '/register', label: 'Find deals near me' }} />
      <SeoLinkGrid title="Happy hour by day" links={DAYS.map(d => ({ to: `${base}/${d.slug}`, label: `${d.name} happy hour` }))} />
      <SeoLinkGrid title="Neighborhoods" links={areas.map(a => ({ to: `${base}/area/${slugify(a.area_name)}`, label: a.area_name }))} />
      <SeoVenueList title={`Top-rated happy hours in ${name}`} query={{ market_id: market.market_id }} emptyText="No venues listed yet." />
    </div>
  );
}