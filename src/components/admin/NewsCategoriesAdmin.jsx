import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function NewsCategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.NewsCategory.list('sort_order')
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order || 0), 0);
    const created = await base44.entities.NewsCategory.create({ name, sort_order: maxOrder + 1 });
    setCategories(prev => [...prev, created]);
    setNewName('');
    setAdding(false);
  };

  const handleSaveEdit = async (id) => {
    const name = editName.trim();
    if (!name) return;
    const updated = await base44.entities.NewsCategory.update(id, { name });
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    setEditingId(null);
  };

  const handleDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    await base44.entities.NewsCategory.delete(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <h3 className="font-heading font-bold text-lg">News Categories</h3>
        <p className="text-sm text-muted-foreground">Categories available when creating news articles.</p>
      </div>

      {/* Add new */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New category name"
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No categories yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
              {editingId === c.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(c.id); }}
                    className="flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleSaveEdit(c.id)} className="p-1.5 rounded-lg hover:bg-muted"><Check className="w-4 h-4 text-green-600" /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium text-sm">{c.name}</span>
                  <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}