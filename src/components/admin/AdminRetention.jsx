import { useState } from 'react';
import { LayoutDashboard, ListChecks, Settings } from 'lucide-react';
import RetentionDashboard from './retention/RetentionDashboard';
import RetentionQueue from './retention/RetentionQueue';
import RetentionSettings from './retention/RetentionSettings';
import RetentionProfileDrawer from './retention/RetentionProfileDrawer';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'queue', label: 'At-Risk Queue', icon: ListChecks },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminRetention() {
  const [tab, setTab] = useState('dashboard');
  const [openAccount, setOpenAccount] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openAccountDrawer = (accountRefId) => {
    setOpenAccount(accountRefId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <RetentionDashboard onOpenAccount={openAccountDrawer} />}
      {tab === 'queue' && <RetentionQueue onOpenAccount={openAccountDrawer} />}
      {tab === 'settings' && <RetentionSettings />}

      <RetentionProfileDrawer
        accountRefId={openAccount}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}