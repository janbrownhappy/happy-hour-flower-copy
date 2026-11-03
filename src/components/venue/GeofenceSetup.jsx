import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { resolveW3W } from '@/functions/resolveW3W';
import { MapPin, CheckCircle, Loader2, Navigation, Save, Info } from 'lucide-react';

// Lets a venue owner set the venue's precise location via a what3words address.
// Resolving the address fills in lat/lng, which the GPS geofence watcher uses to
// trigger arrival notifications when a consumer enters the radius.
export default function GeofenceSetup({ venue, canEdit, onSaved }) {
  const [words, setWords] = useState(venue.w3w_address || '');
  const [radius, setRadius] = useState(venue.geofence_radius_meters || 100);
  const [enabled, setEnabled] = useState(venue.geofence_enabled || false);
  const [coords, setCoords] = useState(
    Number.isFinite(Number(venue.lat)) && Number.isFinite(Number(venue.lng)) && venue.lat && venue.lng
      ? { lat: Number(venue.lat), lng: Number(venue.lng) }
      : null
  );
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleResolve = async () => {
    if (!words.trim()) return;
    setResolving(true);
    setResolveError('');
    try {
      const res = await resolveW3W({ words: words.trim() });
      const data = res?.data;
      if (data?.success) {
        setCoords({ lat: data.lat, lng: data.lng });
        setWords(data.words);
      } else {
        setResolveError(data?.error || 'Could not resolve that what3words address.');
        setCoords(null);
      }
    } catch (err) {
      setResolveError(err?.response?.data?.error || 'Could not resolve that what3words address.');
      setCoords(null);
    } finally {
      setResolving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const update = {
        w3w_address: words.trim(),
        geofence_radius_meters: Number(radius) || 100,
        geofence_enabled: enabled,
      };
      if (coords) {
        update.lat = coords.lat;
        update.lng = coords.lng;
      }
      await base44.entities.Venue.update(venue.id, update);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.(update);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Foreground-only limitation disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-200 text-xs leading-relaxed">
          Arrival notifications currently fire only while a customer has the app <strong>open</strong>.
          Background arrival detection (notifying customers with the app closed) is coming in a future update.
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-white font-semibold flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-500" /> Geofence Location
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            Set your venue's precise location with a what3words address. When customers walk into your
            geofence, they get a "Welcome" notification with today's deals.
          </p>
        </div>

        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide">what3words Address</Label>
          <div className="flex gap-2 mt-1.5">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">///</span>
              <Input
                value={words}
                onChange={(e) => setWords(e.target.value)}
                disabled={!canEdit}
                className="bg-slate-700 border-slate-600 text-white h-11 pl-10"
                placeholder="filled.count.soap"
              />
            </div>
            <Button
              type="button"
              onClick={handleResolve}
              disabled={!canEdit || resolving || !words.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 h-11"
            >
              {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Locate'}
            </Button>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Find your venue's address at{' '}
            <a href="https://what3words.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
              what3words.com
            </a>
          </p>
          {resolveError && <p className="text-red-400 text-xs mt-1.5">{resolveError}</p>}
        </div>

        {coords && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm">
              Located: <span className="font-mono">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            </p>
          </div>
        )}

        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide">Geofence Radius (meters)</Label>
          <Input
            type="number"
            min={20}
            max={500}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            disabled={!canEdit}
            className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11"
          />
          <p className="text-slate-500 text-xs mt-1">Typical range is 50–150m. Customers crossing this radius trigger an arrival notification.</p>
        </div>

        <div className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3">
          <div>
            <p className="text-white text-sm font-medium">Enable Geofence Detection</p>
            <p className="text-slate-400 text-xs mt-0.5">Turn on arrival notifications for this venue.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit || !coords} />
        </div>
      </div>

      {canEdit ? (
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 font-semibold text-white rounded-xl transition-colors ${
            saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Geofence</>
          )}
        </Button>
      ) : (
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">You have view-only access. Contact an owner or editor to make changes.</p>
        </div>
      )}
    </div>
  );
}