// Probe deny list: requests matching these are answered with the not-found page
// before any app code, auth check or data load runs.
const BLOCKED_SUBSTRINGS = ['credentials', 'id_rsa', 'id_ecdsa', 'private-key', 'secret', 'service-account', '__vite'];
const CONTENT_PREFIXES = ['/blog/', '/happy-hour/', '/venue/'];
const BLOCKED_EXTENSIONS = /\.(env|pem|key|yml|yaml)$/i;
const BLOCKED_ROOT_FILES = /^\/(compose\.[^/]+|serverless\.[^/]+|railway\.json|turbo\.json|nx\.json|lerna\.json|pnpm-workspace\.yaml|dockerrun\.aws\.json|key\.json|google-services\.json|google-service-account\.json|config\/settings\.local\.yml)$/i;

export function isBlockedRequest(pathname, search) {
  const path = (pathname || '').toLowerCase();
  if (path.startsWith('/.') || path.includes('/.')) return true;
  // Content slugs (e.g. a blog post titled "secret happy hours") are never treated as probes.
  const isContent = CONTENT_PREFIXES.some((p) => path.startsWith(p));
  if (!isContent && BLOCKED_SUBSTRINGS.some((s) => path.includes(s))) return true;
  if (BLOCKED_EXTENSIONS.test(path)) return true;
  if (BLOCKED_ROOT_FILES.test(path)) return true;
  const filename = new URLSearchParams(search || '').get('filename') || '';
  if (filename.toLowerCase().includes('file://')) return true;
  return false;
}