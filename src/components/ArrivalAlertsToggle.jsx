import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { isDespia, getDespiaState, subscribeDespia } from '@/lib/despiaLocation';
import { ARRIVAL_ALERTS_EVENT } from '@/hooks/useDespiaArrivalTracking';

// Arrival Alerts preference — only shown inside the native (Despia) app.
export default function ArrivalAlertsToggle({ enabled, onChange }) {
  const [dev, setDev] = useState(getDespiaState());
  useEffect(() => subscribeDespia(setDev), []);
  if (!isDespia()) return null;

  const toggle = (val) => {
    onChange(val);
    window.dispatchEvent(new CustomEvent(ARRIVAL_ALERTS_EVENT, { detail: val }));
  };
  const noFix = enabled && dev.permission.startsWith('no_fix');

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="pr-3">
          <p className="text-sm font-semibold flex items-center gap-2"><BellRing className="w-4 h-4" /> Arrival Alerts</p>
          <p className="text-xs text-muted-foreground">Let us know when you arrive at a venue with a happy hour running. Uses background location ("Always" permission).</p>
        </div>
        <Switch checked={!!enabled} onCheckedChange={toggle} />
      </div>
      {noFix && <p className="text-xs text-destructive mt-2">We aren't receiving your location. Allow location access for Happy Hour Flower in your device Settings to use Arrival Alerts.</p>}
    </div>
  );
}