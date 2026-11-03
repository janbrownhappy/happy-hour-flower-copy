import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Loader2 } from 'lucide-react';

// Lists active venues matching `query`, with their happy hour specials (optionally for one day).
export default function SeoVenueList({ title, query, dayKey, emptyText }) {
  const [venues, setVenues] = useState(null);
  const [specials, setSpecials] = useState({});
  const key = JSON.stringify(query) + dayKey;

  useEffect(() => {
    let live = true;
    (async () => {
      setVenues(null);
      const page = await base44.entities.Venue.filter({ status: 'active', ...query }, { sort: '-rating', limit: 30, fields: ['name', 'address', 'city', 'category', 'happy_hour_start', 'happy_hour_end', 'photo_urls', 'photo_thumbs'] });
      const ids = page.items.map(v => v.id);
      const itemQuery = { venue_id: { $in: ids }, is_premium: { $ne: true } };
      if (dayKey) itemQuery.day = { $in: [dayKey, ''] };
      const items = ids.length ? (await base44.entities.HappyHourItem.filter(itemQuery, { limit: 300, fields: ['venue_id', 'label'] })).items : [];
      const byVenue = {};
      items.forEach(i => { (byVenue[i.venue_id] ||= []).push(i.label); });
      if (live) { setSpecials(byVenue); setVenues(page.items); }
    })();
    return () => { live = false; };
  }, [key]);

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-5">{title}</h2>
      {!venues ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : venues.length === 0 ? (
        <p className="text-gray-500">{emptyText}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {venues.map(v => {
            const photo = v.photo_urls?.[0];
            const deals = [...new Set(specials[v.id] || [])].slice(0, 4);
            return (
              <article key={v.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex">
                {photo && <img src={v.photo_thumbs?.[photo] || photo} alt={v.name} loading="lazy" className="w-28 object-cover flex-shrink-0" />}
                <div className="p-4 min-w-0">
                  <h3 className="font-bold text-gray-900">{v.name}</h3>
                  {(v.address || v.city) && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{[v.address, v.city].filter(Boolean).join(', ')}</p>}
                  {v.happy_hour_start && <p className="text-sm text-amber-700 font-semibold mt-1">{v.happy_hour_start}–{v.happy_hour_end}</p>}
                  {deals.length > 0 && <ul className="text-sm text-gray-700 mt-2 space-y-0.5 list-disc pl-4">{deals.map(d => <li key={d}>{d}</li>)}</ul>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}