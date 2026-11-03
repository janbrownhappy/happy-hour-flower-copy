import { Compass } from "lucide-react";
import SiteAppShowcase from "@/components/site/SiteAppShowcase";
import SiteConsumerShortcut from "@/components/site/SiteConsumerShortcut";
import SiteGreenvilleSpecials from "@/components/site/SiteGreenvilleSpecials";
import SiteMembershipBenefits from "@/components/site/SiteMembershipBenefits";
import SiteComparisonMatrix from "@/components/site/SiteComparisonMatrix";
import SiteFeatureWalkthrough from "@/components/site/SiteFeatureWalkthrough";
import SiteAmenitiesShowcase from "@/components/site/SiteAmenitiesShowcase";
import AuthAwareCTA from "@/components/AuthAwareCTA";

export default function SiteConsumers() {
  return (
    <div>
      <section className="bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="text-center md:text-left">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-3">For Consumers</p>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Find Greenville Happy Hour Deals Before You Go Out
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto md:mx-0 mb-8">
              Locals and visitors — discover nearby food and drink specials, save your favorite spots, and get deals first.
            </p>
            <AuthAwareCTA
              to="/explore"
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              <Compass className="w-5 h-5" /> Start Exploring
            </AuthAwareCTA>
          </div>
          <img
            src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/c644a10ef_CleanShot2026-09-06at124915.png"
            alt="Friends enjoying happy hour on a rooftop with a $5 craft cocktails deal alert"
            className="w-full rounded-2xl shadow-lg"
          />
        </div>
      </section>

      <SiteConsumerShortcut />

      <SiteGreenvilleSpecials />

      <SiteFeatureWalkthrough />
      <SiteAppShowcase />
      <SiteAmenitiesShowcase />
      <SiteMembershipBenefits />
      <SiteComparisonMatrix />
    </div>
  );
}