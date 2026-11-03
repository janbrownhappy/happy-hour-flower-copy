import { useState } from "react";
import { Check, ListChecks } from "lucide-react";
import { CONSUMER_PREMIUM } from "@/lib/pricing";
import AuthAwareCTA from "@/components/AuthAwareCTA";
import SitePlanFeaturesDialog from "@/components/site/SitePlanFeaturesDialog";

const PREMIUM_FULL_FEATURES = [
  { title: "Everything in Free, plus:" },
  { title: "Unlimited personal must-visit lists" },
  { title: "ZIP code-specific text alerts" },
  { title: "Exclusive premium specials" },
  { title: "Direct messaging to businesses" },
  { title: "Direct messaging to administrators" },
  { title: "Advanced date-range filtering" },
  { title: "Fan Favorites access" },
  { title: "Enhanced AI recommendations" },
  { title: "Early access to new features" },
  { title: "Ad-free experience" },
  { title: "Premium badge" },
  { title: "Add quick notes to saved venues" },
  { title: "Calendar sync: Apple, Google, Outlook" },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    tagline: "Everything you need to find happy hour.",
    features: [
      "Browse all venues & deals",
      "Search & map",
      "Save favorite spots",
      "Leave reviews",
    ],
    cta: "Start Exploring",
    highlight: false,
  },
  {
    name: "Premium",
    price: CONSUMER_PREMIUM.monthly.display,
    annual: `or ${CONSUMER_PREMIUM.annual.display}`,
    tagline: "Never miss a deal near you.",
    features: [
      "Everything in Free",
      "Deal alerts for your areas",
      "Premium-only exclusive deals",
      "Unlimited favorites & crew sharing",
      "Early access to new features",
    ],
    cta: "Go Premium",
    highlight: true,
    showFullList: true,
  },
];

export default function SiteConsumerPricingTiers() {
  const [openPlan, setOpenPlan] = useState(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`rounded-2xl p-7 flex flex-col bg-white relative ${
            tier.highlight ? "border-2 border-amber-500 shadow-lg" : "border border-gray-200"
          }`}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-7 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              Most popular
            </span>
          )}
          <h3 className="font-heading font-bold text-xl text-gray-900">{tier.name}</h3>
          <div className="mt-3 mb-1">
            <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
            {tier.cadence && <span className="text-gray-500 text-sm ml-1">{tier.cadence}</span>}
          </div>
          {tier.annual && <p className="text-gray-500 text-sm">{tier.annual}</p>}
          <p className="text-gray-600 text-sm mt-3 mb-5">{tier.tagline}</p>

          <ul className="space-y-3 flex-1 mb-6">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-gray-700 text-sm">
                <Check className={`w-5 h-5 shrink-0 mt-0.5 ${tier.highlight ? "text-amber-500" : "text-green-500"}`} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <AuthAwareCTA
            to="/explore"
            className={`w-full justify-center text-center font-bold px-6 py-3.5 rounded-2xl transition-colors disabled:opacity-60 inline-flex items-center gap-2 ${
              tier.highlight
                ? "bg-amber-500 hover:bg-amber-400 text-white shadow"
                : "border border-gray-300 hover:border-amber-400 text-gray-800"
            }`}
          >
            {tier.cta}
          </AuthAwareCTA>

          {tier.showFullList && (
            <button
              type="button"
              onClick={() => setOpenPlan(tier.name)}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-500 transition-colors"
            >
              <ListChecks className="w-4 h-4" />
              See the full list
            </button>
          )}
        </div>
      ))}

      <SitePlanFeaturesDialog
        open={openPlan === "Premium"}
        onOpenChange={(v) => !v && setOpenPlan(null)}
        planName="Premium"
        features={PREMIUM_FULL_FEATURES}
      />
    </div>
  );
}