import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getQrAnalytics } from '@/functions/getQrAnalytics';

export default function useQrData() {
  const [campaigns, setCampaigns] = useState([]);
  const [venues, setVenues] = useState([]);
  const [analytics, setAnalytics] = useState({ byQr: {}, summary: null });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [c, v, a] = await Promise.all([
      base44.entities.QrCampaign.list('-created_date', 1000),
      base44.entities.Venue.list('name', 2000),
      getQrAnalytics({}).then((r) => r.data).catch(() => ({ byQr: {}, summary: null })),
    ]);
    setCampaigns(c); setVenues(v); setAnalytics(a); setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  const venueMap = useMemo(() => Object.fromEntries(venues.map((v) => [v.id, v.name])), [venues]);
  const venueName = useCallback((id) => venueMap[id] || '', [venueMap]);
  return { campaigns, venues, analytics, loading, reload, venueName };
}