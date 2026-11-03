import { useEffect, useState, useRef, Component } from 'react';
import { FeaturebaseProvider, useFeaturebase } from 'featurebase-js/react';
import { base44 } from '@/api/base44Client';
import {
  FEATUREBASE_APP_ID,
  registerFeaturebaseApi,
  unregisterFeaturebaseApi,
} from '@/lib/featurebase';

/**
 * Isolates the Featurebase widget from the rest of the app. If the SDK or the
 * Provider ever throws during render, this boundary swallows it and renders
 * nothing — the app itself keeps working. Featurebase must never blank the app.
 */
class FeaturebaseErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error('[Featurebase] widget disabled after render error:', error);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/**
 * Bridges the messenger's imperative methods (from useFeaturebase) into module
 * scope so the existing openFeedback/openChangelog/openMessenger helpers work
 * from anywhere. Also shuts the messenger down cleanly when the user logs out
 * so the next session doesn't inherit the previous identity / unread state.
 * Renders nothing.
 */
function FeaturebaseBridge({ user }) {
  const { show, hide, showChangelog, showNewMessage, showMessages, shutdown } = useFeaturebase();
  const wasAuthed = useRef(false);

  useEffect(() => {
    registerFeaturebaseApi({ show, hide, showChangelog, showNewMessage, showMessages });
    return () => unregisterFeaturebaseApi();
  }, [show, hide, showChangelog, showNewMessage, showMessages]);

  // On logout (authed -> not authed), tear down the identified session.
  useEffect(() => {
    if (user) {
      wasAuthed.current = true;
    } else if (wasAuthed.current) {
      wasAuthed.current = false;
      shutdown?.();
    }
  }, [user, shutdown]);

  return null;
}

/**
 * The actual Featurebase widget mount. Rendered separately from the app tree
 * (inside an error boundary) so it can never take the app down with it.
 */
function FeaturebaseWidget({ user }) {
  const [jwt, setJwt] = useState(undefined);
  // Follow the app's light/dark theme (driven by the `.dark` class on <html>)
  const [theme, setTheme] = useState(
    () => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setJwt(undefined);
      return;
    }
    base44.functions
      .invoke('featurebaseToken', {})
      .then((res) => {
        if (!cancelled) setJwt(res?.data?.token || undefined);
      })
      .catch(() => {
        if (!cancelled) setJwt(undefined); // anonymous — still boots
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <FeaturebaseProvider
      appId={FEATUREBASE_APP_ID}
      featurebaseJwt={jwt}
      hideDefaultLauncher
      theme={theme}
      language="en"
      alignment="right"
      verticalPadding={140}
    >
      <FeaturebaseBridge user={user} />
    </FeaturebaseProvider>
  );
}

/**
 * Mounts the Featurebase messenger once at the app root. The widget is kept in
 * its own error-boundaried subtree so a Featurebase failure can never blank the
 * app. Children render unconditionally, independent of Featurebase.
 * Mount ONCE per app lifetime — never per route.
 */
export default function FeaturebaseRoot({ user, children }) {
  // Defer the widget (and its stylesheet) until after the page has loaded so it
  // never blocks the first paint.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = () => setTimeout(() => setReady(true), 1500);
    if (document.readyState === 'complete') { const t = start(); return () => clearTimeout(t); }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, []);
  return (
    <>
      {ready && (
        <FeaturebaseErrorBoundary>
          <FeaturebaseWidget user={user} />
        </FeaturebaseErrorBoundary>
      )}
      {children}
    </>
  );
}