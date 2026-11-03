import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, Facebook, Loader2, Trash2 } from 'lucide-react';

const short = (u) => u.replace(/^https?:\/\/(www\.)?/, '');

export default function UnassignedAreaRow({ venue, areas = [], onSave, onDelete }) {
  const [form, setForm] = useState({ city: venue.city || '', state_code: venue.state_code || '', zip_code: venue.zip_code || '', area_id: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => { setSaving(true); await onSave(venue, form); setSaving(false); };

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{venue.name}</p>
        {venue.address && <p className="text-xs text-muted-foreground truncate">{venue.address}</p>}
        {venue.website ? (
          <a href={venue.website} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 min-h-0 truncate">
            <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{short(venue.website)}</span>
          </a>
        ) : venue.facebook_url ? (
          <a href={venue.facebook_url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 min-h-0 truncate">
            <Facebook className="w-3 h-3 shrink-0" /><span className="truncate">{short(venue.facebook_url)}</span>
          </a>
        ) : <p className="text-xs text-muted-foreground">No website or Facebook</p>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={form.area_id} onChange={set('area_id')} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm w-48">
          <option value="">Auto-match area</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}{a.market_name ? ` (${a.market_name})` : ''}</option>)}
        </select>
        <Input placeholder="City" value={form.city} onChange={set('city')} className="w-36" />
        <Input placeholder="State" value={form.state_code} onChange={set('state_code')} className="w-16" maxLength={2} />
        <Input placeholder="ZIP" value={form.zip_code} onChange={set('zip_code')} className="w-24" />
        <Button onClick={save} disabled={saving || (!form.city.trim() && !form.area_id)}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
        <Button variant="outline" size="icon" aria-label="Delete venue" disabled={saving} className="text-destructive"
          onClick={async () => { if (!window.confirm(`Delete ${venue.name}? This can't be undone.`)) return; setSaving(true); await onDelete(venue); }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}