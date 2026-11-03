// One-shot GPS read used to prove presence when unlocking an in-venue offer.
// Resolves to { lat, lng } or {} when location is unavailable or denied.
export default function currentCoords() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  });
}