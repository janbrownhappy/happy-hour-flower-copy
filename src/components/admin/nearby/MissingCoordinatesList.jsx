import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const valid = (v) => typeof v.lat === 'number' && typeof v.lng === 'number' && Math.abs(v.lat) <= 90 && Math.abs(v.lng) <= 180 && !(v.lat === 0 && v.lng === 0);

// Active venues excluded from nearby detection because their coordinates are missing/invalid.
export default function MissingCoordinatesList() {
  const [list, setList] = useState(null);

  useEffect(() => {
    base44.entities.Venue.filter({ status: 'active' }, 'name', 5000).then((vs) => setList(vs.filter((v) => !valid(v))));
  }, []);

  if (!list) return <p className="text-sm text-muted-foreground">Checking venue coordinates…</p>;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="font-semibold text-sm mb-1">Active venues missing coordinates ({list.length})</p>
      <p className="text-xs text-muted-foreground mb-3">These are skipped by nearby detection until they have a valid location.</p>
      {list.length === 0 ? <p className="text-sm">All active venues have valid coordinates.</p> : (
        <div className="max-h-60 overflow-y-auto text-sm divide-y divide-border">
          {list.map((v) => <div key={v.id} className="py-1.5">{v.name} <span className="text-xs text-muted-foreground">{[v.address, v.city].filter(Boolean).join(', ')}</span></div>)}
        </div>
      )}
    </div>
  );
}