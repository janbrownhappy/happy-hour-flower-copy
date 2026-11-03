import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getDespiaState, subscribeDespia } from '@/lib/despiaLocation';
import { DEVICE_TEST_KEY } from '@/components/DeviceTestOverlay';
import DespiaHistoryTable from '@/components/admin/nearby/DespiaHistoryTable';

// Phase 4 field-test diagnostics: live device bridge state (when opened on the Despia device)
// plus the server-side Despia location history for the last retention window.
export default function DespiaDeviceTest() {
  const [s, setS] = useState(getDespiaState());
  const [testOn, setTestOn] = useState(() => localStorage.getItem(DEVICE_TEST_KEY) === '1');
  const [logs, setLogs] = useState(null);
  useEffect(() => subscribeDespia(setS), []);
  const load = () => base44.entities.LocationDiagnosticLog.filter({ source: 'despia' }, '-created_date', 300).then(setLogs);
  useEffect(() => { load(); }, []);

  const toggleTest = (v) => {
    v ? localStorage.setItem(DEVICE_TEST_KEY, '1') : localStorage.removeItem(DEVICE_TEST_KEY);
    setTestOn(v); window.dispatchEvent(new Event(DEVICE_TEST_KEY));
  };
  const item = (k, v) => <div><p className="text-[11px] text-muted-foreground">{k}</p><p className="text-sm font-medium break-all">{v ?? '—'}</p></div>;
  const near = s.response?.diagnostic_closest || s.response?.nearby?.[0];
  const visit = s.response?.arrival?.visits?.find((v) => v.venue_id === near?.venue_id);
  const radius = s.response?.search_radius_meters ?? 50;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">Despia Device Test (Phase 4)</p>
          <p className="text-xs text-muted-foreground">Live values appear when this page is opened inside the Despia app on the test device. Push delivery is locked OFF for Despia readings during Phase 4.</p>
        </div>
        <label className="flex items-center gap-2 text-xs shrink-0">Device Test Mode overlay <Switch checked={testOn} onCheckedChange={toggleTest} /></label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {item('Despia detected', s.detected ? 'Yes' : 'No')}{item('GPS permission', s.permission)}{item('Background tracking', s.tracking ? `Active (${s.movement_meters} m movement)` : 'Inactive')}
        {item('Last lat / lng', s.last ? `${s.last.latitude.toFixed(6)}, ${s.last.longitude.toFixed(6)}` : null)}{item('Accuracy', s.last ? `${Math.round(s.last.horizontalAccuracy)} m` : null)}
        {item('Timestamp', s.last?.timestamp ? new Date(s.last.timestamp * 1000).toLocaleString() : null)}{item('Since previous', s.interval_seconds != null ? `${s.interval_seconds}s` : null)}
        {item('Moved since previous', s.moved_meters != null ? `${s.moved_meters} m` : null)}{item('Backend submission', s.submission)}{item('Updates this session', s.updates)}
        {item('Closest venue', near ? `${near.venue_name} (${near.distance_meters} m)` : null)}{item('Arrival radius', `${radius} m`)}
        {item('Inside arrival radius', near ? (near.distance_meters <= radius ? 'Yes' : 'No') : null)}{item('Arrival state', visit?.current_state || (s.response ? 'OUTSIDE' : null))}
        {item('Notification eligible', visit ? (visit.notification_eligible ? 'Yes' : 'No') : null)}{item('Suppression', visit?.suppression_reason)}{item('Error', s.error)}
      </div>
      <div className="flex justify-between items-center"><p className="text-sm font-semibold">Despia location history</p><Button size="sm" variant="outline" onClick={load}>Refresh</Button></div>
      <DespiaHistoryTable logs={logs} />
    </div>
  );
}