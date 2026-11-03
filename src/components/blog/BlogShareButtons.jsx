import { useState } from 'react';
import { Facebook, Linkedin, Link2, Check } from 'lucide-react';
import { articleUrl } from '@/lib/blogUtils';

export default function BlogShareButtons({ article }) {
  const [copied, setCopied] = useState(false);
  const url = encodeURIComponent(articleUrl(article.slug));
  const text = encodeURIComponent(article.title);

  const copy = async () => {
    await navigator.clipboard.writeText(articleUrl(article.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btn =
    'inline-flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Share</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${url}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className={btn}
      >
        <Facebook className="w-4 h-4" />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${url}&text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={btn}
      >
        <span className="text-sm font-bold">X</span>
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className={btn}
      >
        <Linkedin className="w-4 h-4" />
      </a>
      <button onClick={copy} aria-label="Copy link" className={btn}>
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}