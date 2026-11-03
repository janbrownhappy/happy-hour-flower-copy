import { useState } from 'react';
import { saveQrCampaign } from '@/functions/saveQrCampaign';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { PLACEMENTS, labelize } from './qrConstants';
import QrDestinationFields from './QrDestinationFields';

const FIELDS = ['name', 'description', 'market', 'source', 'channel', 'campaign', 'placement_type', 'venue_id', 'special_id', 'event_id', 'ambassador_id', 'partner_id', 'destination_type', 'destination_url', 'quantity_printed', 'date_printed', 'date_deployed', 'expiration_date', 'notes'];

function destinationId(f) {
  if (f.destination_type === 'venue') return f.venue_id;
  if (f.destination_type === 'special') return f.special_id;
  if (f.destination_type === 'event') return f.event_id;
  return '';
}

export default function QrCampaignForm({ initial, venues, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    const f = { placement_type: 'coaster', destination_type: 'venue', market: 'GVL' };
    FIELDS.forEach((k) => { if (initial?.[k] !== undefined) f[k] = initial[k]; });
    return f;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const field = (k, label, type = 'text') => (
    <div><Label>{label}</Label><Input type={type} value={form[k] ?? ''} onChange={(e) => set({ [k]: type === 'number' ? Number(e.target.value) || '' : e.target.value })} /></div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (['venue', 'special', 'event'].includes(form.destination_type) && !destinationId(form)) {
      setError(`Choose a ${form.destination_type} for this destination.`); return;
    }
    setSaving(true);
    try {
      const { data } = await saveQrCampaign({ id: initial?.id, data: { ...form, destination_id: destinationId(form) } });
      onSaved(data.campaign);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="grid sm:grid-cols-2 gap-3">
        {field('name', 'Name *')}
        {initial ? <div><Label>Market</Label><Input value={form.market} disabled /></div> : field('market', 'Market code (e.g. GVL)')}
        <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description || ''} onChange={(e) => set({ description: e.target.value })} /></div>
      </section>
      <section className="grid sm:grid-cols-2 gap-3">
        {field('source', 'Source')}{field('channel', 'Channel')}{field('campaign', 'Campaign')}
        <div><Label>Placement</Label>
          <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.placement_type} onChange={(e) => set({ placement_type: e.target.value })}>
            {PLACEMENTS.map((p) => <option key={p} value={p}>{labelize(p)}</option>)}
          </select>
        </div>
        {field('ambassador_id', 'Ambassador ID (Partnero)')}{field('partner_id', 'Partner ID')}
      </section>
      <QrDestinationFields form={form} set={set} venues={venues} />
      <section className="grid sm:grid-cols-2 gap-3">
        {field('quantity_printed', 'Quantity printed', 'number')}{field('date_printed', 'Date printed', 'date')}
        {field('date_deployed', 'Date deployed', 'date')}{field('expiration_date', 'Expiration date', 'date')}
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></div>
      </section>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || !form.name}>{saving && <Loader2 className="animate-spin" />}{initial ? 'Save changes' : 'Create QR Code'}</Button>
      </div>
    </form>
  );
}