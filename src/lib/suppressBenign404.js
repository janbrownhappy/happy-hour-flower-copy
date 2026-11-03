// Some Base44 SDK reads (e.g. fetching a record that was deleted elsewhere,
// or a customer/profile record that doesn't exist yet) reject with a 404.
// These are non-fatal — the UI already handles the "missing" case — but when
// they happen in a background promise with no .catch(), the browser surfaces
// them as an "unhandledrejection", which gets reported as an app error.
//
// This guard quietly swallows ONLY those benign background 404s. Every other
// error (including 4xx/5xx that aren't 404, and any real exception) is left
// untouched so genuine problems still surface.

function isBenign404(reason) {
  if (!reason) return false;
  const status =
    reason.status ??
    reason.statusCode ??
    reason.response?.status;
  if (status === 404) return true;
  // Axios errors stringify their status into the message.
  const msg = typeof reason === 'string' ? reason : reason.message;
  return typeof msg === 'string' && msg.includes('status code 404');
}

if (typeof window !== 'undefined') {
  // Capture phase + stopImmediatePropagation so we run before Vite's dev
  // overlay handler and prevent it from rendering the benign 404.
  window.addEventListener('unhandledrejection', (event) => {
    if (isBenign404(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Some background reads surface a benign 404 through a synchronous error
  // event rather than an unhandled promise rejection. The call itself is
  // already wrapped in try/catch, so swallow just the 404.
  window.addEventListener('error', (event) => {
    if (isBenign404(event.error) || isBenign404(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // The dev error overlay also picks errors up via console.error. Drop ONLY
  // benign 404 lines so the overlay stops flashing them; everything else is
  // logged normally.
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args.some((a) => isBenign404(a))) return;
    originalConsoleError.apply(console, args);
  };
}