import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff, Clock, Check, CheckCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  happy_hour_updated: { icon: '🕐', color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  deals_updated: { icon: '🎉', color: 'bg-amber-500/10 border-amber-500/30 text-amber-600' },
  new_event: { icon: '📅', color: 'bg-purple-500/10 border-purple-500/30 text-purple-600' },
  new_listing: { icon: '✨', color: 'bg-green-500/10 border-green-500/30 text-green-600' },
};

export default function VenueNotificationFeed({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    base44.entities.VenueNotification.filter({ user_id: userId }, '-created_date', 30)
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [userId]);

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await base44.functions.invoke('markNotificationsRead', { ids: [notif.id] });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length) await base44.functions.invoke('markNotificationsRead', { all: true });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Venue Updates</span>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-white text-xs px-1.5 py-0 h-5">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      {/* Feed */}
      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No venue updates yet</p>
          <p className="text-xs text-muted-foreground mt-1">When your favorite venues update their deals, you'll see it here</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {notifications.map(notif => {
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.happy_hour_updated;
            return (
              <Link
                key={notif.id}
                to={`/venue/${notif.venue_id}`}
                onClick={() => markRead(notif)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${!notif.is_read ? 'bg-primary/3' : ''}`}
              >
                {/* Unread dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  {!notif.is_read && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!notif.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                  <div className="flex items-center gap-1.5 mt-1">
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
  );
}