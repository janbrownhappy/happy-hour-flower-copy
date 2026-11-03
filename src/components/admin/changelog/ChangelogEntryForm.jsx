import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

const CATEGORIES = ['feature', 'fix', 'design', 'content', 'backend', 'other'];

export default function ChangelogEntryForm({ onSaved }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [saving, setSaving] = useState(false);
  const todayLocal = () => new Date().toLocaleDateString('en-CA');
  const [changeDate, setChangeDate] = useState(todayLocal());

  const save = async () => {
    if (!title.trim() || !changeDate) return;
    setSaving(true);
    const entry = await base44.entities.ChangelogEntry.create({
      title: title.trim(),
      description: description.trim(),
      category,
      source: 'manual',
      // Noon local time keeps the entry on the chosen day in any timezone grouping.
      change_date: new Date(`${changeDate}T12:00:00`).toISOString(),
    });
    // Auto-push to Featurebase as a draft — best-effort, never blocks saving.
    try {
      await base44.functions.invoke('pushChangelogToFeaturebase', { entry_id: entry.id });
    } catch (_e) {
      // The function records the failure on the entry; the list row shows it.
    }
    setTitle('');
    setDescription('');
    setCategory('other');
    setChangeDate(todayLocal());
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <Label htmlFor="cl-title">What changed?</Label>
        <Input
          id="cl-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Added nightly changelog email"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="cl-desc">Details (optional)</Label>
        <Textarea
          id="cl-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1"
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-[200px]">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cl-date">Change date</Label>
          <Input id="cl-date" type="date" required value={changeDate} max={todayLocal()} onChange={(e) => setChangeDate(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={save} disabled={saving || !title.trim() || !changeDate}>
          <Plus className="w-4 h-4" /> {saving ? 'Adding...' : 'Add entry'}
        </Button>
      </div>
    </div>
  );
}