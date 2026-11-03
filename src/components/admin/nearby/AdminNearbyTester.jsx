import { useState } from 'react';
import { processLocation } from '@/functions/processLocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import NearbyRadiusSetting from './NearbyRadiusSetting';
import NearbyResults from './NearbyResults';
import MissingCoordinatesList from './MissingCoordinatesList';
import LocationDiagnosticLogTable from './LocationDiagnosticLogTable';
import DespiaDeviceTest from '@/components/admin/nearby/DespiaDeviceTest';
import ArrivalSettingsPanel from './ArrivalSettingsPanel';
import FieldTestPanel from '@/components/admin/fieldtest/FieldTestPanel';
import ArrivalTestMode from './ArrivalTestMode';
import ArrivalDiagnosticTable from './ArrivalDiagnosticTable';

// Phase 2 admin testing tool — calls the same processLocation endpoint as the app.
export default function AdminNearbyTester() {
  const [form, setForm] = useState({ latitude: '', longitude: '', accuracy: '', radius: '50' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState(0);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const run = async () => {
    setLoading(true); setError('');
    try {
      const res = await processLocation({
        latitude: Number(form.latitude), longitude: Number(form.longitude),
        accuracy: form.accuracy === '' ? null : Number(form.accuracy),
        timestamp: new Date().toISOString(), test_mode: true, radius_meters: Number(form.radius),
      });
      setResult(res.data);
    } catch (e) {
      setResult(null);
      setError(e?.response?.data?.error || 'Request failed');
    }
    setLoading(false); setRuns((r) => r + 1);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-xl font-heading font-bold">Nearby Detection (Phase 2)</h2>
        <p className="text-sm text-muted-foreground">Test the server-side nearby-venue calculation. Test radius does not change the production setting.</p>
      </div>
      <NearbyRadiusSetting onLoaded={(r) => setForm((f) => ({ ...f, radius: String(r) }))} />
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Latitude</Label><Input value={form.latitude} onChange={set('latitude')} placeholder="34.8526" /></div>
          <div><Label>Longitude</Label><Input value={form.longitude} onChange={set('longitude')} placeholder="-82.3940" /></div>
          <div><Label>GPS accuracy (m, optional)</Label><Input value={form.accuracy} onChange={set('accuracy')} /></div>
          <div><Label>Test radius (m)</Label><Input type="number" value={form.radius} onChange={set('radius')} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[50, 75, 100].map((r) => (
            <Button key={r} size="sm" variant={form.radius === String(r) ? 'default' : 'outline'} onClick={() => setForm({ ...form, radius: String(r) })}>{r} m</Button>
          ))}
          <Button onClick={run} disabled={loading || !form.latitude || !form.longitude} className="ml-auto">
            {loading && <Loader2 className="animate-spin" />} Find nearby venues
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <NearbyResults result={result} />
      </div>
      <ArrivalSettingsPanel />
      <ArrivalTestMode onRun={() => setRuns((r) => r + 1)} />
      <ArrivalDiagnosticTable refreshKey={runs} />
      <FieldTestPanel />
      <DespiaDeviceTest />
      <MissingCoordinatesList />
      <LocationDiagnosticLogTable refreshKey={runs} />
    </div>
  );
}