import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Clock, User, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useArticleSeo from '@/lib/useArticleSeo';
import sanitizeHtml from '@/lib/sanitizeHtml';
import { readTimeMinutes, formatDate } from '@/lib/blogUtils';
import BlogShareButtons from '@/components/blog/BlogShareButtons';
import BlogArticleCard from '@/components/blog/BlogArticleCard';

export default function SiteBlogArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    base44.entities.BlogArticle.filter({ slug, status: 'published' })
      .then(async (rows) => {
        const found = rows[0] || null;
        setArticle(found);
        if (found) {
          const all = await base44.entities.BlogArticle.filter(
            { status: 'published' },
            '-published_at',
            100
          );
          const tags = found.tags || [];
          setRelated(
            all
              .filter(
                (a) =>
                  a.id !== found.id &&
                  (a.category === found.category ||
                    (a.tags || []).some((t) => tags.includes(t)))
              )
              .slice(0, 3)
          );
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useArticleSeo(article);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="h-8 bg-muted rounded w-3/4 animate-pulse mb-4" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold">Article not found</h1>
        <p className="text-muted-foreground mt-2">
          This article may have been moved or unpublished.
        </p>
        <Link to="/blog" className="inline-flex items-center gap-2 text-primary mt-6 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to the blog
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> All articles
      </Link>

      {article.category && (
        <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
          {article.category}
        </Badge>
      )}

      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
        {article.title}
      </h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
        {article.author && (
          <span className="inline-flex items-center gap-1.5">
            <User className="w-4 h-4" /> {article.author}
          </span>
        )}
        <span>{formatDate(article.published_at)}</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> {readTimeMinutes(article.body_html)} min read
        </span>
      </div>

      {article.featured_image_url && (
        <img
          src={article.featured_image_url}
          alt={article.title}
          className="w-full rounded-xl mt-8 object-cover"
        />
      )}

      <div
        className="prose prose-lg max-w-none mt-8 text-foreground prose-headings:font-heading prose-a:text-primary allow-select"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body_html) }}
      />

      {article.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-10">
          {article.tags.map((t) => (
            <span
              key={t}
              className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-border">
        <BlogShareButtons article={article} />
      </div>

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="font-heading text-xl font-bold mb-5">Related articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((a) => (
              <BlogArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}