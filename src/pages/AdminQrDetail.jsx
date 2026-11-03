import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Pause, Play, Pencil } from 'lucide-react';
import { saveQrCampaign } from '@/functions/saveQrCampaign';
import useQrData from '@/components/admin/qr/useQrData';
import QrImage from '@/components/qr/QrImage';
import QrDetailStats from '@/components/admin/qr/QrDetailStats';
import QrCampaignForm from '@/components/admin/qr/QrCampaignForm';
import { labelize } from '@/components/admin/qr/qrConstants';

export default function AdminQrDetail() {
  const { id } = useParams();
  const { campaigns, venues, analytics, loading, reload, venueName } = useQrData();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = campaigns.find((x) => x.id === id);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!c) return <div className="p-10 text-center">QR campaign not found. <Link to="/admin/qr" className="text-primary underline">Back</Link></div>;

  const toggle = async () => {
    setBusy(true);
    await saveQrCampaign({ id: c.id, data: { status: c.status === 'active' ? 'paused' : 'active' } });
    await reload(); setBusy(false);
  };
  const row = (k, v) => <div className="flex justify-between gap-4 py-1.5 border-b border-border text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right allow-select">{v || '—'}</span></div>;
  const dest = c.destination_type === 'url' ? c.destination_url : c.destination_id;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin/qr"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
        <div className="flex-1"><h1 className="text-2xl font-heading font-bold">{c.name}</h1><p className="font-mono text-sm text-muted-foreground">{c.qr_id}</p></div>
        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit Destination & Metadata</Button>
        <Button variant="outline" onClick={toggle} disabled={busy}>{c.status === 'active' ? <><Pause /> Pause</> : <><Play /> Reactivate</>}</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <QrImage url={c.short_url} qrId={c.qr_id} />
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          {row('Short URL', c.short_url)}
          {row('Venue', c.venue_id ? <Link className="text-primary underline" to={`/venue/${c.venue_id}`}>{venueName(c.venue_id) || c.venue_id}</Link> : '')}
          {row('Campaign', c.campaign)}{row('Source / Channel', [c.source, c.channel].filter(Boolean).join(' / '))}
          {row('Placement', labelize(c.placement_type))}{row('Market', c.market)}
          {row('Destination', `${labelize(c.destination_type)}${dest ? ` · ${dest}` : ''}`)}
          {row('Ambassador ID', c.ambassador_id)}{row('Quantity printed', c.quantity_printed)}
          {row('Printed / Deployed', [c.date_printed, c.date_deployed].filter(Boolean).join(' / '))}
          {row('Expires', c.expiration_date)}{row('Notes', c.notes)}
        </div>
      </div>
      <QrDetailStats s={analytics.byQr[c.qr_id]} />
      {c.destination_history?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2">Destination history</p>
          {c.destination_history.slice().reverse().map((h, i) => (
            <p key={i} className="text-muted-foreground">{h.changed_at?.slice(0, 16).replace('T', ' ')} — {labelize(h.from_type)} {h.from_id} → {labelize(h.to_type)} {h.to_id}</p>
          ))}
        </div>
      )}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {c.qr_id}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">QR ID, short code and the printed image never change.</p>
          <QrCampaignForm initial={c} venues={venues} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await reload(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}