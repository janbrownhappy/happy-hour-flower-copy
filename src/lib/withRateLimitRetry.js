// Retries Base44 SDK calls that fail with a transient "Rate limit exceeded" (HTTP 429)
// using exponential backoff, instead of letting them bubble up as errors. This smooths
// out bursts of simultaneous reads (e.g. the admin dashboard mounting many analytics
// widgets that each fetch at once) without changing any app logic.

const isRateLimitError = (err) => {
  if (!err) return false;
  const status = err.status || err.statusCode || err.response?.status;
  if (status === 429) return true;
  const msg = (err.message || err.toString() || '').toLowerCase();
  return msg.includes('rate limit');
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry an async operation up to `retries` times when it fails with a rate-limit error.
async function retryOnRateLimit(operation, retries = 4) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= retries) throw err;
      // 250ms, 500ms, 1000ms, 2000ms (plus a little jitter)
      const delay = 250 * 2 ** attempt + Math.random() * 150;
      await sleep(delay);
      attempt += 1;
    }
  }
}

// Wraps an object so each of its methods inherits the retry behavior, without mutating
// the original object.
function wrapMethods(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return new Proxy(obj, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === 'function') {
        return (...args) => retryOnRateLimit(() => value.apply(target, args));
      }
      return value;
    },
  });
}

// The SDK surfaces that issue network requests and can hit the rate limiter.
const WRAPPED_SURFACES = new Set(['functions', 'auth', 'integrations', 'users', 'agents', 'analytics']);

// Returns a Proxy of the SDK client that transparently retries rate-limited calls.
// Non-mutating: the original client is untouched.
export function withRateLimitRetry(client) {
  if (!client) return client;
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop];

      // entities.<Name>.<op>() — wrap each collection's methods on access
      if (prop === 'entities' && value && typeof value === 'object') {
        return new Proxy(value, {
          get(entTarget, entProp) {
            const collection = entTarget[entProp];
            if (collection && typeof collection === 'object') return wrapMethods(collection);
            return collection;
          },
        });
      }

      // asServiceRole exposes the same surfaces — wrap it recursively
      if (prop === 'asServiceRole' && value) {
        return withRateLimitRetry(value);
      }

      if (WRAPPED_SURFACES.has(prop) && value && typeof value === 'object') {
        return wrapMethods(value);
      }

      return value;
    },
  });
}