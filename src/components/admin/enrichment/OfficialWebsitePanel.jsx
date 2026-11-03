import { useState } from 'react';
import { Globe, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_TEXT = {
  OFFICIAL_WEBSITE_CONFIRMED: 'Official website confirmed and researched',
  OFFICIAL_WEBSITE_UNCERTAIN: "Couldn't confirm this website belongs to the venue — not used as an official source",
  NO_WEBSITE: 'No website on file or from Google',
  INVALID_URL: 'Website address is invalid',
  WEBSITE_IS_SOCIAL_PROFILE: 'Website on file is a social profile — skipped',
  SCRAPE_FAILED: "Couldn't load the website — research continued without it",
  NO_USEFUL_CONTENT: 'Website loaded but had no usable content',
  NOT_CONFIGURED: 'Website research is not configured',
};

// Diagnostics for the official-website research step of a single-venue enrichment run.
export default function OfficialWebsitePanel({ research }) {
  const [open, setOpen] = useState(false);
  if (!research) return null;
  const ok = research.status === 'OFFICIAL_WEBSITE_CONFIRMED';
  const signals = research.validation?.signals || {};

  return (
    <div className={`rounded-lg p-3 text-sm ${ok ? 'bg-green-500/10 text-green-800' : 'bg-muted/50 text-muted-foreground'}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-start gap-2 text-left min-h-0">
        {ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
        <span className="flex-1">
          <span className="font-medium flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Official Website</span>
          <span className="block text-xs">{STATUS_TEXT[research.status] || research.status}
            {research.attempted && ` · ${research.pages.length} page${research.pages.length === 1 ? '' : 's'} read · ${(research.duration_ms / 1000).toFixed(1)}s`}
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-xs text-foreground">
          {research.official_website && <p>Website: <a href={research.official_website} target="_blank" rel="noopener noreferrer" className="underline">{research.official_website}</a></p>}
          {research.validation && (
            <p>Match checks: {Object.entries(signals).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v ? '✓' : '✗'}`).join(' · ')}</p>
          )}
          {research.multi_location && <p className="text-amber-700">Multi-location site — only location-specific evidence should be trusted.</p>}
          {research.pages.length > 0 && (
            <ul className="space-y-0.5">
              {research.pages.map((p) => (
                <li key={p.url} className="truncate">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="underline">{p.title || p.url}</a>
                  <span className="text-muted-foreground"> · {p.chars} chars{p.rendered ? ' · rendered' : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground">
            {research.skipped.length} links skipped · {research.rendered_count} rendered · {research.requests} requests
          </p>
          {research.pdf_links.length > 0 && <p>PDF menus found (review manually): {research.pdf_links.join(', ')}</p>}
          {Object.keys(research.social_links || {}).length > 0 && (
            <p>Social links on site: {Object.values(research.social_links).join(', ')}</p>
          )}
          {research.errors.length > 0 && (
            <p className="text-destructive">Errors: {research.errors.map((e) => `${e.url} — ${e.error}`).join('; ')}</p>
          )}
        </div>
      )}
    </div>
  );
}