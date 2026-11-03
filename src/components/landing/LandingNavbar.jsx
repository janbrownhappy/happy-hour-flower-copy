import { Button } from "@/components/ui/button";

const LOGO_URL = "https://media.base44.com/images/public/6a1cac8c2b2302908a57d02a/1f2f11c0e_Untitled1024x1024px512x512px256x256px.gif";

export default function LandingNavbar() {
  const scrollToSignup = () => {
    document.getElementById('waitlist-signup')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">Happy Hour Flower</span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={scrollToSignup} className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-4 py-2 rounded-xl">
            Get Early Access
          </Button>
        </div>
      </div>
    </nav>
  );
}