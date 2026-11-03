import { useState, useEffect } from 'react';
import { getClientConfig } from '@/lib/clientConfig';

const SETTING_KEY = 'reviews_enabled';

// Reads the global "reviews_enabled" AppSetting flag.
// Reviews are OFF unless an admin explicitly turns them on.
export default function useReviewsEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientConfig()
      .then(cfg => setEnabled(!!cfg.settings?.[SETTING_KEY]?.value_bool))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, []);

  return { enabled, loading };
}