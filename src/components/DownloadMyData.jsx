import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

// Lets a user export everything we store about them as a single JSON file.
// Pulls the user record, their profile, and all records they created across
// the entities tied to a consumer account.
export default function DownloadMyData({ user, profile }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const byMe = { created_by_id: user.id };
      const [
        favorites,
        checkIns,
        passes,
        crewMembers,
        reviews,
        notifications,
      ] = await Promise.all([
        base44.entities.Favorite.filter(byMe).catch(() => []),
        base44.entities.CheckIn.filter(byMe).catch(() => []),
        base44.entities.PassInstance.filter({ consumer_user_id: user.id }).catch(() => []),
        base44.entities.CrewMember.filter({ owner_id: user.id }).catch(() => []),
        base44.entities.Review.filter(byMe).catch(() => []),
        base44.entities.VenueNotification.filter({ user_id: user.id }).catch(() => []),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        account: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          created_date: user.created_date,
        },
        profile: profile || null,
        favorites,
        check_ins: checkIns,
        passes,
        crew_members: crewMembers,
        reviews,
        venue_notifications: notifications,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${user.email || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <h3 className="font-semibold flex items-center gap-2 mb-1">
        <Download className="w-4 h-4" /> My Data
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Download a copy of all the personal data we store about your account.
      </p>
      <Button
        variant="outline"
        className="w-full min-h-[44px]"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        {loading ? 'Preparing your data…' : 'Download My Data'}
      </Button>
    </div>
  );
}