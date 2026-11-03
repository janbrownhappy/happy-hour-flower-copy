import usePageSeo from "@/lib/usePageSeo";
import SeoPageHero from "@/components/site/SeoPageHero";
import SeoQuestion from "@/components/site/SeoQuestion";
import SeoBottomCta from "@/components/site/SeoBottomCta";
import CompetitorTable from "@/components/site/CompetitorTable";

const FAQS = [
  { q: "What's the best app to find happy hour in Greenville?", a: "Happy Hour Flower. It lists every happy hour running near you with the deal, the end time, and the distance. Open it at 4pm and see what's on." },
  { q: "Is there an alternative to Yelp for happy hours?", a: "Yes. Yelp is built around reviews. Happy Hour Flower is built around deals and timing, so you don't have to dig through reviews to find out if a special is still running." },
  { q: "How does Google Maps compare for happy hours?", a: "Google Maps shows regular hours. Happy hour windows are often missing or out of date. Happy Hour Flower venues update their own specials." },
  { q: "Can I get alerts?", a: "Yes. Save your favorite spots and turn on deal alerts. We'll ping you before a happy hour ends." },
];

export default function SiteCompareApps() {
  usePageSeo({
    title: "Happy Hour Flower vs Yelp vs Google Maps for Greenville Happy Hours",
    description: "Yelp and Google Maps list venues. Happy Hour Flower shows which Greenville happy hours are running right now, with the deal and the cutoff time.",
    url: "https://happyhourflower.com/site/happy-hour-flower-vs-yelp-google-maps",
    faqs: FAQS,
  });
  return (
    <div>
      <SeoPageHero
        eyebrow="For Consumers"
        title="Happy Hour Flower vs. Yelp vs. Google Maps for Greenville happy hours"
        intro="Yelp and Google Maps are good for finding a place. Happy Hour Flower is built for one question: what's running near me right now?"
      />
      <div className="max-w-4xl mx-auto px-4 pt-12"><CompetitorTable /></div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {FAQS.map((f) => <SeoQuestion key={f.q} q={f.q}><p>{f.a}</p></SeoQuestion>)}
      </div>
      <SeoBottomCta to="/welcome" label="Get the app" />
    </div>
  );
}