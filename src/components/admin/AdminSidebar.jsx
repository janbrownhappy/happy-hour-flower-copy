import { LayoutDashboard, Mail, ExternalLink, Store, Compass, ChevronDown, Megaphone, LifeBuoy, History, Newspaper, QrCode } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { openChangelog, openMessenger, isFeaturebaseConfigured } from '@/lib/featurebase';

// Shared admin sidebar content — rendered both in the fixed desktop sidebar
// and inside the mobile slide-out drawer.
export default function AdminSidebar({ groups, counts, currentTab, openGroups, toggleGroup, onSelectTab, onOpenDrillDown }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-heading font-bold leading-tight">Admin</h1>
            <p className="text-xs text-muted-foreground leading-tight">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="p-2 space-y-1 border-b border-border">
        <RouterLink to="/explore" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <Compass className="w-4 h-4" />
          <span className="flex-1 truncate">Explore Page</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </RouterLink>
        <RouterLink to="/venue-owner" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <Store className="w-4 h-4" />
          <span className="flex-1 truncate">Venue Owner Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </RouterLink>
        <RouterLink to="/admin/marketing" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all">
          <Mail className="w-4 h-4" />
          <span className="flex-1 truncate">Marketing & Email</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </RouterLink>
        <RouterLink to="/admin/qr" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <QrCode className="w-4 h-4" />
          <span className="flex-1 truncate">Marketing · QR Codes</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </RouterLink>
        <RouterLink to="/admin/blog" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <Newspaper className="w-4 h-4" />
          <span className="flex-1 truncate">Blog</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </RouterLink>
        <RouterLink to="/admin/changelog" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <History className="w-4 h-4" />
          <span className="flex-1 truncate">Changelog</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </RouterLink>
        {isFeaturebaseConfigured() && (
          <>
            <button onClick={openChangelog} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <Megaphone className="w-4 h-4" />
              <span className="flex-1 truncate text-left">What's New</span>
            </button>
            <button onClick={openMessenger} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <LifeBuoy className="w-4 h-4" />
              <span className="flex-1 truncate text-left">Support</span>
            </button>
          </>
        )}
      </div>

      {/* Mini stats */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-border">
        <div className="bg-muted rounded-lg p-2 text-center cursor-pointer hover:bg-muted/70" onClick={() => onOpenDrillDown('venues')}>
          <p className="text-lg font-bold text-primary leading-none">{counts.venues}</p>
          <p className="text-xs text-muted-foreground">Venues</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center cursor-pointer hover:bg-muted/70" onClick={() => onOpenDrillDown('listings')}>
          <p className="text-lg font-bold text-primary leading-none">{counts.listings}</p>
          <p className="text-xs text-muted-foreground">Listings</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center cursor-pointer hover:bg-muted/70" onClick={() => onOpenDrillDown('users')}>
          <p className="text-lg font-bold text-primary leading-none">{counts.users}</p>
          <p className="text-xs text-muted-foreground">Users</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-600 leading-none">{counts.claims}</p>
          <p className="text-xs text-amber-700">Pending</p>
        </div>
      </div>

      {/* Nav items — grouped into collapsible sections */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {groups.map(group => {
          const isOpen = openGroups[group.label];
          const groupBadge = group.tabs.reduce((sum, t) => sum + (t.badge > 0 ? t.badge : 0), 0);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full min-h-0 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                <span className="flex-1 text-left truncate">{group.label}</span>
                {!isOpen && groupBadge > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{groupBadge}</span>
                )}
              </button>
              {isOpen && (
                <div className="space-y-0 mt-0">
                  {group.tabs.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => onSelectTab(tab.value)}
                      className={`w-full min-h-0 flex items-center gap-2.5 pl-7 pr-3 py-1 rounded-md text-sm font-medium transition-all text-left leading-tight ${currentTab === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                      {tab.icon}
                      <span className="flex-1 truncate">{tab.label}</span>
                      {tab.badge > 0 && (
                        <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}