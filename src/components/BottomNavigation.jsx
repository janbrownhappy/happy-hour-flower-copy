import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Persistent native-style tab bar. Remembers each tab's last screen (tabStacks).
export default function BottomNavigation({ items, tabPaths, pathname, currentTab, tabStacks, onTap }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto bg-card border-t border-border pb-[env(safe-area-inset-bottom)] select-none">
      <div className="flex items-center justify-around h-16">
        {items.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path || (!tabPaths.includes(pathname) && currentTab === path);
          return (
            <Link
              key={path}
              to={path}
              onClick={(e) => onTap(e, path)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-1 py-2 min-h-[44px] rounded-lg transition-colors min-w-0 flex-1 select-none',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'fill-primary/20')} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}