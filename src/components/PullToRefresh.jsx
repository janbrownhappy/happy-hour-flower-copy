import { useRef, useState, useCallback } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

const THRESHOLD = 70; // px the user must pull before a refresh fires
const MAX_PULL = 110;

/**
 * Native-style pull-to-refresh. Wrap a scrollable region's content with it.
 * Only engages when the nearest scroll container is at the very top, so it
 * never fights normal scrolling.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const scrollerRef = useRef(null);

  const atTop = () => {
    // Find the nearest scrollable ancestor and check it's scrolled to the top
    let el = scrollerRef.current?.parentElement;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return el.scrollTop <= 0;
      el = el.parentElement;
    }
    return window.scrollY <= 0;
  };

  const onTouchStart = useCallback((e) => {
    if (refreshing) return;
    if (atTop()) startY.current = e.touches[0].clientY;
    else startY.current = null;
  }, [refreshing]);

  const onTouchMove = useCallback((e) => {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && atTop()) {
      // Apply resistance so the pull feels rubber-banded
      const resisted = Math.min(MAX_PULL, delta * 0.5);
      setPull(resisted);
    } else {
      setPull(0);
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, refreshing, onRefresh]);

  const ready = pull >= THRESHOLD;

  return (
    <div
      ref={scrollerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden text-muted-foreground transition-[height] duration-150"
        style={{ height: refreshing ? THRESHOLD : pull }}
      >
        {refreshing ? (
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            <Loader2 className="w-4 h-4 animate-spin" /> Refreshing…
          </span>
        ) : pull > 0 ? (
          <span className="flex items-center gap-2 text-sm font-medium">
            <ArrowDown className={`w-4 h-4 transition-transform ${ready ? 'rotate-180 text-primary' : ''}`} />
            {ready ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        ) : null}
      </div>
      <div style={{ transform: `translateY(${refreshing ? 0 : pull * 0.2}px)` }}>
        {children}
      </div>
    </div>
  );
}