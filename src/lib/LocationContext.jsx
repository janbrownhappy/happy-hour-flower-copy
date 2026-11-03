import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const LocationContext = createContext(null);

const EMPTY_PREFS = {
  state: '',
  state_code: '',
  state_id: '',
  market: '',
  market_id: '',
  market_name: '',
  city: '',
  zip_code: '',
  area: '',
  area_id: '',
};

export function LocationProvider({ children, user }) {
  const [locationPrefs, setLocationPrefs] = useState(EMPTY_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Load preferences from profile on mount
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    base44.entities.Profile.filter({ created_by_id: user.id })
      .then(profiles => {
        const profile = profiles[0];
        const lp = profile?.location_preferences;
        if (lp) {
          setLocationPrefs({
            state: lp.state || '',
            state_code: lp.state_code || '',
            state_id: lp.state_id || '',
            market: lp.market || '',
            market_id: lp.market_id || '',
            market_name: lp.market_name || '',
            city: lp.city || '',
            zip_code: lp.zip_code || profile.zip_code || '',
            area: lp.area || '',
            area_id: lp.area_id || '',
          });
        } else if (profile?.zip_code) {
          setLocationPrefs({ ...EMPTY_PREFS, zip_code: profile.zip_code });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user?.id]);

  const updateLocationPrefs = async (updates, persist = true) => {
    const next = { ...locationPrefs, ...updates };
    setLocationPrefs(next);
    if (persist && user) {
      try {
        const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
        const locData = { ...next, last_updated: new Date().toISOString() };
        if (profiles.length > 0) {
          await base44.entities.Profile.update(profiles[0].id, {
            zip_code: next.zip_code,
            location_preferences: locData,
          });
        } else {
          await base44.entities.Profile.create({
            zip_code: next.zip_code,
            location_preferences: locData,
          });
        }
      } catch (e) {
        // silent fail — UI already updated
      }
    }
  };

  return (
    <LocationContext.Provider value={{ locationPrefs, updateLocationPrefs, loaded }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}