import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/lib/LocationContext';
import PullToRefresh from '@/components/PullToRefresh';

const PAGE_SIZE = 10;

// An article is relevant to the user if it's global (no location) or shares their
// saved territory. Broader articles (e.g. region-wide) match users in any city of
// that region; narrower neighborhood-only articles match users with that neighborhood.
function relevantToUser(article, prefs) {
  if (!article.state_id) return true; // global news shown to everyone
  // User without any saved territory sees all news.
  if (!prefs.state_id && !prefs.region_id && !prefs.city_id) return true;
  // Each level the article specifies must agree with the user's prefs (when the user has that level set).
  if (article.state_id && prefs.state_id && article.state_id !== prefs.state_id) return false;
  if (article.region_id && prefs.region_id && article.region_id !== prefs.region_id) return false;
  if (article.city_id && prefs.city_id && article.city_id !== prefs.city_id) return false;
  return true;
}

export default function News() {
  const { locationPrefs } = useLocation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);

  const loadNews = async () => {
    setLoading(true);
    const [a, cats] = await Promise.all([
      base44.entities.NewsArticle.list('-created_date', 500),
      base44.entities.NewsCategory.list('sort_order'),
    ]);
    setArticles(a.filter(x => x.status === 'published'));
    setCategories(cats.map(c => c.name));
    setLoading(false);
  };

  useEffect(() => { loadNews(); }, []);
  useEffect(() => { setPage(1); }, [locationPrefs.state_id, locationPrefs.region_id, locationPrefs.city_id]);
  const localized = articles.filter(a => relevantToUser(a, locationPrefs));
  const filtered = selectedCategory ? localized.filter(a => a.category === selectedCategory) : localized;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const categoryColors = {
    Featured: 'bg-primary text-white',
    Partnerships: 'bg-purple-100 text-purple-700',
    Guide: 'bg-blue-100 text-blue-700',
    General: 'bg-muted text-muted-foreground',
  };

  return (
    <PullToRefresh onRefresh={loadNews}>
    <div className="max-w-3xl mx-auto px-4 py-4">
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold">Greenville Happy Hour News and Updates</h1>
        <p className="text-muted-foreground text-sm mt-1">Latest from Happy Hour Flower</p>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              !selectedCategory ? 'bg-primary text-white border-primary' : 'bg-background border-border hover:border-primary'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(selectedCategory === cat ? '' : cat); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === cat ? 'bg-primary text-white border-primary' : 'bg-background border-border hover:border-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📰</p>
          <p>No articles yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map(article => (
            <article key={article.id} className="bg-card rounded-2xl p-4 border border-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={categoryColors[article.category] || 'bg-muted text-muted-foreground'}>
                  {article.category}
                </Badge>
                {article.tag && article.tag !== article.category && (
                  <Badge variant="outline">{article.tag}</Badge>
                )}
                {(article.neighborhood_name || article.city_name || article.region_name) && (
                  <Badge variant="outline" className="bg-muted/50">
                    📍 {article.neighborhood_name || article.city_name || article.region_name}
                  </Badge>
                )}
                {article.updated_at && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(article.updated_at), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-foreground">{article.title}</h2>
              {article.excerpt && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {article.author && <span>By {article.author}</span>}
                {article.venue && article.venue !== '' && (
                  <span>· 📍 {article.venue}</span>
                )}
                {article.source && <span>· {article.source}</span>}
              </div>
            </article>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}