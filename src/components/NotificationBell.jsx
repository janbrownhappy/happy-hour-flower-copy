import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff, Clock, CheckCheck, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  happy_hour_updated: { icon: '🕐' },
  deals_updated: { icon: '🎉' },
  new_event: { icon: '📅' },
  new_listing: { icon: '✨' },
};

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!userId) return;
    base44.entities.VenueNotification.filter({ user_id: userId }, '-created_date', 30)
      .then(setNotifications)
      .catch(() => {});
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (notif) => {
    if (notif.is_read) return;
    // Update UI optimistically; ignore failures (e.g. a stale notification that was already deleted → 404)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    base44.functions.invoke('markNotificationsRead', { ids: [notif.id] }).catch(() => {});
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (unread.length) await base44.functions.invoke('markNotificationsRead', { all: true }).catch(() => {});
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Venue Updates</span>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-white text-xs px-1.5 py-0 h-5">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feed */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No venue updates yet</p>
              <p className="text-xs text-muted-foreground mt-1">Favorite a venue to get notified when they update deals</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {notifications.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.happy_hour_updated;
                return (
                  <Link
                    key={notif.id}
                    to={`/venue/${notif.venue_id}`}
                    onClick={() => { markRead(notif); setOpen(false); }}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-base">
                        {cfg.icon}
                      </div>
                      {!notif.is_read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!notif.is_read ? 'font-semibold' : 'font-medium text-foreground/80'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}