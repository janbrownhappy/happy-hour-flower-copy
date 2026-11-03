import { useLocation } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import Explore from '@/pages/Explore';
import MapView from '@/pages/MapView';
import News from '@/pages/News';
import AskLocal from '@/pages/AskLocal';
import Favorites from '@/pages/Favorites';
import Profile from '@/pages/Profile';

const TABS = [
  { path: '/explore', Component: Explore },
  { path: '/map', Component: MapView },
  { path: '/news', Component: News },
  { path: '/ask-local', Component: AskLocal },
  { path: '/favorites', Component: Favorites },
  { path: '/profile', Component: Profile },
];

/**
 * Keeps the Explore, Map, and News pages mounted at the same time so their
 * internal React state — and scroll position — survive when the user switches
 * between the three tabs. Only the active tab is visible; the others are hidden
 * (not unmounted), and we save/restore each tab's scroll offset on switch.
 */
export default function KeepAliveTabs() {
  const location = useLocation();
  const active = location.pathname;
  const scrollRef = useRef({}); // path -> scrollTop
  const containerRefs = useRef({}); // path -> element
  const prevActive = useRef(active);

  // Track whether each tab has ever been visited (lazy-mount on first visit)
  const [visited, setVisited] = useState(() => {
    const init = {};
    TABS.forEach(t => { init[t.path] = t.path === active; });
    return init;
  });

  useEffect(() => {
    if (!visited[active]) {
      setVisited(v => ({ ...v, [active]: true }));
    }
  }, [active]);

  // Re-tapping an already-active bottom-nav tab smooth-scrolls that tab to the top.
  useEffect(() => {
    const handler = (e) => {
      const path = e.detail?.path;
      const el = containerRefs.current[path];
      if (el) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        scrollRef.current[path] = 0;
      }
    };
    window.addEventListener('keepalive:scroll-top', handler);
    return () => window.removeEventListener('keepalive:scroll-top', handler);
  }, []);

  // Save the outgoing tab's scroll, restore the incoming tab's scroll.
  useEffect(() => {
    const prev = prevActive.current;
    if (prev !== active) {
      const prevEl = containerRefs.current[prev];
      if (prevEl) scrollRef.current[prev] = prevEl.scrollTop;
      prevActive.current = active;
    }
    const el = containerRefs.current[active];
    if (el) {
      // Restore on the next frame so the now-visible content has laid out
      requestAnimationFrame(() => {
        el.scrollTop = scrollRef.current[active] || 0;
        // Leaflet (Map tab) mis-sizes while hidden via display:none — nudge it to
        // recompute its dimensions once it's visible again.
        window.dispatchEvent(new Event('resize'));
      });
    }
  }, [active]);

  const isKnownTab = TABS.some(t => t.path === active);

  return (
    <>
      {TABS.map(({ path, Component }) => {
        const isActive = path === active;
        // Don't mount a tab until it's been visited at least once
        if (!visited[path]) return null;
        return (
          <div
            key={path}
            ref={el => { containerRefs.current[path] = el; }}
            className="h-full overflow-y-auto scroll-smooth"
            style={{ display: isActive ? 'block' : 'none' }}
            aria-hidden={!isActive}
          >
            <Component />
          </div>
        );
      })}
      {/* If the route isn't one of the keep-alive tabs, render nothing here */}
      {!isKnownTab && null}
    </>
  );
}