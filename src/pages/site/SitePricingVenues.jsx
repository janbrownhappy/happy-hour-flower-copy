import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import SitePricingTiers from "@/components/site/SitePricingTiers";

export default function SitePricingVenues() {
  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Venue Pricing</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Plans that grow with your venue
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Start free and get on the map today. Upgrade any time to reach more locals and see exactly what's driving visits.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16 -mt-6">
        <SitePricingTiers />
        <p className="text-center text-gray-500 text-sm mt-8">
          Annual billing saves you roughly two months versus paying monthly. Cancel any time.
        </p>
      </section>

      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Ready to fill your slow hours?
          </h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Get your venue in front of local deal-seekers in minutes.
          </p>
          <Link
            to="/register?role=venue_owner"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors inline-flex items-center gap-2"
          >
            List Your Venue
          </Link>
          <div className="mt-8">
            <Link to="/site/pricing/consumers" className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:gap-2 transition-all">
              Just looking for deals? See consumer pricing <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}