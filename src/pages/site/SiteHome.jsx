import SiteJourneyPicker from "@/components/site/SiteJourneyPicker";
import SiteAppShowcase from "@/components/site/SiteAppShowcase";
import SiteHomeFaq from "@/components/site/SiteHomeFaq";
import AuthAwareCTA from "@/components/AuthAwareCTA";
import LeadConnectorChatWidget from "@/components/site/LeadConnectorChatWidget";

export default function SiteHome() {
  return (
    <div>
      {/* Hero banner */}
      <section className="bg-gradient-to-b from-amber-50 to-white">
        <h1 className="sr-only">Find Happy Hours Near You in Greenville SC</h1>
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-4 text-center">
          <a
            href="https://prelaunch.happyhourflower.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/aa0cf3715_hero-banner.webp"
              width={1024} height={341} loading="eager" fetchpriority="high" decoding="async"
              alt="Find your happy place — food & drink specials found fast. The app is free."
              className="w-full rounded-2xl shadow-lg hover:opacity-95 transition-opacity"
            />
          </a>
        </div>
      </section>

      <SiteJourneyPicker />
      <SiteAppShowcase heading="How do I find happy hour deals near me?" />
      <SiteHomeFaq />
      <LeadConnectorChatWidget />
    </div>
  );
}