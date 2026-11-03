import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { marketIdFromSlug, isSeoEnabled } from '@/lib/seoLanding';

// Loads a market (by URL slug), its active areas and its active venue count.
// Markets with SEO pages switched off resolve to market: null (page not found).
export default function useSeoMarket(slug) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const market_id = marketIdFromSlug(slug);
    (async () => {
      const m = (await base44.entities.LocationMarket.filter({ market_id, is_active: true }, { limit: 1 })).items[0];
      if (!m || !isSeoEnabled(m)) { setState({ loading: false, market: null, areas: [] }); return; }
      const [a, count] = await Promise.all([
        base44.entities.LocationArea.filter({ market_id, is_active: { $ne: false } }, { sort: 'display_order', limit: 200 }),
        base44.entities.Venue.count({ market_id, status: 'active' }),
      ]);
      setState({ loading: false, market: m, areas: a.items, count });
    })();
  }, [slug]);
  return state;
}