import { useParams } from 'react-router-dom';
import usePageSeo from '@/lib/usePageSeo';
import useSeoMarket from '@/hooks/useSeoMarket';
import SeoPageHero from '@/components/site/SeoPageHero';
import SeoLinkGrid from '@/components/seo/SeoLinkGrid';
import SeoVenueList from '@/components/seo/SeoVenueList';
import SeoNotFound from '@/components/seo/SeoNotFound';
import { slugify, siteUrl } from '@/lib/seoLanding';

export default function HappyHourArea() {
  const { market: slug, area: areaSlug } = useParams();
  const { loading, market, areas } = useSeoMarket(slug);
  const area = areas?.find(a => slugify(a.area_name) === areaSlug);
  const label = area ? `${area.area_name}, ${market.market_name}` : '';
  usePageSeo({
    title: `Happy Hours in ${label} | Happy Hour Flower`,
    description: `Happy hour times and specials at venues in ${label}.`,
    url: siteUrl(`/happy-hour/${slug}/area/${areaSlug}`),
    faqs: [{ q: `Where is happy hour in ${label}?`, a: `See the venues and specials listed for ${label} on this page.` }],
  });
  if (loading) return null;
  if (!area) return <SeoNotFound />;
  const others = areas.filter(a => a.id !== area.id);
  return (
    <div>
      <SeoPageHero eyebrow={market.market_name} title={`Happy hours in ${area.area_name}`} intro={`Deals and specials at venues in ${label}.`} cta={{ to: `/happy-hour/${slug}`, label: `All of ${market.market_name}` }} />
      <SeoVenueList title={`${area.area_name} happy hour spots`} query={{ area_id: area.id }} emptyText="No venues listed in this neighborhood yet." />
      <SeoLinkGrid title={`More ${market.market_name} neighborhoods`} links={others.map(a => ({ to: `/happy-hour/${slug}/area/${slugify(a.area_name)}`, label: a.area_name }))} />
    </div>
  );
}