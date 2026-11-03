import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ExternalLink } from 'lucide-react';

// Shows a claim proof (private file or legacy public link) inside the app.
export default function ProofViewerDialog({ proofUrl, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!proofUrl) return;
    setUrl(null); setError(null);
    if (/^https?:\/\//.test(proofUrl)) { setUrl(proofUrl); return; }
    // Fetch as a blob so the file renders inline even if the server marks it as a download.
    let objectUrl;
    base44.functions.invoke('getProofFileUrl', { file_uri: proofUrl })
      .then((r) => fetch(r.data.signed_url))
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then((blob) => {
        const type = /\.pdf$/i.test(proofUrl) ? 'application/pdf' : (blob.type || 'image/jpeg');
        objectUrl = URL.createObjectURL(new Blob([blob], { type }));
        setUrl(objectUrl);
      })
      .catch((e) => setError(e.message));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [proofUrl]);

  const isPdf = /\.pdf(\?|$)/i.test(proofUrl || '');

  return (
    <Dialog open={!!proofUrl} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Proof document</DialogTitle></DialogHeader>
        {error && <p className="text-sm text-destructive">Could not load file: {error}</p>}
        {!url && !error && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {url && (
          <div className="space-y-3">
            {isPdf
              ? <iframe src={url} title="Proof" className="w-full h-[70vh] rounded-lg border border-border" />
              : <img src={url} alt="Proof document" className="max-h-[70vh] w-full object-contain rounded-lg bg-muted" />}
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Open in new tab <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}