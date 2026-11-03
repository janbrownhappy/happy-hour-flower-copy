import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ListChecks } from "lucide-react";
import { VENUE_PREMIUM, VENUE_PLATINUM, VENUE_PLATINUM_PLUS } from "@/lib/pricing";
import SitePlanFeaturesDialog from "@/components/site/SitePlanFeaturesDialog";

const PREMIUM_FULL_FEATURES = [
  { title: "Unlimited Active Happy Hour Listings", desc: "Post as many happy hour specials as you want — no caps, no waiting." },
  { title: "Unlimited Photo Uploads", desc: "Upload unlimited photos per listing. Free tier is capped at 2 photos." },
  { title: "Extended Descriptions (1,000 chars)", desc: "Tell your full story with rich 1,000-character listing descriptions. Free tier is 200 chars." },
  { title: "Real-Time Listing Updates", desc: "Edit and update your specials instantly — changes go live without admin re-review." },
  { title: "Advanced Recurring Event Scheduling", desc: "Set up complex recurring schedules — weekly, biweekly, or your own patterns up to 90 days out." },
  { title: "Featured Placement in Search", desc: "Your venue appears at the top of search results and the Home feed under \"Featured.\"" },
  { title: "Exclusive Specials for Premium Users", desc: "Tag deals as \"Premium Exclusive\" — only visible to premium consumers, driving more upgrades." },
  { title: "Direct Messaging with Customers", desc: "Reply to customer questions and build relationships directly through the app." },
  { title: "Comprehensive Analytics Dashboard", desc: "See click-throughs, saves, profile views, and peak engagement times broken down by day." },
  { title: "Weekly Performance Reports", desc: "Automated weekly email summaries of your venue's reach, clicks, and trending specials." },
  { title: "Enhanced Map Presence", desc: "Your pin stands out on the map with a premium gold styling and animated badge." },
  { title: "Promotional Push Notification Credits", desc: "Send 10 targeted push alerts per month to nearby users when your happy hour starts." },
  { title: "Priority Listing Approval (2-hour review)", desc: "New and edited listings skip the queue and are reviewed within 2 hours." },
  { title: "Your Own Tags and Categories", desc: "Create your own tags and categories to precisely describe your venue and specials." },
  { title: "Event Calendar Integration", desc: "Sync your specials and events directly to the in-app Community Calendar." },
  { title: "Competitor Insights", desc: "See anonymized data on what specials are trending in your area and when competitors run deals." },
  { title: "Premium Business Badge", desc: "Stand out with a verified gold badge on your listing — builds trust and drives more clicks." },
  { title: "Priority Support (4-hour response)", desc: "Skip the queue — get answers from our business support team within 4 hours." },
  { title: "Social Media Sharing Tools", desc: "One-tap sharing to Instagram, Facebook, and X with auto-generated branded graphics." },
];

