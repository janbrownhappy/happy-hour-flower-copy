import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Crown, Sparkles, Store, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'consumer', label: 'Consumer Premium', icon: Sparkles },
  { value: 'venue_premium', label: 'Venue Premium', icon: Store },
  { value: 'venue_platinum', label: 'Venue Platinum', icon: Crown },
];

function FeatureList({ flags, savingKey, onToggle }) {
  const enabledCount = flags.filter((f) => f.is_enabled).length;

  if (flags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No features in this group yet.
      </p>
    );
  }

  return (
    <div>
      <Badge variant="outline" className="mb-4">
        {enabledCount} of {flags.length} enabled
      </Badge>
      <div className="space-y-3">
        {flags.map((flag) => (
          <Card
            key={flag.id}
            className={`p-4 flex items-center justify-between gap-4 transition-colors ${
              flag.is_enabled ? 'bg-card' : 'bg-muted/40'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                flag.is_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold leading-tight">{flag.label || flag.feature_key}</p>
                  {!flag.is_enabled && (
                    <Badge variant="secondary" className="text-xs">Disabled</Badge>
                  )}
                </div>
                {flag.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savingKey === flag.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={flag.is_enabled}
                onCheckedChange={(enabled) => onToggle(flag, enabled)}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.FeatureFlag.list('sort_order');
    setFlags(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag, enabled) => {
    setSavingKey(flag.id);
    // Optimistic UI update
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: enabled } : f)));
    await base44.entities.FeatureFlag.update(flag.id, { is_enabled: enabled });
    setSavingKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <h2 className="font-heading text-2xl font-bold">Features</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle each premium feature on or off. Disabling a feature here makes it
          unavailable to everyone in that group across the app, even paid subscribers.
        </p>
      </div>

      <Tabs defaultValue="consumer">
        <TabsList className="mb-5">
          {CATEGORIES.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map(({ value }) => (
          <TabsContent key={value} value={value}>
            <FeatureList
              flags={flags.filter((f) => (f.category || 'consumer') === value)}
              savingKey={savingKey}
              onToggle={toggle}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}