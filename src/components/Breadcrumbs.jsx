import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const ROUTE_LABELS = {
  '/': 'Explore',
  '/explore': 'Explore',
  '/map': 'Map',
  '/news': 'News',
  '/favorites': 'Favorites',
  '/profile': 'Profile',
  '/admin': 'Admin',
  '/suggest': 'Suggest a Venue',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [venueName, setVenueName] = useState(null);

  // Track the previous distinct path so the back crumb shows where the user came from.
  const [prevPath, setPrevPath] = useState(null);
  const curPathRef = useRef(location.pathname);
  useEffect(() => {
    if (curPathRef.current !== location.pathname) {
      setPrevPath(curPathRef.current);
      curPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  const isVenuePage = location.pathname.startsWith('/venue/');

  useEffect(() => {
    if (isVenuePage && id) {
      base44.entities.Venue.list().then(venues => {
        const v = venues.find(x => x.id === id);
        if (v) setVenueName(v.name);
      });
    } else {
      setVenueName(null);
    }
  }, [id, isVenuePage]);

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') return null;

  const backLabel = (prevPath && ROUTE_LABELS[prevPath]) ? ROUTE_LABELS[prevPath] : 'Back';
  const currentLabel = isVenuePage ? (venueName || 'Venue') : ROUTE_LABELS[location.pathname];

  const handleBack = () => {
    // Go to the actual previous page in browser history; fall back to Explore.
    if (window.history.length > 1) navigate(-1);
    else navigate('/explore');
  };

  return (
    <nav className="bg-muted/40 border-b border-border px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center gap-1 text-sm leading-normal text-muted-foreground">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3 h-3 flex-shrink-0" />
          {backLabel}
        </button>
        {currentLabel && (
          <span className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold text-foreground truncate max-w-[200px]">{currentLabel}</span>
          </span>
        )}
      </div>
    </nav>
  );
}