import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BlogArticlePreviewDialog from './BlogArticlePreviewDialog';
import BlogFactCheckAlert from './BlogFactCheckAlert';
import BlogSourceBadge from './BlogSourceBadge';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, ExternalLink, Globe, EyeOff, Archive, Eye, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_STYLES = {
  scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
  published: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function BlogArticleRow({ article, onEdit, onStatusChange, onDelete, factIssues, onDismissFactIssues, selected, onToggleSelect }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className={`bg-card border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 ${selected ? 'border-primary' : 'border-border'}`}>
      <Checkbox checked={!!selected} onCheckedChange={() => onToggleSelect(article)} aria-label="Select article" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${STATUS_STYLES[article.status] || ''} hover:bg-inherit`}>
            {article.status}
          </Badge>
          <BlogSourceBadge article={article} />
          <BlogFactCheckAlert
            title={article.title}
            issues={factIssues}
            onEdit={() => onEdit(article)}
            onDismiss={onDismissFactIssues ? () => onDismissFactIssues(article) : undefined}
          />
          {article.local_edit && (
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              Locally edited
            </Badge>
          )}
        </div>
        <p className="font-semibold text-foreground mt-2 truncate">{article.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {article.category || 'Uncategorized'}
          {article.published_at ? ` · ${new Date(article.published_at).toLocaleDateString()}` : ''}
          {article.source === 'wordpress' && article.wordpress_last_synced_at
            ? ` · Synced ${new Date(article.wordpress_last_synced_at).toLocaleString()}`
            : ''}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
          <Eye className="w-3.5 h-3.5" /> Preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(article)}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
        {article.status === 'published' ? (
          <Button size="sm" variant="outline" onClick={() => onStatusChange(article, 'scheduled')}>
            <EyeOff className="w-3.5 h-3.5" /> Unpublish
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onStatusChange(article, 'published')}>
            <Globe className="w-3.5 h-3.5" /> Publish
          </Button>
        )}
        {article.status !== 'archived' && (
          <Button size="sm" variant="ghost" onClick={() => onStatusChange(article, 'archived')}>
            <Archive className="w-3.5 h-3.5" />
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Delete article">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this article?</AlertDialogTitle>
              <AlertDialogDescription>
                "{article.title}" will be permanently deleted. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(article)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {article.slug && (
          <Link
            to={`/blog/${article.slug}`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-primary"
            aria-label="View article"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>

      <BlogArticlePreviewDialog
        article={article}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}