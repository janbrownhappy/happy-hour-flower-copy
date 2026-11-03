import { useEffect, useMemo, useState } from "react";
import useResolvedVenues from '@/hooks/useResolvedVenues';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Clock, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function makeMarkerIcon(isPremium) {
  const bg = isPremium ? '#f59e0b' : '#f97316';
  const size = isPremium ? 20 : 16;
  const crown = isPremium ? `<span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:10px;line-height:1;">👑</span>` : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;background:${bg};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${crown}</div>`,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size + (isPremium ? 20 : 0), size + (isPremium ? 16 : 0)],
  });
}

const GREENVILLE_CENTER = [34.8526, -82.3999];

export default function LandingMap() {
  const [rawVenues, setRawVenues] = useState([]);

  useEffect(() => {
    base44.entities.Venue.list('-rating', 200).then(v => setRawVenues(v.filter(x => x.status === 'active'))).catch(() => {});
  }, []);

  // Food trucks resolve to a current stop (or drop out) — never their static address.
  const resolved = useResolvedVenues(rawVenues, 'now');
  const venues = useMemo(() => resolved.filter(x => {
    const lat = Number(x.lat);
    const lng = Number(x.lng);
    return x.lat != null && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  }).map(x => ({ ...x, lat: Number(x.lat), lng: Number(x.lng) })), [resolved]);

  return (
    <section className="py-12 px-4 bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-extrabold text-white mb-3">Happy Hours, Mapped</h2>
          <p className="text-gray-400 text-lg">Coverage across Downtown, West End, Augusta Road, and more Greenville neighborhoods.</p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl" style={{ height: '420px' }}>
          <MapContainer center={GREENVILLE_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {venues.map(venue => {
              const isPremium = ['premium', 'platinum'].includes(venue.subscription_tier);
              return (
                <Marker
                  key={venue.id}
                  position={[venue.lat, venue.lng]}
                  icon={makeMarkerIcon(isPremium)}
                >
                  <Popup maxWidth={230}>
                    <div className="min-w-[200px]">
                      {venue.photo_urls?.[0] ? (
                        <img
                          src={venue.photo_urls[0]}
                          alt={venue.name}
                          className="w-full h-28 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-20 rounded-lg mb-2 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl">
                          🌸
                        </div>
                      )}
                      <p style={{margin:'0 0 2px 0',fontWeight:'700',fontSize:'13px',lineHeight:'1.2'}}>{venue.name}</p>
                      <p style={{margin:'0 0 2px 0',fontSize:'11px',color:'#6b7280',lineHeight:'1.2'}}>{venue.category}</p>
                      {venue.happy_hour_start && (
                        <p style={{margin:'0 0 2px 0',fontSize:'11px',color:'#d97706',fontWeight:'600',lineHeight:'1.2',display:'flex',alignItems:'center',gap:'3px'}}>
                          <Clock className="w-3 h-3" />
                          {venue.happy_hour_start} – {venue.happy_hour_end}
                        </p>
                      )}
                      {venue.rating > 0 && (
                        <p style={{margin:'0',fontSize:'11px',lineHeight:'1.2',display:'flex',alignItems:'center',gap:'3px'}}>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {venue.rating?.toFixed(1)}
                        </p>
                      )}

                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </section>
  );
}