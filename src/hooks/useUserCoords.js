import { useState, useEffect } from 'react';

// Shared device coordinates for showing distances. It NEVER prompts for
// permission — it only reads location that the user already granted (e.g. via
// the "Near me" button), so browsing never triggers a location request.
const STORAGE_KEY = 'hhf_user_coords';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Number.isFinite(v?.lat) && Number.isFinite(v?.lng) ? { lat: v.lat, lng: v.lng } : null;
  } catch {
    return null;
  }
}

let cached = readStored();
let inFlight = false;
const listeners = new Set();

// Called whenever we obtain coordinates the user already allowed (e.g. "Near me"),
// so distances keep showing on later visits without a new permission prompt.
export function setUserCoords(coords) {
  if (!Number.isFinite(coords?.lat) || !Number.isFinite(coords?.lng)) return;
  cached = { lat: coords.lat, lng: coords.lng };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cached)); } catch {}
  listeners.forEach((fn) => fn(cached));
}

async function loadIfAlreadyGranted() {
  if (cached || inFlight) return;
  if (!('geolocation' in navigator) || !navigator.permissions?.query) return;
  inFlight = true;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state !== 'granted') { inFlight = false; return; }
  } catch {
    inFlight = false;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      inFlight = false;
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    () => { inFlight = false; },
    { timeout: 10000, maximumAge: 300000 }
  );
}

export default function useUserCoords() {
  const [coords, setCoords] = useState(cached);

  useEffect(() => {
    if (cached) setCoords(cached);
    listeners.add(setCoords);
    loadIfAlreadyGranted();
    return () => listeners.delete(setCoords);
  }, []);

  return coords;
}

export function milesBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}