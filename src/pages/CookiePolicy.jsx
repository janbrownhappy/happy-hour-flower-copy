import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
  useEffect(() => {
    // Load a fresh embed script on every mount so the GetTerms widget always
    // initializes for the document on THIS page (a cached shared script won't re-scan).
    const script = document.createElement('script');
    script.src = 'https://gettermscdn.com/dist/js/embed.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <div
          className="getterms-document-embed"
          data-getterms="4JhBJ"
          data-getterms-document="cookies"
          data-getterms-lang="en-us"
          data-getterms-mode="direct"
          data-getterms-env="https://gettermscdn.com"
        />
      </div>
    </div>
  );
}