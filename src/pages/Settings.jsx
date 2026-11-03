import { useState } from 'react';
import { Mail, Palette, Save, CheckCircle, Shield, ExternalLink, LifeBuoy, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailTemplatesAdmin from '@/components/admin/EmailTemplatesAdmin';
import FeaturebaseMenu from '@/components/featurebase/FeaturebaseMenu';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import SettingsAccountDeletion from '@/components/SettingsAccountDeletion';
import SettingsSupportLegal from '@/components/SettingsSupportLegal';
import { useAuth } from '@/lib/AuthContext';

const BRANDING_STORAGE_KEY = 'hhf_branding';

function loadBranding() {
  try {
    return JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || ['jan.brown@happyhourflower.com', 'jb@happyhourflower.com'].includes(user?.email?.toLowerCase());
  const saved = loadBranding();
  const [branding, setBranding] = useState({
    sender_name: saved.sender_name || 'Happy Hour Flower',
    sender_email: saved.sender_email || 'hello@happyhourflower.com',
    app_url: saved.app_url || '',
    support_email: saved.support_email || '',
  });
  const [brandingSaved, setBrandingSaved] = useState(false);

  const handleBrandingSave = () => {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
    setBrandingSaved(true);
    toast.success('Branding settings saved');
    setTimeout(() => setBrandingSaved(false), 2500);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Review our policies or manage your account.</p>
        <SettingsSupportLegal />
        <SettingsAccountDeletion />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage app branding and email templates.</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="mb-6">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <div className="bg-card border rounded-xl p-6 max-w-lg space-y-5">
            <div>
              <h2 className="font-semibold text-base mb-0.5">Sender & Branding Details</h2>
              <p className="text-sm text-muted-foreground">
                These values appear in automated emails sent by the platform. Update your app name in the{' '}
                <a href="https://base44.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline">
                  Base44 Dashboard → Overview
                </a>{' '}
                to change the verification email sender name.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Sender Display Name</Label>
                <Input
                  value={branding.sender_name}
                  onChange={e => setBranding(b => ({ ...b, sender_name: e.target.value }))}
                  placeholder="Happy Hour Flower"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown as the "From" name in outgoing emails.</p>
              </div>

              <div>
                <Label>Sender Email Address</Label>
                <Input
                  value={branding.sender_email}
                  onChange={e => setBranding(b => ({ ...b, sender_email: e.target.value }))}
                  placeholder="hello@happyhourflower.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Used in email "From" and "Reply-To" headers.</p>
              </div>

              <div>
                <Label>App URL</Label>
                <Input
                  value={branding.app_url}
                  onChange={e => setBranding(b => ({ ...b, app_url: e.target.value }))}
                  placeholder="https://happyhourflower.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Used for links inside email templates ({"{{app_url}}"}).</p>
              </div>

              <div>
                <Label>Support Email</Label>
                <Input
                  value={branding.support_email}
                  onChange={e => setBranding(b => ({ ...b, support_email: e.target.value }))}
                  placeholder="support@happyhourflower.com"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={handleBrandingSave}
              className={brandingSaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {brandingSaved ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Branding</>
              )}
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Note:</strong> The verification email sender name is controlled by your <strong>Base44 app name</strong>, which you've already updated in the dashboard. New registrations will see the updated name automatically.
            </div>
          </div>

          <SettingsSupportLegal />
        </TabsContent>

        <TabsContent value="emails">
          <EmailTemplatesAdmin />
        </TabsContent>
      </Tabs>
      <SettingsAccountDeletion />
    </div>
  );
}