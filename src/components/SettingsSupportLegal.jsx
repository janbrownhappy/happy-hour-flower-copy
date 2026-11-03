import { Link } from 'react-router-dom';
import { Shield, ExternalLink, FileText } from 'lucide-react';

export default function SettingsSupportLegal() {
  const rowClass = 'flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors';
  return (
    <div className="bg-card border rounded-xl p-6 max-w-lg mt-4">
      <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4" /> Legal
      </h2>
      <div className="space-y-2">
        <Link to="/privacy" className={rowClass}>
          <span className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-muted-foreground" /> Privacy Policy
          </span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/terms" className={rowClass}>
          <span className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-muted-foreground" /> Terms of Service
          </span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}