const PLATINUM_FULL_FEATURES = [
  { title: "Apple Wallet / Google Wallet pass support", desc: "Give guests a branded pass they can save directly to their phone's native wallet app. No app download required — your venue lives in their pocket alongside their boarding passes and loyalty cards." },
  { title: "Digital coupon passes for happy hour offers", desc: "Deliver happy hour deals as scannable digital passes that guests save to their wallet. Redemption is fast, trackable, and eliminates the need for paper coupons or promo codes." },
  { title: "Buy-one-get-one wallet passes", desc: "Issue BOGO offers as wallet passes guests can pull up at the bar in seconds. Staff verify and redeem with a simple scan, keeping lines moving and the experience frictionless." },
  { title: "Limited-time wallet pass offers", desc: "Create passes with built-in expiration dates to drive urgency around time-sensitive promotions. The pass updates automatically when the offer expires, so guests always see current status." },
  { title: "One-time-use wallet pass coupons", desc: "Issue passes that deactivate after a single redemption, preventing sharing or reuse. Each coupon is unique, giving you clean data on who redeemed and when." },
  { title: "Pass redemption tracking", desc: "See exactly how many passes were scanned, when, and by which campaign. Redemption data flows into your reporting dashboard so you can measure offer performance without guesswork." },
  { title: "Ability to update wallet passes after they are saved", desc: "Edit the content of a pass — offer details, expiration, location info — after guests have already saved it. Updates push automatically to every saved copy without requiring guests to re-download." },
  { title: "Push updates to saved wallet passes", desc: "Send a notification directly to guests who have your pass saved, prompting them to check an updated offer or reminder. It's a direct channel to engaged guests who have already opted in." },
  { title: "Venue follower offer broadcasts", desc: "Send instant offer alerts to every user who has followed or favorited your venue in the app. This is your highest-intent audience — people who chose to stay connected to you." },
  { title: "Higher monthly push notification allowance", desc: "Platinum venues receive a larger monthly push notification quota, giving you more opportunities to reach guests throughout the month without hitting a cap mid-campaign." },
  { title: "Premium placement in \"Near Me Now\"", desc: "Your venue appears at or near the top of the \"Near Me Now\" feed when users are in your area during happy hour. Position matters — top placement drives significantly higher click-through." },
  { title: "Priority placement in \"Happening Nearby\"", desc: "Your active offers surface first in the \"Happening Nearby\" feed, giving you a consistent edge over non-Platinum venues during peak discovery windows." },
  { title: "QR code generation for wallet passes", desc: "Generate print-ready QR codes that link directly to your wallet pass, so guests can save your offer from any physical or digital touchpoint — not just the app." },
  { title: "Wallet pass download reporting", desc: "Monitor how many guests saved your pass, broken down by campaign, date, and offer type. Download volume is a leading indicator of redemption intent." },
  { title: "Wallet pass redemption reporting", desc: "Track every scan — time, date, location, and campaign source — so you can connect offer redemptions directly to foot traffic and revenue impact." },
  { title: "Platinum Venue badge", desc: "A visible Platinum badge appears on your venue profile and listings, signaling to users that your venue is a premium, active partner. Trust and credibility drive clicks." },
  { title: "Homepage or discovery screen feature placement", desc: "Your venue is periodically featured on the app's homepage or main discovery screen, putting you in front of all active users — not just those searching nearby." },
  { title: "Featured placement in curated lists", desc: "Your venue is included in editorially curated lists (\"Best Happy Hours,\" \"Top Picks This Week,\" etc.), giving you exposure to high-intent users browsing for recommendations." },
  { title: "Social media feature eligibility", desc: "Platinum venues are eligible to be featured across the app's social media channels, extending your reach to the broader audience outside the app and driving new followers to your profile." },
];

const PLATINUM_PLUS_FULL_FEATURES = [
  { title: "Geofencing campaigns around the venue", desc: "Draw a virtual boundary around your venue and automatically trigger marketing messages when users enter the zone. Set the radius, schedule the campaign, and let proximity do the work." },
  { title: "Proximity-based alerts", desc: "When users are near the venue, send real-time notifications to app users as they approach your venue, surfacing your happy hour offer at exactly the right moment. No manual timing required — alerts fire automatically based on location." },
  { title: "Beacon support for in-venue or near-entrance engagement", desc: "Place low-energy Bluetooth beacons inside or just outside your venue to trigger hyper-precise engagement at the door or bar. Ideal for welcome messages, drink specials, or loyalty check-ins." },
  { title: "Location-triggered wallet pass reminders", desc: "When a pass holder enters your venue's geofence, their saved pass surfaces automatically on their lock screen. The right offer appears at the right place without the guest having to search for it." },
  { title: "Featured placement in geofence-triggered discovery", desc: "When a user enters your geofence, your venue is featured prominently in the discovery results they see. You're not competing with the full list — you're leading it." },
  { title: "Branded QR Coasters", desc: "100 branded drink coasters with a special QR code for the venue." },
  { title: "Tent Cards", desc: "100 branded table tent cards with a QR code for the venue." },
];

