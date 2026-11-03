import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const EVENT = 'hhf:blocks-changed';
let cache = null;

async function loadBlocked() {
  if (cache) return cache;
  const me = await base44.auth.me().catch(() => null);
  if (!me) return new Set();
  const rows = await base44.entities.UserBlock.filter({ created_by_id: me.id }).catch(() => []);
  cache = new Set(rows.map((r) => r.blocked_user_id));
  return cache;
}

export async function blockUser(userId, name) {
  await base44.entities.UserBlock.create({ blocked_user_id: userId, blocked_name: name || '' });
  (await loadBlocked()).add(userId);
  window.dispatchEvent(new Event(EVENT));
}

// Returns the Set of user ids the current user has blocked; updates live when someone is blocked.
export default function useBlockedUsers() {
  const [blocked, setBlocked] = useState(cache || new Set());
  useEffect(() => {
    const refresh = () => loadBlocked().then((s) => setBlocked(new Set(s)));
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);
  return blocked;
}