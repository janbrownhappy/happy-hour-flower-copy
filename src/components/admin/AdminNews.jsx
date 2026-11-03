import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, X, MapPin } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AdminNewsLocationPicker from '@/components/admin/AdminNewsLocationPicker';
import { useAdminLocation, hasTerritory } from '@/lib/AdminLocationContext';

const EMPTY_LOC = { state_code: '', state_name: '', market_id: '', market_name: '', area_id: '', area_name: '' };

// Article matches the active admin territory if it's global (no state) or shares the
// selected level. Articles tagged broader than the filter (e.g. market-wide) still match
// an area within that market.
function articleInTerritory(article, filter) {
  if (!hasTerritory(filter)) return true;
  if (filter.area_id) {
    if (article.area_id) return article.area_id === filter.area_id;
    if (article.market_id) return article.market_id === filter.market_id;
    if (article.state_code) return article.state_code === filter.state_code;
    return true; // global
  }
  if (filter.market_id) {
    if (article.market_id) return article.market_id === filter.market_id;
    if (article.state_code) return article.state_code === filter.state_code;
    return true;
  }
  if (filter.state_code) return !article.state_code || article.state_code === filter.state_code;
  return true;
}

function locationLabel(a) {
  const parts = [a.state_name, a.market_name, a.area_name].filter(Boolean);
  return parts.length ? parts[parts.length - 1] : 'Global';
}

export default function AdminNews() {
  const { locationFilter } = useAdminLocation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', excerpt: '', category: 'General', tag: 'General', venue: '', author: '', status: 'published', ...EMPTY_LOC });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.NewsArticle.list('-created_date')
      .then(setArticles)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    base44.entities.NewsCategory.list('sort_order').then(cats => setCategories(cats.map(c => c.name).filter(Boolean)));
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', excerpt: '', category: 'General', tag: 'General', venue: '', author: '', status: 'published', ...EMPTY_LOC });
    setShowForm(true);
  };

  const openEdit = (article) => {
    setEditing(article);
    setForm({
      title: article.title, excerpt: article.excerpt || '', category: article.category || 'General',
      tag: article.tag || 'General', venue: article.venue || '', author: article.author || '', status: article.status || 'published',
      state_code: article.state_code || '', state_name: article.state_name || '',
      market_id: article.market_id || '', market_name: article.market_name || '',
      area_id: article.area_id || '', area_name: article.area_name || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const updated = await base44.entities.NewsArticle.update(editing.id, { ...form, updated_at: new Date().toISOString() });
        setArticles(prev => prev.map(a => a.id === editing.id ? updated : a));
      } else {
        const created = await base44.entities.NewsArticle.create({ ...form, source: 'Happy Hour Flower', updated_at: new Date().toISOString() });
        setArticles(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      alert('Could not save the article: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await base44.entities.NewsArticle.delete(id);
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Could not delete the article: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
    }
  };

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
          <h3 className="font-semibold">{editing ? 'Edit Article' : 'New Article'}</h3>
        </div>
        <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
        <div className="space-y-1"><Label>Excerpt</Label><Textarea value={form.excerpt} onChange={e => setForm(p => ({...p, excerpt: e.target.value}))} rows={3} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Tag</Label><Input value={form.tag} onChange={e => setForm(p => ({...p, tag: e.target.value}))} /></div>
          <div className="space-y-1"><Label>Venue</Label><Input value={form.venue} onChange={e => setForm(p => ({...p, venue: e.target.value}))} /></div>
          <div className="space-y-1"><Label>Author</Label><Input value={form.author} onChange={e => setForm(p => ({...p, author: e.target.value}))} /></div>
          <div className="space-y-1"><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 pt-1 border-t">
          <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Location</Label>
          <AdminNewsLocationPicker
            value={{ state_code: form.state_code, state_name: form.state_name, market_id: form.market_id, market_name: form.market_name, area_id: form.area_id, area_name: form.area_name }}
            onChange={(loc) => setForm(p => ({ ...p, ...loc }))}
          />
        </div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button><Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button></div>
      </form>
    );
  }

  const visibleArticles = articles.filter(a => articleInTerritory(a, locationFilter));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-muted-foreground">{visibleArticles.length} articles</p>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Article</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : visibleArticles.map(a => (
        <div key={a.id} className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{a.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs py-0">{a.category}</Badge>
              <Badge variant={a.status === 'published' ? 'default' : 'outline'} className="text-xs py-0">{a.status}</Badge>
              <Badge variant="outline" className="text-xs py-0 gap-0.5"><MapPin className="w-3 h-3" /> {locationLabel(a)}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
            <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
          </div>
        </div>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
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