import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Facebook, Copy, Check, Megaphone, RefreshCw } from 'lucide-react';

const DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const FULL_TO_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

/** Collect [{ day, deals: [] }] from the venue's per-day deals (falling back to global deals). */
function dealsByDay(venue) {
  const short = d => FULL_TO_SHORT[d] || d;
  const map = {};
  Object.entries(venue.deals_by_day || {}).forEach(([d, deals]) => {
    const clean = (deals || []).filter(x => x?.trim());
    if (clean.length) map[short(d)] = clean;
  });
  if (!Object.keys(map).length) {
    const global = (venue.deals || []).filter(x => x?.trim());
    (venue.days || []).forEach(d => { if (global.length) map[short(d)] = global; });
  }
  return Object.entries(map).map(([day, deals]) => ({ day, deals }));
}

function buildPosts(venue) {
  const byDay = dealsByDay(venue);
  const hours = venue.happy_hour_start && venue.happy_hour_end
    ? `${venue.happy_hour_start}–${venue.happy_hour_end}`
    : null;
  const posts = [];

  if (byDay.length) {
    const d = byDay[0];
    posts.push({
      label: `${DAY_FULL[d.day] || d.day} spotlight`,
      text: `🍹 ${DAY_FULL[d.day] || d.day} happy hour at ${venue.name}${hours ? ` — ${hours}` : ''}!\n\n${d.deals.map(x => `• ${x}`).join('\n')}\n\nSee you at the bar. 🌸`,
    });
  }

  if (byDay.length > 1) {
    posts.push({
      label: 'Full week rundown',
      text: `📅 This week's happy hour lineup at ${venue.name}${hours ? ` (${hours})` : ''}:\n\n${byDay
        .map(d => `${DAY_FULL[d.day] || d.day}: ${d.deals.join(' · ')}`)
        .join('\n')}\n\nWhich night are you coming in? 🍻`,
    });
  }

  posts.push({
    label: 'Short & punchy',
    text: `Happy hour is on at ${venue.name}${hours ? ` — ${hours}` : ''}. ${
      byDay[0]?.deals?.[0] ? `Tonight: ${byDay[0].deals[0]}. ` : ''
    }Come thirsty. 🍹`,
  });

  posts.push({
    label: 'Find us on Happy Hour Flower',
    text: `We're listed on Happy Hour Flower! 🌸 Find ${venue.name}'s happy hour times${
      hours ? ` (${hours})` : ''
    }, deals and specials — plus every other great happy hour in town.`,
  });

  return posts;
}

function PostCard({ post }) {
  const [text, setText] = useState(post.text);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
      <p className="text-amber-300 font-semibold text-sm">{post.label}</p>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={Math.min(10, text.split('\n').length + 1)}
        className="bg-slate-700 border-slate-600 text-white text-sm resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy} className="bg-amber-500 hover:bg-amber-600 text-white">
          {copied ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}
        </Button>
        <a href={fb} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-[#1877F2] hover:opacity-90 text-white">
            <Facebook className="w-3.5 h-3.5 mr-1.5" /> Facebook
          </Button>
        </a>
        <a href={x} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-black hover:opacity-80 text-white">
            <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post on X
          </Button>
        </a>
      </div>
    </div>
  );
}

/** Owner-facing social content generator — turns the venue's deals into ready-to-post copy. */
export default function SocialSharePanel({ venue }) {
  const [seed, setSeed] = useState(0);
  const posts = buildPosts(venue);
  const hasDeals = dealsByDay(venue).length > 0;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/40 rounded-2xl p-5">
        <p className="text-white font-semibold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-400" /> Social Sharing Tools
        </p>
        <p className="text-slate-400 text-xs mt-1">
          Ready-to-post copy built from your current happy hour schedule and deals. Edit anything, then copy or post straight to Facebook or X.
        </p>
        {!hasDeals && (
          <p className="text-amber-300 text-xs mt-2">
            Add your hours and deals in the Hours &amp; Deals tab to get richer post suggestions.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSeed(s => s + 1)}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset edits
        </Button>
      </div>

      {posts.map((p, i) => (
        <PostCard key={`${seed}-${i}`} post={p} />
      ))}
    </div>
  );
}