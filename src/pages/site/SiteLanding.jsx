import { Compass, MapPin } from "lucide-react";
import SiteVenueHighlights from "@/components/site/SiteVenueHighlights";
import AuthAwareCTA from "@/components/AuthAwareCTA";

const HERO_IMAGE = "https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/d5b16b7bc_generated_image.png";

export default function SiteLanding() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Happy hour at a stylish bar"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative max-w-4xl mx-auto px-4 py-28 sm:py-36 text-center text-white">
          <h1 className="font-heading text-4xl sm:text-6xl font-bold mb-5 leading-tight">
            Your city's happy hours,<br />
            <span className="text-amber-400">all in one place.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-9">
            Discover nearby food and drink specials, save your favorite spots, and never miss a deal — free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AuthAwareCTA
              to="/explore"
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              <Compass className="w-5 h-5" /> Open the App
            </AuthAwareCTA>
            <AuthAwareCTA
              to="/map"
              className="bg-white/10 backdrop-blur border border-white/30 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              <MapPin className="w-5 h-5" /> View the Map
            </AuthAwareCTA>
          </div>
        </div>
      </section>

      {/* Venue highlights */}
      <SiteVenueHighlights />

      {/* Closing call-to-action into the app */}
      <section className="bg-gradient-to-br from-amber-500 to-amber-600">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Ready to find your happy place?
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Join for free and start exploring happy hours near you in seconds.
          </p>
          <AuthAwareCTA
            to="/explore"
            className="bg-white text-amber-600 hover:bg-amber-50 font-bold text-lg px-10 py-4 rounded-2xl shadow-xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Compass className="w-5 h-5" /> Get Started — It's Free
          </AuthAwareCTA>
        </div>
      </section>
    </div>
  );
}