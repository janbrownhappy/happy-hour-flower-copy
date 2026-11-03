import { Facebook, Search } from 'lucide-react';

const LABELS = {
  name: 'name', description: 'description', category: 'category', address: 'address', city: 'city',
  state_code: 'state', zip_code: 'ZIP', lat: 'map location', lng: 'map location', phone: 'phone',
  price_level: 'price level', website: 'website', instagram_url: 'Instagram', tiktok_url: 'TikTok',
  x_url: 'X', youtube_url: 'YouTube', has_happy_hour: 'happy hour', happy_hour_start: 'happy hour times',
  happy_hour_end: 'happy hour times', days: 'happy hour days', deals: 'specials', amenities_raw: 'amenities',
};

// Explains where a Facebook import's details came from, so the admin knows what to double-check.
export default function ImportSourceNotice({ meta }) {
  if (meta?.source !== 'facebook') return null;
  const fromWeb = [...new Set((meta.fields_from_web || []).map(k => LABELS[k]).filter(Boolean))];
  return (
    <div className="text-xs bg-muted/60 border border-border rounded-lg p-2 space-y-1">
      <p className="flex items-center gap-2">
        <Facebook className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        {meta.facebook_read ? 'Read the public Facebook page.' : `Facebook page couldn't be read (${meta.facebook_reason}).`}
      </p>
      {fromWeb.length > 0 && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <Search className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Filled from public web research: {fromWeb.join(', ')}. Please verify before publishing.
        </p>
      )}
    </div>
  );
}