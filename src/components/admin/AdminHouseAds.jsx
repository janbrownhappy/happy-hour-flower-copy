import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Upload, Trash2, Pencil, Eye, MousePointerClick, Flower2 } from 'lucide-react';

const EMPTY = { title: '', image_url: '', click_url: '', is_active: true };

// Admin manager for house ads (our own promos, e.g. Happy Hour Flower) — no billing.
// These rotate into the same consumer ad slot as paid ads.
export default function AdminHouseAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    base44.entities.HouseAd.list('-created_date')
      .then(setAds)
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setDialogOpen(true); };
  const openEdit = (ad) => {
    setEditing(ad);
    setForm({ title: ad.title || '', image_url: ad.image_url || '', click_url: ad.click_url || '', is_active: ad.is_active !== false });
    setError('');
    setDialogOpen(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
    } catch {
      setError('Upload failed. Try a different image.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError('');
    if (!form.image_url) return setError('Please upload an ad graphic.');
    setSaving(true);
    const data = {
      title: form.title.trim(),
      image_url: form.image_url,
      click_url: form.click_url.trim(),
      is_active: form.is_active,
    };
    if (editing) await base44.entities.HouseAd.update(editing.id, data);
    else await base44.entities.HouseAd.create(data);
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (ad) => {
    await base44.entities.HouseAd.update(ad.id, { is_active: !(ad.is_active !== false) });
    load();
  };

  const remove = async (ad) => {
    if (!confirm('Delete this house ad?')) return;
    await base44.entities.HouseAd.delete(ad.id);
    load();
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-primary" /> House Ads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your own ads (e.g. Happy Hour Flower). Active ads rotate randomly into the same slot as paid ads — no billing.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> New House Ad</Button>
      </div>

      {ads.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          No house ads yet. Create one to start rotating it alongside paid ads.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ads.map(ad => (
            <div key={ad.id} className="bg-card border border-border rounded-xl overflow-hidden flex">
              {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-24 h-24 object-cover flex-shrink-0" />}
              <div className="p-3 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{ad.title || 'Untitled'}</p>
                  <Badge className={`${ad.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'} text-white text-xs flex-shrink-0`}>
                    {ad.is_active !== false ? 'In Rotation' : 'Paused'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {ad.impression_count || 0}</span>
                  <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {ad.click_count || 0}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={ad.is_active !== false} onCheckedChange={() => toggleActive(ad)} />
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => openEdit(ad)}><Pencil className="w-3 h-3" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-red-500 hover:text-red-600" onClick={() => remove(ad)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit House Ad' : 'New House Ad'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Happy Hour Flower — Spring Special" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ad Graphic</Label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 cursor-pointer hover:border-primary transition-colors text-muted-foreground hover:text-primary">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span className="text-sm">{form.image_url ? 'Change graphic' : 'Upload graphic'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              {form.image_url && <img src={form.image_url} alt="Preview" className="w-full rounded-xl mt-2 max-h-48 object-cover" />}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Click-through URL (optional)</Label>
              <Input value={form.click_url} onChange={e => setForm(f => ({ ...f, click_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="flex items-center justify-between border border-border rounded-xl p-3">
              <span className="text-sm font-medium">In rotation</span>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={save} disabled={saving || uploading} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create House Ad'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}