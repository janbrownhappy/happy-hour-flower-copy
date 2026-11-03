import { Outlet } from "react-router-dom";
import SiteNavbar from "@/components/site/SiteNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import SiteBreadcrumbs from "@/components/site/SiteBreadcrumbs";

/**
 * Public marketing-site shell. Distinct from the authenticated app <Layout>:
 * no bottom nav, no app chrome — a desktop-first marketing layout. Every CTA
 * into an app surface uses AuthAwareCTA so signed-out visitors are routed
 * through login (with returnTo) and signed-in users go straight in.
 */
export default function SiteLayout() {
  return (
    <div className="force-light min-h-screen flex flex-col bg-white text-foreground">
      <SiteNavbar />
      <main className="flex-1 pt-16">
        <SiteBreadcrumbs />
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}