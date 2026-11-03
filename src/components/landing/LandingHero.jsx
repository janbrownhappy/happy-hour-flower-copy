import { Button } from "@/components/ui/button";

const LOGO_URL = "https://media.base44.com/images/public/6a1cac8c2b2302908a57d02a/1f2f11c0e_Untitled1024x1024px512x512px256x256px.gif";

export default function LandingHero({ onPreRegister }) {
  return (
    <section className="flex flex-col items-center justify-center px-4 pt-20 pb-12 text-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-4 leading-tight">
        Your City's Best<br />
        <span className="text-amber-400">Happy Hours</span>, Found.
      </h1>
      <p className="text-gray-300 text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
        Discover real-time drink deals, food specials, and happy hour schedules at bars and restaurants near you in Greenville, SC.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onPreRegister}
          className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg"
        >
          🍹 Get Early Access — Free
        </Button>
      </div>
      <p className="text-gray-500 text-sm mt-5">No credit card required · Greenville, SC · Expanding soon</p>
    </section>
  );
}