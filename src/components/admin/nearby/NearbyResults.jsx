import { Badge } from '@/components/ui/badge';

export default function NearbyResults({ result }) {
  if (!result) return null;
  if (!result.nearby.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No venues found within {result.search_radius_meters} meters</p>;
  }
  return (
    <div className="border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr><th className="p-2">Venue</th><th className="p-2">Distance</th><th className="p-2">Active special</th><th className="p-2">Lat</th><th className="p-2">Lng</th></tr>
        </thead>
        <tbody>
          {result.nearby.map((v) => (
            <tr key={v.venue_id} className="border-t border-border">
              <td className="p-2 font-medium">{v.venue_name}</td>
              <td className="p-2">{v.distance_meters} m</td>
              <td className="p-2"><Badge variant={v.has_active_special ? 'default' : 'secondary'}>{v.has_active_special ? 'Yes' : 'No'}</Badge></td>
              <td className="p-2 text-xs">{v.venue_latitude}</td>
              <td className="p-2 text-xs">{v.venue_longitude}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}