import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Newspaper } from 'lucide-react';
import BlogArticleRow from '@/components/admin/blog/BlogArticleRow';
import BlogBulkActions from '@/components/admin/blog/BlogBulkActions';
import BlogArticleEditor from '@/components/admin/blog/BlogArticleEditor';
import BlogSyncSettings from '@/components/admin/blog/BlogSyncSettings';
import BlogTopicSuggester from '@/components/admin/blog/BlogTopicSuggester';
import WeeklyEventsDigest from '@/components/admin/blog/WeeklyEventsDigest';
import WordPressSyncButton from '@/components/admin/blog/WordPressSyncButton';

export default function AdminBlog() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [factIssues, setFactIssues] = useState({});
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    setLoading(true);
    const rows = await base44.entities.BlogArticle.list('-published_at', 500);
    setArticles(rows);
    setLoading(false);
    // Automated contact-info fact check so unverified drafts are flagged before publishing.
    const res = await base44.functions.invoke('auditBlogArticleFacts', {});
    const map = {};
    (res?.data?.flagged || []).forEach((f) => { map[f.id] = f.issues; });
    setFactIssues(map);
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (article, status) => {
    await base44.entities.BlogArticle.update(article.id, { status });
    load();
  };

  const deleteArticle = async (article) => {
    await base44.entities.BlogArticle.delete(article.id);
    load();
  };

  const toggleSelect = (article) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(article.id) ? next.delete(article.id) : next.add(article.id);
      return next;
    });

  // Process in small batches so large selections don't time out the database.
  const inBatches = async (fn) => {
    const ids = [...selected];
    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(ids.slice(i, i + 5).map(fn));
    }
    setSelected(new Set());
    load();
  };

  const bulkUnpublish = () =>
    inBatches((id) => base44.entities.BlogArticle.update(id, { status: 'scheduled' }));

  const bulkDelete = () => inBatches((id) => base44.entities.BlogArticle.delete(id));

  const q = search.trim().toLowerCase();
  const filtered = q
    ? articles.filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
      )
    : articles;

  const draftCount = articles.filter((a) => a.status === 'scheduled').length;

  const flaggedCount = articles.filter((a) => a.source === 'wordpress' && a.wordpress_sync_status === 'flagged').length;

  const lastSyncedAt = articles
    .map((a) => a.wordpress_last_synced_at)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold">Blog</h1>
            <p className="text-sm text-muted-foreground">
              {articles.length} article{articles.length === 1 ? '' : 's'}
              {draftCount > 0 ? ` · ${draftCount} awaiting review` : ''}
            </p>
          </div>
          <WordPressSyncButton onSynced={load} />
        </div>

        <Tabs defaultValue="articles">
          <TabsList className="mb-5 flex-wrap h-auto">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="pl-9"
              />
            </div>

            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <p className="font-heading font-semibold">No articles yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the Generate tab to create your first AI draft.
                </p>
              </div>
            ) : (
              <>
              <BlogBulkActions
                selectedCount={selected.size}
                allSelected={filtered.length > 0 && filtered.every((a) => selected.has(a.id))}
                onToggleAll={(checked) => setSelected(checked ? new Set(filtered.map((a) => a.id)) : new Set())}
                onUnpublish={bulkUnpublish}
                onDelete={bulkDelete}
              />
              {filtered.map((a) => (
                <BlogArticleRow
                  key={a.id}
                  article={a}
                  selected={selected.has(a.id)}
                  onToggleSelect={toggleSelect}
                  onEdit={setEditing}
                  onStatusChange={changeStatus}
                  onDelete={deleteArticle}
                  factIssues={factIssues[a.id]}
                  onDismissFactIssues={(article) =>
                    setFactIssues((prev) => {
                      const next = { ...prev };
                      delete next[article.id];
                      return next;
                    })
                  }
                />
              ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <WeeklyEventsDigest onGenerated={load} />
            <BlogTopicSuggester onGenerated={load} />
          </TabsContent>

          <TabsContent value="settings">
            <BlogSyncSettings onSynced={load} lastSyncedAt={lastSyncedAt} flaggedCount={flaggedCount} />
          </TabsContent>
        </Tabs>
      </div>

      {editing && (
        <BlogArticleEditor
          article={editing}
          factIssues={factIssues[editing.id]}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}