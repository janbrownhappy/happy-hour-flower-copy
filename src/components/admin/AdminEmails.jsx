import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Zap, CalendarClock, Mail, User, Store, Shield, Pencil } from 'lucide-react';
import { EMAIL_CATALOG } from '@/lib/emailCatalog';

// Every automated email the app sends, sourced from the shared catalog so the
// internal template name is available to open the editor directly.

const audienceMeta = {
  consumer: { label: 'Consumer', icon: <User className="w-3.5 h-3.5" /> },
  owner: { label: 'Venue Owner', icon: <Store className="w-3.5 h-3.5" /> },
  admin: { label: 'Admin', icon: <Shield className="w-3.5 h-3.5" /> },
};

function EmailRow({ item, onEdit }) {
  const isScheduled = item.trigger === 'Scheduled';
  return (
    <div className="border border-border rounded-lg p-4 bg-card flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{item.label}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
        {!isScheduled && (
          <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> {item.trigger}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
          {isScheduled ? <CalendarClock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {item.frequency}
        </Badge>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onEdit(item.name)}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </div>
  );
}

export default function AdminEmails({ onEditEmail }) {
  const groups = ['consumer', 'owner', 'admin'];
  const handleEdit = (name) => onEditEmail?.(name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xl font-heading font-bold">Automatic Emails</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every email the app sends on its own. Tap Edit to change the subject and content — no code needed.
          </p>
        </div>
      </div>

      {groups.map((aud) => {
        const items = EMAIL_CATALOG.filter((e) => e.audience === aud);
        const meta = audienceMeta[aud];
        return (
          <div key={aud}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-primary">{meta.icon}</span>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                {meta.label} ({items.length})
              </h3>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <EmailRow key={item.name} item={item} onEdit={handleEdit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}