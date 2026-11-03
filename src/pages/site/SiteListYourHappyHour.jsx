import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { VENUE_PREMIUM } from "@/lib/pricing";
import usePageSeo from "@/lib/usePageSeo";
import SeoPageHero from "@/components/site/SeoPageHero";
import SeoQuestion from "@/components/site/SeoQuestion";
import SeoBottomCta from "@/components/site/SeoBottomCta";

const STEPS = [
  "Search for your venue on the claim page.",
  "Claim it and verify you own or manage it.",
  "Add your happy hour days, times, and specials.",
  "Add photos and a short description.",
  "Save. Your listing shows in the app and on the map.",
];
const FREE = ["One active happy hour listing.", "Your name, address, hours, and contact info.", "Up to 3 photos.", "A spot on the map and in search."];
const PREMIUM = [
  "Featured placement in search and a premium map pin.",
  "Unlimited listings and photos.",
  "Real-time updates and recurring schedules.",
  "A dashboard with views, saves, and weekly reports.",
  "Push notification credits and premium-only deals.",
];
const CLOSING = "Free gets you listed. Premium helps you compete.";

const FAQS = [
  { q: "How do I list my Greenville bar's happy hour?", a: STEPS.map((s, i) => `${i + 1}. ${s}`).join(" ") },
  { q: "What does it cost?", a: `A basic listing is free and stays free. Premium is $${VENUE_PREMIUM.monthly.price.toFixed(2)} a month for venues that want more visibility.` },
  { q: "What does a free listing include?", a: FREE.join(" ") },
  { q: "What does Premium add?", a: `${PREMIUM.join(" ")} ${CLOSING}` },
  { q: "How do I update my specials?", a: "Log in and edit your listing. Free listings update monthly. Premium updates go live in real time, so you can post a slow-Wednesday special at 3pm." },
  { q: "Which Greenville areas do you cover?", a: "Downtown, the West End, Augusta Road, Greer, and Simpsonville." },
];

const Bullets = ({ items }) => (
  <ul className="list-disc pl-6 space-y-2">{items.map((t) => <li key={t}>{t}</li>)}</ul>
);

export default function SiteListYourHappyHour() {
  usePageSeo({
    title: "How to List Your Greenville Bar's Happy Hour | Happy Hour Flower",
    description: "List your Greenville happy hour for free in about ten minutes. Add your times and specials and reach people deciding where to go tonight.",
    url: "https://happyhourflower.com/site/venues/list-your-happy-hour",
    faqs: FAQS,
  });
  return (
    <div>
      <SeoPageHero
        eyebrow="For Venues"
        title="How to list your Greenville bar's happy hour"
        intro="A free listing on Happy Hour Flower puts your specials in front of people in Greenville who are deciding where to go right now. It takes about ten minutes."
        cta={{ to: "/claim-venue", label: "Claim your venue" }}
      />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <SeoQuestion q={FAQS[0].q}>
          <ol className="list-decimal pl-6 space-y-2">{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
        </SeoQuestion>
        <SeoQuestion q={FAQS[1].q}><p>{FAQS[1].a}</p></SeoQuestion>
        <SeoQuestion q={FAQS[2].q}><Bullets items={FREE} /></SeoQuestion>
        <SeoQuestion q={FAQS[3].q}>
          <Bullets items={PREMIUM} />
          <p className="font-bold text-gray-900">{CLOSING}</p>
          <Link to="/site/pricing/venues" className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:gap-2 transition-all">
            See pricing <ChevronRight className="w-4 h-4" />
          </Link>
        </SeoQuestion>
        <SeoQuestion q={FAQS[4].q}><p>{FAQS[4].a}</p></SeoQuestion>
        <SeoQuestion q={FAQS[5].q}><p>{FAQS[5].a}</p></SeoQuestion>
      </div>
      <SeoBottomCta to="/claim-venue" label="List your happy hour free" />
    </div>
  );
}