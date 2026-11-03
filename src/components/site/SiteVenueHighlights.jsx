import { useEffect, useState } from "react";
import { MapPin, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AuthAwareCTA from "@/components/AuthAwareCTA";

/**
 * Marketing venue-highlights strip for the public landing page.
 * Shows a handful of real active venues (featured first), each linking into
 * the app via AuthAwareCTA. Falls back gracefully if none are loaded yet.
 */
export default function SiteVenueHighlights() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Venue.filter({ status: "active" }, "-is_featured", 6)
      .then((rows) => setVenues(rows || []))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-2">
            Featured Spots
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
            Venues loving happy hour
          </h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            A taste of the bars, restaurants and breweries serving up specials near you.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 h-64 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <p className="text-center text-gray-500">New venues are being added — check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="h-40 bg-amber-100 overflow-hidden">
                  {v.photo_urls?.[0] ? (
                    <img src={v.photo_urls[0]} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400 text-4xl">🍸</div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-bold text-lg text-gray-900 leading-tight">{v.name}</h3>
                    {v.rating ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 shrink-0">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        {Number(v.rating).toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  {v.city && (
                    <p className="text-sm text-gray-500 mt-1 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {v.city}
                    </p>
                  )}
                  {v.category && (
                    <span className="mt-3 self-start text-xs font-medium bg-amber-500/10 text-amber-700 px-2.5 py-1 rounded-full">
                      {v.category}
                    </span>
                  )}
                  <AuthAwareCTA
                    to={`/venue/${v.id}`}
                    className="mt-4 text-amber-600 font-semibold text-sm hover:text-amber-500 disabled:opacity-60 inline-flex items-center gap-1.5 self-start"
                  >
                    View deals →
                  </AuthAwareCTA>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <AuthAwareCTA
            to="/explore"
            className="border border-gray-300 hover:border-amber-400 text-gray-800 font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            Browse all venues
          </AuthAwareCTA>
        </div>
      </div>
    </section>
  );
}