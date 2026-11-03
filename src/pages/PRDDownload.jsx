import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { PRD_VENUE_CLAIM_PORTAL } from '@/docs/prdVenueClaimPortal';

export default function PRDDownload() {
  const handleDownload = () => {
    const blob = new Blob([PRD_VENUE_CLAIM_PORTAL], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PRD-Venue-Claim-Portal.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl">Venue Claim Portal — PRD</h1>
          <p className="text-sm text-muted-foreground">Planned standalone landing page · saved reference document</p>
        </div>
      </div>

      <Button onClick={handleDownload} className="gap-2">
        <Download className="w-4 h-4" />
        Download PRD (.md)
      </Button>

      <div className="border border-border rounded-xl bg-card p-6 overflow-x-auto">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed allow-select">{PRD_VENUE_CLAIM_PORTAL}</pre>
      </div>
    </div>
  );
}