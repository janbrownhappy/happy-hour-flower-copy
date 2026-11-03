import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

// Human-friendly labels for each marketing-site path.
const LABELS = {
  "/site": "Home",
  "/site/landing": "Overview",
  "/site/consumers": "For Consumers",
  "/site/venues": "For Venues",
  "/site/pricing": "Pricing",
  "/site/pricing/consumers": "Consumer Pricing",
  "/site/pricing/venues": "Venue Pricing",
  "/blog": "Blog",
  "/happy-hour": "Local Guides",
  "/portal": "Claim Your Listing",
  "/portal/claim": "Claim Venue",
  "/portal/add": "Add Your Business",
  "/portal/thank-you": "Thank You",
  "/portal/proof": "Upload Proof",
};

// Build the trail of ancestor paths for the current path.
function buildTrail(pathname) {
  const segments = pathname.split("/").filter(Boolean); // e.g. ["site","pricing","consumers"]
  const trail = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    trail.push(acc);
  }
  return trail;
}

export default function SiteBreadcrumbs() {
  const { pathname } = useLocation();

  // Home ("/" and "/site") shows no breadcrumbs.
  if (pathname === "/" || pathname === "/site") return null;

  const trail = buildTrail(pathname);

  const crumbs = [
    { path: "/", label: "Home" },
    ...trail
      .filter((p) => p !== "/site" && LABELS[p])
      .map((p) => ({ path: p, label: LABELS[p] })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="bg-gray-50 border-b border-gray-100">
      <ol className="max-w-6xl mx-auto px-4 py-3 flex items-center flex-wrap gap-1 text-sm text-gray-500">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              {isLast && i > 0 ? (
                <span className="font-semibold text-gray-900 inline-flex items-center gap-1">
                  {i === 0 && <Home className="w-3.5 h-3.5" />}
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="hover:text-amber-600 transition-colors inline-flex items-center gap-1"
                >
                  {i === 0 && <Home className="w-3.5 h-3.5" />}
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}