import React, { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || a.area_name || '').localeCompare(b.market_name || b.area_name || '')
  );

export default function GreenvilleNeighborhoods() {
  const [areas, setAreas] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationArea.list('', 500).catch(() => []),
      base44.entities.LocationMarket.list('', 200).catch(() => []),
    ]).then(([a, m]) => {
      setAreas(a.filter((x) => x.is_active !== false));
      setMarkets(sortItems(m.filter((x) => x.is_active !== false)));
    }).finally(() => setLoading(false));
  }, []);

  // Group: state → markets → areas
  const grouped = useMemo(() => {
    const byState = {};
    for (const m of markets) {
      const sc = m.state_code || '—';
      if (!byState[sc]) byState[sc] = { state_name: m.state_name || sc, markets: [] };
      byState[sc].markets.push({
        ...m,
        areas: sortItems(areas.filter((a) => a.market_id === m.market_id)),
      });
    }
    return Object.entries(byState)
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => a.state_name.localeCompare(b.state_name));
  }, [areas, markets]);

  const totalAreas = areas.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-heading">Coverage Areas</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {loading ? 'Loading areas…' : `${totalAreas} areas across ${markets.length} markets in SC, GA & FL.`}
      </p>

      <div className="space-y-6">
        {grouped.map((state) => (
          <div key={state.code}>
            <h2 className="text-base font-heading font-bold mb-3">{state.state_name}</h2>
            <div className="space-y-4">
              {state.markets.map((market) => (
                <Card key={market.market_id} className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {market.market_name}
                  </h3>
                  {market.areas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No areas yet.</p>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {market.areas.map((a) => (
                        <li key={a.area_id} className="text-sm">{a.area_name}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}