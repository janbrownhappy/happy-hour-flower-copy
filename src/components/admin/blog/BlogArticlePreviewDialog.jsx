import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import sanitizeHtml from '@/lib/sanitizeHtml';

export default function BlogArticlePreviewDialog({ article, open, onOpenChange }) {
  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">{article.title}</DialogTitle>
        </DialogHeader>

        {article.featured_image_url && (
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full rounded-lg object-cover max-h-64"
          />
        )}

        {article.excerpt && (
          <p className="text-sm text-muted-foreground italic">{article.excerpt}</p>
        )}

        <div
          className="prose prose-sm max-w-none allow-select [&_h2]:font-heading [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body_html) || '<p>No content yet.</p>' }}
        />
      </DialogContent>
    </Dialog>
  );
}