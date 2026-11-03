import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import BlogImageUpload from '@/components/admin/blog/BlogImageUpload';
import BlogRenderedReview from '@/components/admin/blog/BlogRenderedReview';
import BlogContactVerifier from '@/components/admin/blog/BlogContactVerifier';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BlogArticleEditor({ article, onClose, onSaved, factIssues }) {
  const [form, setForm] = useState({
    title: article.title || '',
    slug: article.slug || '',
    excerpt: article.excerpt || '',
    body_html: article.body_html || '',
    category: article.category || '',
    author: article.author || '',
    tags: (article.tags || []).join(', '),
    featured_image_url: article.featured_image_url || '',
    seo_title: article.seo_title || '',
    seo_description: article.seo_description || '',
    seo_keywords: (article.seo_keywords || []).join(', '),
    source_keyword: article.source_keyword || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    await base44.entities.BlogArticle.update(article.id, {
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      seo_keywords: form.seo_keywords.split(',').map((t) => t.trim()).filter(Boolean),
      local_edit: true,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl font-bold">Edit article</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} />
          </div>
          <div>
            <Label>Excerpt</Label>
            <Textarea
              rows={3}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
            />
          </div>
          <div>
            <Label>Body</Label>
            <Tabs defaultValue={factIssues?.length ? 'rendered' : 'html'} className="mt-2">
              <TabsList>
                <TabsTrigger value="rendered">Rendered</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
              </TabsList>
              <TabsContent value="rendered" className="space-y-4">
                {factIssues?.length > 0 && (
                  <BlogContactVerifier
                    articleId={article.id}
                    onApplyCorrection={(original, corrected) => {
                      if (!form.body_html.includes(original)) return false;
                      setForm((f) => ({
                        ...f,
                        body_html: f.body_html.split(original).join(corrected),
                      }));
                      return true;
                    }}
                  />
                )}
                <BlogRenderedReview html={form.body_html} issues={factIssues} />
              </TabsContent>
              <TabsContent value="html">
                <Textarea
                  rows={16}
                  className="font-mono text-xs"
                  value={form.body_html}
                  onChange={(e) => set('body_html', e.target.value)}
                />
              </TabsContent>
            </Tabs>
          </div>
          <div>
            <Label>Author</Label>
            <Input value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Jan Brown" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
            </div>
          </div>
          <BlogImageUpload
            label="Featured image"
            value={form.featured_image_url}
            onChange={(url) => set('featured_image_url', url)}
          />

          <div className="pt-4 border-t border-border space-y-4">
            <p className="font-heading font-bold">SEO & AEO</p>
            <div>
              <Label>SEO title</Label>
              <Input value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
            </div>
            <div>
              <Label>SEO description</Label>
              <Textarea
                rows={3}
                value={form.seo_description}
                onChange={(e) => set('seo_description', e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>SEO keywords (comma separated)</Label>
                <Input
                  value={form.seo_keywords}
                  onChange={(e) => set('seo_keywords', e.target.value)}
                />
              </div>
              <div>
                <Label>Source keyword</Label>
                <Input
                  value={form.source_keyword}
                  onChange={(e) => set('source_keyword', e.target.value)}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {article.source === 'wordpress'
              ? 'This article is synced from WordPress — local edits are overwritten the next time the post changes on WordPress.'
              : 'Saving marks this article as locally edited.'}
          </p>

          <div className="flex gap-3 pt-2 pb-10">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}