import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getClientConfig } from '@/lib/clientConfig';
import { isDespia, startDespiaTracking, stopDespiaTracking } from '@/lib/despiaLocation';

export const ARRIVAL_ALERTS_EVENT = 'hhf-arrival-alerts-changed';

// Starts Despia background GPS only when: inside Despia + signed in + Arrival Alerts ON.
// Permission is requested by Despia itself; points then flow to the backend.
export default function useDespiaArrivalTracking(user) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!isDespia() || !user) return;
    base44.entities.Profile.filter({ created_by_id: user.id }).then((p) => setEnabled(!!p[0]?.arrival_alerts_enabled)).catch(() => {});
    const onChange = (e) => setEnabled(!!e.detail);
    window.addEventListener(ARRIVAL_ALERTS_EVENT, onChange);
    return () => window.removeEventListener(ARRIVAL_ALERTS_EVENT, onChange);
  }, [user?.id]);

  useEffect(() => {
    if (!isDespia()) return;
    if (!user || !enabled) { stopDespiaTracking(); return; }
    getClientConfig()
      .then((cfg) => {
        const num = (k, d) => { const n = Number(cfg.settings?.[k]?.value_string); return n > 0 ? n : d; };
        startDespiaTracking({ movementMeters: num('despia_location_movement_meters', 500), bufferSeconds: num('despia_location_buffer_seconds', 60) });
      });
  }, [user?.id, enabled]);
}