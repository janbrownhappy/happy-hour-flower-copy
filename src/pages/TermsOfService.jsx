import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/settings'));
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
    <div className="min-h-screen bg-background safe-area-pt">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div
          className="getterms-document-embed"
          data-getterms="4JhBJ"
          data-getterms-document="terms-of-service"
          data-getterms-lang="en-us"
          data-getterms-mode="direct"
          data-getterms-env="https://gettermscdn.com"
        />
      </div>
    </div>
  );
}