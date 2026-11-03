import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const LOGO_URL = "https://media.base44.com/images/public/6a1cac8c2b2302908a57d02a/1f2f11c0e_Untitled1024x1024px512x512px256x256px.gif";

const perks = [
  "Free listing on the Happy Hour Flower platform",
  "Real-time deal and schedule updates",
  "Reach thousands of local happy hour seekers",
  "Fan favorites, reviews, and loyalty tools",
  "Premium analytics and wallet pass campaigns",
  "Direct fan messaging (premium tier)",
  "Geofenced arrival welcomes & beacon coupons (Platinum)",
];

export default function LandingOwnerSection({ onPreRegister }) {
  return (
    <section className="py-24 px-4 bg-gray-900">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-blue-900/60 to-gray-800 rounded-3xl border border-blue-800/40 p-8 sm:p-12 flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={LOGO_URL} alt="HHF" className="w-10 h-10 rounded-xl object-cover" />
              <span className="text-amber-400 font-bold text-sm uppercase tracking-widest">For Venue Owners</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
              Put Your Happy Hour<br />
              <span className="text-amber-400">In Front of Local Crowds</span>
            </h2>
            <p className="text-gray-300 text-base mb-8 leading-relaxed">
              Join Greenville's dedicated happy hour platform. List your venue for free, update deals in real-time, and connect with the local crowd that's actively hunting for specials.
            </p>
            <ul className="space-y-2 mb-8">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-2 text-gray-200 text-sm">
                  <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onPreRegister} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-6 py-3 rounded-xl">
                🏢 Register My Venue
              </Button>
              <Link to="/register?role=venue_owner" className="flex items-center justify-center border border-gray-500 text-gray-200 hover:border-amber-400 hover:text-amber-400 font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                Create an Account
              </Link>
            </div>
          </div>
          <div className="w-full lg:w-64 flex-shrink-0 grid grid-cols-2 gap-3">
            {[
              { num: "50+", label: "Active Venues" },
              { num: "1,000+", label: "Happy Hour Seekers" },
              { num: "Free", label: "Base Listing" },
              { num: "GVL", label: "Focused Market" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-700/50 rounded-2xl p-4 text-center border border-gray-600">
                <p className="text-2xl font-extrabold text-amber-400">{s.num}</p>
                <p className="text-gray-300 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}