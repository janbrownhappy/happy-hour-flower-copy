import { useState } from "react";
import { Link } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingMap from "@/components/landing/LandingMap";
import LandingVenues from "@/components/landing/LandingVenues";
import LandingAmenities from "@/components/landing/LandingAmenities";
import LandingContact from "@/components/landing/LandingContact";
import PreRegisterModal from "@/components/landing/PreRegisterModal";
import ComingSoonBanner from "@/components/landing/ComingSoonBanner";
import FreeForeverBanner from "@/components/landing/FreeForeverBanner";
import WaitlistSignup from "@/components/landing/WaitlistSignup";

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950">
      <LandingNavbar />
      <ComingSoonBanner onPreRegister={() => setShowModal(true)} />
      <LandingHero onPreRegister={() => setShowModal(true)} />
      <FreeForeverBanner />
      <LandingFeatures onPreRegister={() => setShowModal(true)} />
      <LandingMap />
      <LandingVenues />
      <LandingAmenities />
      <WaitlistSignup />
      <LandingContact />
      <footer className="bg-gray-950 border-t border-gray-800 py-6 text-center text-gray-500 text-sm space-y-2">
        <div>© {new Date().getFullYear()} Happy Hour Flower · Greenville, SC</div>
        <div className="flex items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/cookies" className="hover:text-gray-300 transition-colors">Cookie Policy</Link>
        </div>
      </footer>
      {showModal && <PreRegisterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}