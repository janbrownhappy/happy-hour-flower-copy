import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/**
 * Toggle that requests the browser's geolocation permission and persists the
 * granted/denied result to the user's Profile (location_services_enabled).
 */
export default function LocationServicesToggle({ enabled, onChange }) {
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleToggle = (val) => {
    setDenied(false);
    if (!val) {
      // Turning off — just persist false (browser permission can't be revoked from JS).
      onChange(false);
      return;
    }
    if (!navigator.geolocation) {
      setDenied(true);
      onChange(false);
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setRequesting(false);
        onChange(true);
      },
      () => {
        setRequesting(false);
        setDenied(true);
        onChange(false);
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4" /> Location Services
      </h3>
      <div className="flex items-center justify-between">
        <div className="pr-3">
          <p className="text-sm font-medium">Use my location</p>
          <p className="text-xs text-muted-foreground">
            We use your location to show happy hours near you, distances on the map, and (if you turn on arrival alerts) a heads-up about specials when you arrive at a venue. We never sell your location, and you can turn this off anytime.
          </p>
        </div>
        {requesting ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <Switch checked={!!enabled} onCheckedChange={handleToggle} />
        )}
      </div>
      {denied && (
        <p className="text-xs text-destructive mt-2">
          Location permission was blocked. Enable it in your phone's Settings for Happy Hour Flower to use this feature.
        </p>
      )}
    </div>
  );
}