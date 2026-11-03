import { useEffect } from 'react';
import despia from 'despia-native';

// Links this phone's OneSignal subscription to the signed-in user's id so
// server pushes (include_external_user_ids) can reach them. Native app only.
export default function OneSignalUserLink({ user }) {
  useEffect(() => {
    if (!user?.id || !navigator.userAgent.toLowerCase().includes('despia')) return;
    try { despia(`setonesignalplayerid://?user_id=${user.id}`); } catch { /* not in native shell */ }
  }, [user?.id]);
  return null;
}