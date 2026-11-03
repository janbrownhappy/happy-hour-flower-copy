import { ALL_AMENITIES, AMENITY_PANELS } from '@/lib/amenities';

const PANEL_STYLE = {
  deals: { icon: '🍹', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  atmosphere: { icon: '✨', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300' },
  seating_setting: { icon: '🪑', cls: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  entertainment: { icon: '🎵', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300' },
  convenience: { icon: '🅿️', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  accessibility: { icon: '♿', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  menu_cuisine: { icon: '🍽️', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  occasion: { icon: '🎉', cls: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
};

const SLUG_ICON = {
  dog_friendly: '🐶', pet_friendly: '🐶', patio: '☀️', outdoor_seating: '🌿', rooftop: '🏙️',
  live_music: '🎸', trivia: '❓', karaoke: '🎤', sports_tv: '📺', wifi: '📶', free_parking: '🅿️',
  wheelchair_accessible: '♿', craft_beer: '🍺', wine: '🍷', cocktails: '🍸', vegan_options: '🥗',
};

const META = {};
for (const p of AMENITY_PANELS) for (const sc of p.subcategories) for (const a of sc.amenities) META[a.slug] = { ...a, panel: p.id };

export default function AmenityBadges({ slugs = [], max }) {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return null;
  const shown = max ? unique.slice(0, max) : unique;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map(slug => {
        const m = META[slug] || ALL_AMENITIES.find(a => a.slug === slug) || {};
        const s = PANEL_STYLE[m.panel] || PANEL_STYLE.convenience;
        return (
          <span key={slug} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
            <span className="text-[13px] leading-none">{SLUG_ICON[slug] || s.icon}</span>
            {m.label || slug.replace(/[_-]/g, ' ')}
          </span>
        );
      })}
      {max && unique.length > max && (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground">+{unique.length - max}</span>
      )}
    </div>
  );
}