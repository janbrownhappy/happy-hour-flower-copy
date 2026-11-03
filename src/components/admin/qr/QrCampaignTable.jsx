import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { labelize } from './qrConstants';

export default function QrCampaignTable({ rows, byQr, venueName }) {
  const navigate = useNavigate();
  if (rows.length === 0) return <p className="text-sm text-muted-foreground p-6 text-center">No QR codes match.</p>;
  return (
    <div className="overflow-x-auto border border-border rounded-xl bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>{['QR ID', 'Name', 'Venue', 'Placement', 'Campaign', 'Market', 'Destination', 'Status', 'Scans', 'Created', 'Deployed'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} onClick={() => navigate(`/admin/qr/${c.id}`)} className="border-t border-border hover:bg-muted/50 cursor-pointer">
              <td className="px-3 py-2 font-mono whitespace-nowrap">{c.qr_id}</td>
              <td className="px-3 py-2">{c.name}</td>
              <td className="px-3 py-2">{venueName(c.venue_id) || '—'}</td>
              <td className="px-3 py-2 capitalize">{labelize(c.placement_type)}</td>
              <td className="px-3 py-2">{c.campaign || '—'}</td>
              <td className="px-3 py-2">{c.market}</td>
              <td className="px-3 py-2 capitalize">{labelize(c.destination_type)}</td>
              <td className="px-3 py-2"><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></td>
              <td className="px-3 py-2 font-semibold">{byQr[c.qr_id]?.scans ?? 0}</td>
              <td className="px-3 py-2 whitespace-nowrap">{c.created_date?.slice(0, 10)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{c.date_deployed || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}