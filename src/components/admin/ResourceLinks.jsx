import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, Plus, Pencil, Trash2, X, Check, Link } from 'lucide-react';

const EMPTY_FORM = { name: '', url: '', description: '', category: '' };

function LinkForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-muted/40 border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Stripe" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
          <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Payments, Email, Analytics…" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">URL *</label>
        <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this service do?" rows={2} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.name || !form.url}><Check className="w-4 h-4 mr-1" />Save</Button>
      </div>
    </div>
  );
}

function LinkRow({ link, onEdit, onDelete }) {
  return (
    <div className="flex items-start gap-4 bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <Link className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{link.name}</span>
          {link.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{link.category}</span>
          )}
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 truncate max-w-sm"
        >
          {link.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
        {link.description && (
          <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(link)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(link.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ResourceLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // link id

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ResourceLink.list('-created_date');
    setLinks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    await base44.entities.ResourceLink.create(form);
    setAdding(false);
    load();
  };

  const handleEdit = async (form) => {
    await base44.entities.ResourceLink.update(editing, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this link?')) return;
    await base44.entities.ResourceLink.delete(id);
    load();
  };

  // Group by category
  const grouped = links.reduce((acc, l) => {
    const key = l.category || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Resource Links</h2>
          <p className="text-sm text-muted-foreground">{links.length} saved URL{links.length !== 1 ? 's' : ''}</p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Link
          </Button>
        )}
      </div>

      {adding && (
        <LinkForm onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : links.length === 0 && !adding ? (
        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
          No links yet. Click "Add Link" to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{category}</h3>
              <div className="space-y-2">
                {items.map(link => (
                  editing === link.id ? (
                    <LinkForm
                      key={link.id}
                      initial={link}
                      onSave={handleEdit}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <LinkRow
                      key={link.id}
                      link={link}
                      onEdit={(l) => setEditing(l.id)}
                      onDelete={handleDelete}
                    />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}