const FULL_FEATURES = {
  Premium: PREMIUM_FULL_FEATURES,
  Platinum: PLATINUM_FULL_FEATURES,
  "Platinum Plus": PLATINUM_PLUS_FULL_FEATURES,
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    tagline: "Get on the map at no cost.",
    features: [
      "Basic venue listing",
      "Set happy hours & deals",
      "Appear in search & map",
      "Receive customer reviews",
    ],
    cta: "List for Free",
    highlight: false,
  },
  {
    name: "Premium",
    price: VENUE_PREMIUM.monthly.display,
    annual: `or ${VENUE_PREMIUM.annual.display}`,
    tagline: "Stand out and understand your customers.",
    features: [
      "Everything in Free",
      "Featured placement",
      "Performance analytics",
      "Weekly performance reports",
      "Premium-only deals",
    ],
    cta: "Start with Premium",
    highlight: true,
    showFullList: true,
  },
  {
    name: "Platinum",
    price: VENUE_PLATINUM.monthly.display,
    annual: `or ${VENUE_PLATINUM.annual.display}`,
    tagline: "Maximum reach and proximity marketing.",
    features: [
      "Everything in Premium",
      "Competitor insights",
      "Wallet passes & loyalty",
      "Beacon & geofencing add-on eligible",
      "Priority support",
    ],
    cta: "Go Platinum",
    highlight: false,
    showFullList: true,
  },
  {
    name: "Platinum Plus",
    price: VENUE_PLATINUM_PLUS.monthly.display,
    annual: `or ${VENUE_PLATINUM_PLUS.annual.display}`,
    note: `+ one-time ${VENUE_PLATINUM_PLUS.setupFee.display} setup & installation fee`,
    tagline: "Full proximity suite, done for you.",
    features: [
      "Competitor insights",
      "Beacon & GeoFencing",
      "Priority Plus support",
      "2 Free Beacons",
      "Branded QR Coasters",
    ],
    cta: "Contact Sales",
    highlight: false,
    showFullList: true,
  },
];

export default function SitePricingTiers() {
  const [openPlan, setOpenPlan] = useState(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`rounded-2xl p-7 flex flex-col bg-white relative ${
            tier.highlight ? "border-2 border-blue-500 shadow-lg" : "border border-gray-200"
          }`}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-7 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Most popular
            </span>
          )}
          <h3 className="font-heading font-bold text-xl text-gray-900">{tier.name}</h3>
          <div className="mt-3 mb-1">
            <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
            {tier.cadence && <span className="text-gray-500 text-sm ml-1">{tier.cadence}</span>}
          </div>
          {tier.annual && <p className="text-gray-500 text-sm">{tier.annual}</p>}
          {tier.note && <p className="text-gray-500 text-xs mt-1">{tier.note}</p>}
          <p className="text-gray-600 text-sm mt-3 mb-5">{tier.tagline}</p>

          <ul className="space-y-3 flex-1 mb-6">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-gray-700 text-sm">
                <Check className={`w-5 h-5 shrink-0 mt-0.5 ${tier.highlight ? "text-blue-500" : "text-green-500"}`} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/register?role=venue_owner"
            className={`w-full text-center font-bold px-6 py-3.5 rounded-2xl transition-colors ${
              tier.highlight
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow"
                : "border border-gray-300 hover:border-blue-400 text-gray-800"
            }`}
          >
            {tier.cta}
          </Link>

          {tier.showFullList && (
            <button
              type="button"
              onClick={() => setOpenPlan(tier.name)}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ListChecks className="w-4 h-4" />
              See the full list
            </button>
          )}
        </div>
      ))}

      <SitePlanFeaturesDialog
        open={!!openPlan}
        onOpenChange={(v) => !v && setOpenPlan(null)}
        planName={openPlan}
        features={FULL_FEATURES[openPlan] || []}
      />
    </div>
  );
}