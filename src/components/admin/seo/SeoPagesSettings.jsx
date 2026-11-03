import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Loader2, ExternalLink } from 'lucide-react';
import { isSeoEnabled, marketSlug } from '@/lib/seoLanding';

export default function SeoPagesSettings() {
  const [markets, setMarkets] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    base44.entities.LocationMarket.filter({}, { sort: 'display_order', limit: 200 }).then(p => setMarkets(p.items));
  }, []);

  const toggle = async (m, on) => {
    setSaving(m.id);
    await base44.entities.LocationMarket.update(m.id, { seo_pages_enabled: on });
    setMarkets(ms => ms.map(x => (x.id === m.id ? { ...x, seo_pages_enabled: on } : x)));
    setSaving(null);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold">SEO Landing Pages</h2>
        <p className="text-sm text-muted-foreground">Turn the public happy hour pages (market, neighborhood and day pages) on or off per market.</p>
      </div>
      {!markets ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <div className="bg-card border rounded-xl divide-y">
          {markets.map(m => {
            const on = isSeoEnabled(m);
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{m.market_name}, {m.state_code}</p>
                  {on && (
                    <a href={`/happy-hour/${marketSlug(m.market_id)}`} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                      View pages <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {saving === m.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Switch checked={on} disabled={saving === m.id} onCheckedChange={v => toggle(m, v)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}