import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import SiteConsumerPricingTiers from "@/components/site/SiteConsumerPricingTiers";

export default function SitePricingConsumers() {
  return (
    <div>
      <section className="bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-3">Consumer Pricing</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Free to explore. Premium to never miss a deal.
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Browsing happy hours is always free. Go Premium for deal alerts, exclusive specials, and more.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16 -mt-6">
        <SiteConsumerPricingTiers />
        <p className="text-center text-gray-500 text-sm mt-8">
          Annual billing saves you roughly two months versus paying monthly. Cancel any time.
        </p>
      </section>

      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Ready to find your next happy hour?
          </h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Jump into the app and see every Greenville special near you.
          </p>
          <div className="mt-2">
            <Link to="/site/pricing/venues" className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:gap-2 transition-all">
              Own a venue? See venue pricing <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}