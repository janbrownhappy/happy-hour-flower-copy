import { useState, useEffect } from 'react';
import { MapPin, Check, Loader2 } from 'lucide-react';
import AreaSelect from '@/components/location/AreaSelect';
import { useLocation as useLocationPrefs } from '@/lib/LocationContext';

export default function MyTerritory() {
  const { locationPrefs, updateLocationPrefs, loaded } = useLocationPrefs();

  const [area, setArea] = useState('');
  const [pending, setPending] = useState(null); // { area, market_id, market_name, state_code }
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate from saved prefs once loaded
  useEffect(() => {
    if (loaded) setArea(locationPrefs.area || '');
  }, [loaded, locationPrefs.area]);

  const handleSave = async () => {
    setSaving(true);
    await updateLocationPrefs({
      area,
      market_id: pending?.market_id || locationPrefs.market_id || '',
      market_name: pending?.market_name || locationPrefs.market_name || '',
      state_code: pending?.state_code || locationPrefs.state_code || '',
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  if (!loaded) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <h3 className="font-semibold flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-primary" /> My Territory
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Set your area to personalize the venues you see on Explore.
      </p>

      <AreaSelect
        value={area}
        onChange={(areaId, rec) => {
          setArea(areaId);
          setPending(rec ? { area: areaId, market_id: rec.market_id, market_name: rec.market_name, state_code: rec.state_code } : { area: '', market_id: '', market_name: '', state_code: '' });
        }}
        labelClassName="text-xs font-medium text-muted-foreground"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          savedFlash ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
        } disabled:opacity-60`}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : savedFlash ? (
          <><Check className="w-4 h-4" /> Saved!</>
        ) : (
          'Save My Territory'
        )}
      </button>
    </div>
  );
}