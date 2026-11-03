import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DeleteAccountSection from '@/components/DeleteAccountSection';

// Loads the signed-in user + profile and renders the shared account deletion flow.
export default function SettingsAccountDeletion() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const profiles = await base44.entities.Profile.filter({ created_by_id: u.id });
      setProfile(profiles[0] || null);
    }).catch(() => {});
  }, []);

  if (!user) return null;
  return (
    <div className="mt-8">
      <DeleteAccountSection user={user} profile={profile} />
    </div>
  );
}