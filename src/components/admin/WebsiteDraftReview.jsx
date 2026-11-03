import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

const FIELDS = [
  ['name', 'Name'], ['category', 'Category'], ['address', 'Address'], ['city', 'City'],
  ['state_code', 'State'], ['zip_code', 'ZIP'], ['phone', 'Phone'], ['website', 'Website'],
  ['facebook_url', 'Facebook'], ['instagram_url', 'Instagram'], ['tiktok_url', 'TikTok'], ['x_url', 'X'],
  ['happy_hour_start', 'Happy hour start'], ['happy_hour_end', 'Happy hour end'],
];

export default function WebsiteDraftReview({ initial, duplicates, saving, onSave, onCancel }) {
  const [d, setD] = useState(initial);
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const list = (k) => (d[k] || []).join(', ');

  return (
    <div className="border border-border rounded-xl p-3 space-y-3">
      {duplicates?.length > 0 && (
        <p className="text-xs bg-amber-50 text-amber-800 border border-amber-300 rounded-lg p-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Possible duplicate: {duplicates.map(v => `${v.name}${v.city ? ` (${v.city})` : ''}`).join(', ')}
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <Label className="text-xs">{label}</Label>
            <Input value={d[k] || ''} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      {['days', 'deals', 'amenities_raw'].map(k => (
        <div key={k}>
          <Label className="text-xs">{k === 'days' ? 'Happy hour days' : k === 'deals' ? 'Specials' : 'Amenities'} (comma separated)</Label>
          <Input value={list(k)} onChange={e => set(k, e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
        </div>
      ))}
      <div>
        <Label className="text-xs">Description</Label>
        <textarea className="w-full border border-input rounded-md p-2 text-sm bg-transparent" rows={3} value={d.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
      {d.notes && <p className="text-xs text-muted-foreground"><b>To verify:</b> {d.notes}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Discard</Button>
        <Button variant="outline" onClick={() => onSave(d, 'draft')} disabled={saving || !d.name}>Save as draft</Button>
        <Button onClick={() => onSave(d, 'active')} disabled={saving || !d.name}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create & publish
        </Button>
      </div>
    </div>
  );
}