import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Routes the Android hardware back button through React Router history.
// Wrappers fire a 'backbutton' document event; on root tabs we fall back to Explore.
export default function useAndroidBackButton(rootPaths = []) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onBack = (e) => {
      e.preventDefault?.();
      if (location.pathname === '/explore') return;
      if (rootPaths.includes(location.pathname) || window.history.length <= 1) navigate('/explore');
      else navigate(-1);
    };
    document.addEventListener('backbutton', onBack, false);
    window.addEventListener('native:back', onBack);
    return () => {
      document.removeEventListener('backbutton', onBack, false);
      window.removeEventListener('native:back', onBack);
    };
  }, [location.pathname, navigate, rootPaths]);
}