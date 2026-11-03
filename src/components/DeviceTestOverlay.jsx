import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getDespiaState, subscribeDespia } from '@/lib/despiaLocation';

export const DEVICE_TEST_KEY = 'hhf_device_test_mode';

// Admin-only floating field-test panel (toggled from Admin → Nearby Detection → Despia Device Test).
export default function DeviceTestOverlay({ isAdmin }) {
  const [s, setS] = useState(getDespiaState());
  const [on, setOn] = useState(() => localStorage.getItem(DEVICE_TEST_KEY) === '1');
  useEffect(() => subscribeDespia(setS), []);
  useEffect(() => {
    const f = () => setOn(localStorage.getItem(DEVICE_TEST_KEY) === '1');
    window.addEventListener(DEVICE_TEST_KEY, f);
    return () => window.removeEventListener(DEVICE_TEST_KEY, f);
  }, []);
  if (!isAdmin || !on) return null;

  const a = s.response?.arrival;
  const near = s.response?.diagnostic_closest || s.response?.nearby?.[0];
  const visit = a?.visits?.find((v) => v.venue_id === near?.venue_id);
  const row = (k, v) => <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><b className="text-right">{v ?? '—'}</b></div>;

  return (
    <div className="fixed top-16 right-2 z-[60] w-64 bg-card/95 border border-border rounded-xl p-3 text-[11px] shadow-lg space-y-2">
      <button onClick={() => { localStorage.removeItem(DEVICE_TEST_KEY); setOn(false); }} className="absolute top-1 right-1 p-1 min-h-0"><X className="w-3 h-3" /></button>
      <div><p className="font-bold">DESPIA</p>{row('Detected', s.detected ? 'Yes' : 'No')}</div>
      <div><p className="font-bold">GPS</p>
        {row('Permission', s.permission)}{row('Background Tracking', s.tracking ? 'Active' : 'Inactive')}
        {row('Last Update', s.last?.timestamp ? new Date(s.last.timestamp * 1000).toLocaleTimeString() : null)}
        {row('Accuracy', s.last ? `${Math.round(s.last.horizontalAccuracy)} m` : null)}{row('Submission', s.submission)}
      </div>
      <div><p className="font-bold">HHF</p>
        {row('Closest Venue', near?.venue_name)}{row('Distance', near ? `${near.distance_meters} m` : null)}
        {row('Arrival Radius', `${s.response?.search_radius_meters ?? 50} m`)}{row('Inside Arrival Radius', near ? (near.distance_meters <= (s.response?.search_radius_meters ?? 50) ? 'Yes' : 'No') : null)}
        {row('Current State', visit?.current_state || (s.response ? 'OUTSIDE' : null))}
        {row('Active Special', near ? (near.has_active_special ? 'Yes' : 'No') : null)}{row('Notification Eligible', visit ? (visit.notification_eligible ? 'Yes' : 'No') : null)}
        {row('Actual Push Delivery', 'DISABLED — PHASE 5')}
      </div>
      {s.error && <p className="text-destructive">{s.error}</p>}
    </div>
  );
}