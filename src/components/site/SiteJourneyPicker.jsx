import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function SiteJourneyPicker() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-6 pb-16">
      <div className="text-center mb-8">
        <p className="inline-block bg-amber-500/10 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Live in Greenville, SC
        </p>
        <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
          Venue owner or Consumer?
        </h2>
        <p className="text-gray-600 text-lg">Choose the journey that fits you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consumers */}
        <Link
          to="/site/consumers"
          className="group rounded-3xl border border-gray-200 overflow-hidden hover:border-amber-300 hover:shadow-xl transition-all bg-white"
        >
          <img
            src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/3261dd747_consumer-tile.webp"
            width={900} height={506} loading="eager" fetchpriority="high" decoding="async"
            alt="Consumer"
            className="h-40 w-full object-cover"
          />
          <div className="p-7">
            <p className="text-amber-600 font-semibold text-sm mb-1">For Consumers</p>
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">Find Happy Hours Near You</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Discover nearby food and drink specials, save favorite spots, and get pinged when a great deal pops up around the corner.
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
              <li>· Live Greenville happy hour map</li>
              <li>· Deal alerts near you</li>
              <li>· Premium perks &amp; early access</li>
            </ul>
            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold group-hover:gap-2 transition-all">
              Explore Consumer Options <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </Link>

        {/* Venues */}
        <Link
          to="/site/venues"
          className="group rounded-3xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all bg-white"
        >
          <img
            src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/25871678d_venues-tile.webp"
            width={900} height={506} loading="lazy" decoding="async"
            alt="Venues"
            className="h-40 w-full object-cover"
          />
          <div className="p-7">
            <p className="text-blue-600 font-semibold text-sm mb-1">For Venues</p>
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">How do Greenville bars and restaurants get more customers?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Bars, restaurants, breweries, and lounges — put your specials in front of deal-seekers searching for their next happy place.
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
              <li>· Free basic listing</li>
              <li>· Reach nearby customers</li>
              <li>· Premium featured placement</li>
            </ul>
            <span className="inline-flex items-center gap-1 text-blue-600 font-semibold group-hover:gap-2 transition-all">
              Explore Venue Options <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      </div>

      <p className="text-center text-gray-500 text-sm mt-8">
        Not sure? <Link to="/site/consumers" className="text-amber-600 hover:underline">See what's inside the app</Link>.
      </p>
    </section>
  );
}