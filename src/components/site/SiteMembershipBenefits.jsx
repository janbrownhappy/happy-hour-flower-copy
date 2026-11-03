import { Check, Sparkles } from "lucide-react";
import AuthAwareCTA from "@/components/AuthAwareCTA";

const FREE = [
  "Browse happy hours near you",
  "Save your favorite spots",
  "Live map of nearby deals",
  "Ask locals for recommendations",
];

const PREMIUM = [
  "Early access to exclusive deals",
  "Deal alerts for your neighborhoods",
  "Share check-ins with your crew",
  "Wallet passes for one-tap redemption",
];

export default function SiteMembershipBenefits() {
  return (
    <section className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-2">
            Membership
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
            Why become a member
          </h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Join free in seconds — then upgrade any time to unlock premium perks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col">
            <h3 className="font-heading font-bold text-xl text-gray-900">Free Member</h3>
            <p className="text-gray-500 text-sm mt-1 mb-5">Everything you need to find happy hour.</p>
            <ul className="space-y-3 flex-1">
              {FREE.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-2xl border-2 border-amber-400 p-7 flex flex-col relative shadow-lg">
            <span className="absolute -top-3 left-7 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Premium
            </span>
            <h3 className="font-heading font-bold text-xl text-gray-900">Premium Member</h3>
            <p className="text-gray-500 text-sm mt-1 mb-5">Everything in Free, plus:</p>
            <ul className="space-y-3 flex-1">
              {PREMIUM.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-gray-700">
                  <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-10">
          <AuthAwareCTA
            to="/explore"
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            Join Free
          </AuthAwareCTA>
        </div>
      </div>
    </section>
  );
}