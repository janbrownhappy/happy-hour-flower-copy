import { useEffect } from 'react';

export default function PageNotFound() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Page not found';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    meta.setAttribute('data-not-found', 'true');
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      meta.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-light text-muted-foreground">404</h1>
        <h2 className="text-2xl font-medium text-foreground">Page not found</h2>
        <a href="/" className="inline-block text-sm font-medium text-primary underline underline-offset-4">
          Go home
        </a>
      </div>
    </div>
  );
}