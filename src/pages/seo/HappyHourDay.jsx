import { useParams } from 'react-router-dom';
import usePageSeo from '@/lib/usePageSeo';
import useSeoMarket from '@/hooks/useSeoMarket';
import SeoPageHero from '@/components/site/SeoPageHero';
import SeoLinkGrid from '@/components/seo/SeoLinkGrid';
import SeoVenueList from '@/components/seo/SeoVenueList';
import SeoNotFound from '@/components/seo/SeoNotFound';
import { DAYS, findDay, siteUrl } from '@/lib/seoLanding';

export default function HappyHourDay() {
  const { market: slug, day: daySlug } = useParams();
  const { loading, market } = useSeoMarket(slug);
  const day = findDay(daySlug);
  const name = market?.market_name || '';
  usePageSeo({
    title: `${day?.name || ''} Happy Hours in ${name} | Happy Hour Flower`,
    description: `Every ${day?.name || ''} happy hour special in ${name}.`,
    url: siteUrl(`/happy-hour/${slug}/${daySlug}`),
    faqs: [{ q: `Where is happy hour on ${day?.name || ''} in ${name}?`, a: `See the ${day?.name || ''} specials listed for ${name} on this page.` }],
  });
  if (loading) return null;
  if (!market || !day) return <SeoNotFound />;
  return (
    <div>
      <SeoPageHero eyebrow={name} title={`${day.name} happy hours in ${name}`} intro={`Specials running on ${day.name}s at venues across ${name}.`} cta={{ to: `/happy-hour/${slug}`, label: `All of ${name}` }} />
      <SeoVenueList title={`${day.name} specials`} query={{ market_id: market.market_id }} dayKey={day.key} emptyText="No venues listed yet." />
      <SeoLinkGrid title="Other days" links={DAYS.filter(d => d.key !== day.key).map(d => ({ to: `/happy-hour/${slug}/${d.slug}`, label: d.name }))} />
    </div>
  );
}