import { CONSUMER_PREMIUM, VENUE_PREMIUM } from "@/lib/pricing";

// Single source for the home page FAQ: the visible section and the JSON-LD both read from here.
export const HOME_FAQ = [
  { q: "Where are the best happy hour spots in Greenville SC?", a: "Greenville's happy hours cluster in Downtown, the West End, Augusta Road, and Greer, and the best one depends on the night and the time. Happy Hour Flower shows every deal running right now, with the cutoff time and distance, so you can pick the best one for tonight." },
  { q: "How do I find happy hour deals near me right now?", a: "Open Happy Hour Flower and it lists the happy hours running near you, sorted by distance. Each listing shows the deal, when it ends, and how far away it is." },
  { q: "Is Happy Hour Flower free?", a: `Yes, browsing deals, using the map, and saving favorite venues is free. Consumer Premium is an optional upgrade for $${CONSUMER_PREMIUM.monthly.price.toFixed(2)} a month.` },
  { q: "How does my bar or restaurant get listed?", a: "A basic listing is free and takes about ten minutes to set up. Add your happy hour times and specials and they appear in the app for nearby customers." },
  { q: "What does Premium add for venues?", a: `Premium gives venues featured placement, unlimited listings and photos, real-time updates, and an analytics dashboard. It is $${VENUE_PREMIUM.monthly.price.toFixed(2)} a month, and the free listing stays available.` },
  { q: "What areas does Happy Hour Flower cover?", a: "Happy Hour Flower launches in the Greenville, SC metro, including Downtown, the West End, Augusta Road, Greer, and Simpsonville. More Upstate areas will follow as venues are added." },
];

export const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://happyhourflower.com/#org",
      name: "Happy Hour Flower",
      legalName: "SpotcheX LLC",
      url: "https://happyhourflower.com",
      areaServed: { "@type": "City", name: "Greenville", containedInPlace: { "@type": "State", name: "South Carolina" } },
    },
    {
      "@type": "MobileApplication",
      "@id": "https://happyhourflower.com/#app",
      name: "Happy Hour Flower",
      description: "Find happy hour deals near you in Greenville, SC. See the deal, the time window, and how far away it is.",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "iOS, Android",
      publisher: { "@id": "https://happyhourflower.com/#org" },
      areaServed: "Greenville, SC",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Consumer Premium (monthly)", price: "4.99", priceCurrency: "USD" },
      ],
    },
    {
      "@type": "Service",
      name: "Happy Hour Flower venue listings",
      provider: { "@id": "https://happyhourflower.com/#org" },
      areaServed: "Greenville, SC",
      audience: { "@type": "BusinessAudience", audienceType: "Bars, restaurants, breweries, lounges" },
      offers: [
        { "@type": "Offer", name: "Free Business Listing", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Premium Business (monthly)", price: "49.90", priceCurrency: "USD" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: HOME_FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};