import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Star } from "lucide-react";

export default function LandingVenues() {
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    base44.entities.Venue.filter({ status: "active", is_featured: true }, "-created_date", 3)
      .then(setVenues)
      .catch(() => {
        base44.entities.Venue.list("-created_date", 3).then(setVenues).catch(() => {});
      });
  }, []);

  if (venues.length === 0) return null;

  return (
    <section className="py-12 px-4 bg-gray-900">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-white mb-3">Featured Venues</h2>
          <p className="text-gray-400 text-lg">A taste of what's waiting for you inside the app.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div key={venue.id} className="group bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
              <div className="h-40 bg-gradient-to-br from-amber-500/20 to-blue-900/30 flex items-center justify-center text-5xl overflow-hidden">
                {venue.photo_urls?.[0]
                  ? <img src={venue.photo_urls[0]} alt={venue.name} className="w-full h-full object-cover" />
                  : "🌸"}
              </div>
              <div className="p-4">
                <h3 className="text-white font-bold text-base mb-1 group-hover:text-amber-400 transition-colors">{venue.name}</h3>
                <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{venue.address || venue.neighborhood}</span>
                </div>
                {venue.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{venue.rating?.toFixed(1)}</span>
                  </div>
                )}
                {venue.happy_hour_start && (
                  <p className="text-amber-300 text-xs mt-1 font-medium">
                    🍹 {venue.happy_hour_start} – {venue.happy_hour_end}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}