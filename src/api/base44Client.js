import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { withRateLimitRetry } from '@/lib/withRateLimitRetry';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Transparently retry transient "Rate limit exceeded" (429) responses with backoff,
// so bursts of simultaneous reads recover instead of throwing.
export const base44 = withRateLimitRetry(client);