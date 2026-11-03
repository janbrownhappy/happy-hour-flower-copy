import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube } from "lucide-react";

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61589345499779", Icon: Facebook },
  { label: "Instagram", href: "https://www.instagram.com/happy.hour.flower", Icon: Instagram },
  { label: "YouTube", href: "https://www.youtube.com/@happyhourflower", Icon: Youtube },
  {
    label: "Pinterest",
    href: "https://www.pinterest.com/happyhrflower/",
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345c-.091.378-.293 1.194-.333 1.361-.052.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@happyhour.flower",
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .585.045.855.126V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white font-heading font-bold text-lg">Happy Hour Flower</div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link to="/site/consumers" className="hover:text-white transition-colors">For Consumers</Link>
            <Link to="/site/venues" className="hover:text-white transition-colors">For Venues</Link>
            <Link to="/happy-hour" className="hover:text-white transition-colors">Local Guides</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {SOCIALS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-amber-500 hover:text-white transition-colors"
            >
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Happy Hour Flower · Live in Greenville, SC
        </div>
      </div>
    </footer>
  );
}