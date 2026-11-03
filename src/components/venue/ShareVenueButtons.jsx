import { useState } from 'react';
import { Facebook, Link2, Check, Share2 } from 'lucide-react';

/**
 * Compact public share row for a venue page.
 * Uses the Web Share API when available (native sheet on mobile) and always
 * offers direct Facebook / X links plus copy-to-clipboard as fallbacks.
 */
export default function ShareVenueButtons({ venue, deals = [] }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const hours = venue.happy_hour_start && venue.happy_hour_end
    ? ` ${venue.happy_hour_start}–${venue.happy_hour_end}`
    : '';
  const dealLine = deals.filter(d => d?.trim()).slice(0, 2).join(' · ');
  const text = `🌸 Happy Hour at ${venue.name}!${hours}${dealLine ? ` — ${dealLine}` : ''}`;

  const copy = async () => {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: venue.name, text, url });
        return;
      } catch (_) { /* cancelled — fall through to copy */ }
    }
    copy();
  };

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  // Pinterest pins need an image — use the venue's first photo when it has one.
  const pinMedia = venue.photo_urls?.filter(Boolean)?.[0];
  const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}${pinMedia ? `&media=${encodeURIComponent(pinMedia)}` : ''}`;

  return (
    <div>
      <h2 className="font-semibold mb-2 flex items-center gap-2">
        <Share2 className="w-4 h-4 text-primary" /> Share this happy hour
      </h2>
      <div className="flex gap-2 flex-wrap">
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1877F2] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Facebook className="w-4 h-4" /> Facebook
        </a>
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </a>
        <a
          href={pinterestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E60023] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
          </svg>
          Pinterest
        </a>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors"
        >
          {copied ? <><Check className="w-4 h-4 text-emerald-600" /> Copied</> : <><Link2 className="w-4 h-4" /> Copy link</>}
        </button>
        <button
          onClick={nativeShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors sm:hidden"
        >
          <Share2 className="w-4 h-4" /> More
        </button>
      </div>
    </div>
  );
}