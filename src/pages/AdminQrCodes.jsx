import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import useQrData from '@/components/admin/qr/useQrData';
import QrSummary from '@/components/admin/qr/QrSummary';
import QrCampaignTable from '@/components/admin/qr/QrCampaignTable';
import QrCampaignForm from '@/components/admin/qr/QrCampaignForm';
import { PLACEMENTS, labelize } from '@/components/admin/qr/qrConstants';

const PAGE = 25;
const sel = 'h-9 rounded-md border border-input bg-card px-2 text-sm';

export default function AdminQrCodes() {
  const { campaigns, venues, analytics, loading, venueName } = useQrData();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ q: '', market: '', venue: '', placement: '', campaign: '', status: '', from: '', to: '' });
  const [page, setPage] = useState(0);
  const set = (p) => { setF((x) => ({ ...x, ...p })); setPage(0); };

  const uniq = (k) => [...new Set(campaigns.map((c) => c[k]).filter(Boolean))];
  const rows = useMemo(() => campaigns.filter((c) => {
    const q = f.q.toLowerCase();
    if (q && ![c.qr_id, c.name, c.campaign, c.short_code].some((v) => String(v || '').toLowerCase().includes(q))) return false;
    if (f.market && c.market !== f.market) return false;
    if (f.venue && c.venue_id !== f.venue) return false;
    if (f.placement && c.placement_type !== f.placement) return false;
    if (f.campaign && c.campaign !== f.campaign) return false;
    if (f.status && c.status !== f.status) return false;
    const d = c.created_date?.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    return true;
  }), [campaigns, f]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/marketing"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
          <div><h1 className="text-2xl font-heading font-bold">QR Codes</h1><p className="text-sm text-muted-foreground">Marketing · {campaigns.length} campaigns</p></div>
        </div>
        <Button onClick={() => setCreating(true)}><Plus /> Create QR Code</Button>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : (
        <>
          <QrSummary summary={analytics.summary} byQr={analytics.byQr} campaigns={campaigns} venueName={venueName} />
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs bg-card" placeholder="Search QR ID, name, campaign…" value={f.q} onChange={(e) => set({ q: e.target.value })} />
            <select className={sel} value={f.market} onChange={(e) => set({ market: e.target.value })}><option value="">All markets</option>{uniq('market').map((m) => <option key={m}>{m}</option>)}</select>
            <select className={sel} value={f.venue} onChange={(e) => set({ venue: e.target.value })}><option value="">All venues</option>{uniq('venue_id').map((v) => <option key={v} value={v}>{venueName(v)}</option>)}</select>
            <select className={sel} value={f.placement} onChange={(e) => set({ placement: e.target.value })}><option value="">All placements</option>{PLACEMENTS.map((p) => <option key={p} value={p}>{labelize(p)}</option>)}</select>
            <select className={sel} value={f.campaign} onChange={(e) => set({ campaign: e.target.value })}><option value="">All campaigns</option>{uniq('campaign').map((m) => <option key={m}>{m}</option>)}</select>
            <select className={sel} value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option></select>
            <Input type="date" className="w-auto bg-card" value={f.from} onChange={(e) => set({ from: e.target.value })} />
            <Input type="date" className="w-auto bg-card" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </div>
          <QrCampaignTable rows={rows.slice(page * PAGE, (page + 1) * PAGE)} byQr={analytics.byQr} venueName={venueName} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{rows.length} QR codes</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
              <span>Page {page + 1} of {pages}</span>
              <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create QR Code</DialogTitle></DialogHeader>
          <QrCampaignForm venues={venues} onCancel={() => setCreating(false)} onSaved={(c) => navigate(`/admin/qr/${c.id}`)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}