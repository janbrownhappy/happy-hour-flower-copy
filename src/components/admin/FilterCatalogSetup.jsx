import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Wand2 } from 'lucide-react';
import { seedFilterCatalogs } from '@/functions/seedFilterCatalogs';
import { migrateVenuesToV3Model } from '@/functions/migrateVenuesToV3Model';

export default function FilterCatalogSetup() {
  const [counts, setCounts] = useState({ types: 0, cuisines: 0, items: 0 });
  const [seeding, setSeeding] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [status, setStatus] = useState('');

  const loadCounts = async () => {
    const [types, cuisines, items] = await Promise.all([
      base44.entities.VenueType.list('', 500).catch(() => []),
      base44.entities.Cuisine.list('', 500).catch(() => []),
      base44.entities.HappyHourItem.list('', 5000).catch(() => []),
    ]);
    setCounts({ types: types.length, cuisines: cuisines.length, items: items.length });
  };

  useEffect(() => { loadCounts(); }, []);

  const runSeed = async () => {
    setSeeding(true);
    setStatus('Seeding venue type and cuisine catalogs…');
    try {
      const res = await seedFilterCatalogs({});
      const d = res.data || {};
      setStatus(`Catalogs seeded — ${d.venue_types_created || 0} venue types created, ${d.cuisines_created || 0} cuisines created.`);
      await loadCounts();
    } catch (e) {
      setStatus(`Seeding failed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setStatus('Migrating venues onto the v3 model…');
    try {
      let offset = 0;
      let total = 0;
      let done = false;
      while (!done) {
        const res = await migrateVenuesToV3Model({ offset, limit: 25 });
        const d = res.data || {};
        offset = d.next_offset || 0;
        total = d.total || 0;
        done = !!d.done;
        setStatus(`Migrating venues… ${offset} of ${total}`);
      }
      setStatus(`Migration complete — ${total} venues processed.`);
      await loadCounts();
    } catch (e) {
      setStatus(`Migration failed: ${e.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-4 bg-card border border-border rounded-2xl space-y-4">
      <div>
        <h3 className="font-heading font-bold text-base">Filter Catalogs (v3)</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Seed the venue type and cuisine catalogs, then map existing venues onto them and build
          structured happy hour items from their current deal text.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[['Venue types', counts.types], ['Cuisines', counts.cuisines], ['Happy hour items', counts.items]].map(([label, value]) => (
          <div key={label} className="p-3 rounded-xl bg-muted text-center">
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runSeed} disabled={seeding || migrating}>
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Seed catalogs
        </Button>
        <Button variant="outline" onClick={runMigration} disabled={seeding || migrating || counts.types === 0}>
          {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Migrate venues
        </Button>
      </div>

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}