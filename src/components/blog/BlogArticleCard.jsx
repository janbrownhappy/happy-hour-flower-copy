import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { readTimeMinutes, formatDate } from '@/lib/blogUtils';

export default function BlogArticleCard({ article }) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition-shadow min-h-0"
    >
      {article.featured_image_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-amber-100 to-amber-50" />
      )}

      <div className="p-5 flex flex-col gap-2 flex-1">
        {article.category && (
          <Badge className="self-start bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            {article.category}
          </Badge>
        )}
        <h2 className="font-heading text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
        )}
        <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(article.published_at)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {readTimeMinutes(article.body_html)} min read
          </span>
        </div>
      </div>
    </Link>
  );
}