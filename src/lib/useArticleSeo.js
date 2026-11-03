import { useEffect } from 'react';
import { extractFaqs, stripHtml, articleUrl } from '@/lib/blogUtils';

// Sets <title>, meta description, Open Graph / Twitter cards, canonical link and
// JSON-LD structured data (Article + FAQPage) for an article, then cleans up on unmount.
export default function useArticleSeo(article) {
  useEffect(() => {
    if (!article) return;

    const created = [];
    const previousTitle = document.title;

    const setMeta = (attr, key, content) => {
      if (!content) return;
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute('content', content);
    };

    const title = article.seo_title || article.title;
    const description =
      article.seo_description || article.excerpt || stripHtml(article.body_html).slice(0, 160);
    // WordPress is the authoritative web version of synced articles.
    const url =
      article.source === 'wordpress' && article.wordpress_url ? article.wordpress_url : articleUrl(article.slug);
    const image = article.featured_image_url;

    document.title = title;
    setMeta('name', 'description', description);
    if (article.seo_keywords?.length) setMeta('name', 'keywords', article.seo_keywords.join(', '));
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);
    setMeta('property', 'article:published_time', article.published_at);
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
      created.push(canonical);
    }
    canonical.setAttribute('href', url);

    // JSON-LD: Article always, FAQPage when the body contains question headings.
    const graph = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description,
        image: image ? [image] : undefined,
        datePublished: article.published_at,
        dateModified: article.updated_date || article.published_at,
        author: { '@type': 'Person', name: article.author || 'Happy Hour Flower' },
        publisher: {
          '@type': 'Organization',
          name: 'Happy Hour Flower',
          url: window.location.origin,
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        keywords: article.seo_keywords?.join(', ') || undefined,
      },
    ];

    const faqs = extractFaqs(article.body_html);
    if (faqs.length) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    }

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.setAttribute('data-blog-ld', 'true');
    ld.textContent = JSON.stringify(graph);
    document.head.appendChild(ld);
    created.push(ld);

    return () => {
      document.title = previousTitle;
      created.forEach((el) => el.remove());
    };
  }, [article]);
}