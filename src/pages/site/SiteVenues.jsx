import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import SiteVenueBenefitsGrid from "@/components/site/SiteVenueBenefitsGrid";
import SiteVenuePlanMatrix from "@/components/site/SiteVenuePlanMatrix";
import SiteOwnerDashboardShowcase from "@/components/site/SiteOwnerDashboardShowcase";
import SiteVenueFAQ from "@/components/site/SiteVenueFAQ";

export default function SiteVenues() {
  return (
    <div>
      <section className="bg-gradient-to-br from-rose-50 via-amber-50 to-teal-50">
        <div className="max-w-6xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-white/70 text-gray-800 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 shadow-sm">
              For Venues
            </span>
            <h1 className="font-heading text-5xl sm:text-6xl font-bold text-gray-900 leading-[1.05] mb-6">
              Promote Your Happy Hour Specials to{" "}
              <span className="bg-gradient-to-r from-red-500 via-amber-500 to-teal-500 bg-clip-text text-transparent">
                Customers Already Looking
              </span>
              .
            </h1>
            <p className="text-gray-600 text-lg max-w-lg mb-8">
              Restaurant owners, bar owners, brewery teams, lounge managers — Happy Hour Flower puts your specials in front of nearby Greenville deal-seekers, when it matters most.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register?role=venue_owner"
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                List Your Venue
              </Link>
              <Link
                to="/portal"
                className="border border-gray-300 hover:border-gray-400 text-gray-800 font-semibold text-lg px-8 py-4 rounded-2xl transition-colors inline-flex items-center justify-center gap-2"
              >
                Claim an Existing Listing
              </Link>
            </div>
          </div>
          <img
            src="https://happyhourflower.info/assets/venue-bar-Ca-bc-uT.jpg"
            alt="Bartender pouring a craft cocktail in a Greenville bar"
            className="w-full rounded-3xl shadow-xl"
          />
        </div>
      </section>

      <SiteVenueBenefitsGrid />
      <SiteVenuePlanMatrix />
      <SiteOwnerDashboardShowcase />
      <SiteVenueFAQ />

      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Link
          to="/register?role=venue_owner"
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors inline-flex items-center gap-2"
        >
          List Your Venue
        </Link>
        <div className="mt-8">
          <Link to="/site/venues/list-your-happy-hour" className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:gap-2 transition-all">
            List your happy hour <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="mt-4">
          <Link to="/site/consumers" className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:gap-2 transition-all">
            See what consumers experience <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}