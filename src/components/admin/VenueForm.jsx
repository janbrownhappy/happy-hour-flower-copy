import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import AreaSelect from '@/components/location/AreaSelect';
import VenueCatalogPicker from '@/components/admin/VenueCatalogPicker';
import PhotoUploadField from '@/components/venue/PhotoUploadField';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORIES = [
  'Bar', 'Brewery', 'Cocktail Lounge', 'Hotel Bar', 'Live Music Venue',
  'Restaurant & Bar', 'Rooftop Bar', 'Sports Bar', 'Taproom', 'Wine Bar',
];

export default function VenueForm({ venue, onSave, onCancel }) {
  const [data, setData] = useState({
    name: venue?.name || '',
    slug: venue?.slug || '',
    address: venue?.address || '',
    city: venue?.city || '',
    zip_code: venue?.zip_code || '',
    phone: venue?.phone || '',
    website: venue?.website || '',
    facebook_url: venue?.facebook_url || '',
    instagram_url: venue?.instagram_url || '',
    tiktok_url: venue?.tiktok_url || '',
    threads_url: venue?.threads_url || '',
    youtube_url: venue?.youtube_url || '',
    area: venue?.area || '',
    area_id: venue?.area_id || '',
    market_id: venue?.market_id || '',
    market_name: venue?.market_name || '',
    state_code: venue?.state_code || '',
    state_id: venue?.state_id || '',
    category: venue?.category || '',
    venue_type_ids: venue?.venue_type_ids || [],
    cuisine_ids: venue?.cuisine_ids || [],
    description: venue?.description || '',
    happy_hour_start: venue?.happy_hour_start || '',
    happy_hour_end: venue?.happy_hour_end || '',
    days: venue?.days || [],
    deals: venue?.deals || [],
    photo_urls: venue?.photo_urls || [],
    photo_thumbs: venue?.photo_thumbs || {},
    rating: venue?.rating || 0,
    status: venue?.status || 'active',
    subscription_tier: venue?.subscription_tier || 'free',
    is_featured: venue?.is_featured || false,
    is_new: venue?.is_new || false,
    is_fan_favorite: venue?.is_fan_favorite || false,
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const toggleDay = (day) => {
    set('days', data.days.includes(day) ? data.days.filter(d => d !== day) : [...data.days, day]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...data, rating: Number.isFinite(data.rating) ? data.rating : 0 };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold">{venue ? 'Edit Venue' : 'Add Venue'}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Name *</Label>
          <Input value={data.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={data.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label>Address</Label>
          <Input value={data.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
        </div>
        <div className="space-y-1">
          <Label>City</Label>
          <Input value={data.city} onChange={e => set('city', e.target.value)} placeholder="Greenville" />
        </div>
        <div className="space-y-1">
          <Label>ZIP Code</Label>
          <Input value={data.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="29601" />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="(864) 555-0000" />
        </div>
        <div className="space-y-1">
          <Label>Website</Label>
          <Input value={data.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <Label>Facebook URL</Label>
          <Input value={data.facebook_url} onChange={e => set('facebook_url', e.target.value)} placeholder="https://facebook.com/..." />
        </div>
        <div className="space-y-1">
          <Label>Instagram URL</Label>
          <Input value={data.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
        </div>
        <div className="space-y-1">
          <Label>TikTok URL</Label>
          <Input value={data.tiktok_url} onChange={e => set('tiktok_url', e.target.value)} placeholder="https://tiktok.com/@..." />
        </div>
        <div className="space-y-1">
          <Label>Threads URL</Label>
          <Input value={data.threads_url} onChange={e => set('threads_url', e.target.value)} placeholder="https://threads.net/@..." />
        </div>
        <div className="space-y-1">
          <Label>YouTube URL</Label>
          <Input value={data.youtube_url} onChange={e => set('youtube_url', e.target.value)} placeholder="https://youtube.com/@..." />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label>Location Area</Label>
          <AreaSelect
            value={data.area}
            onChange={(areaId, rec) => setData(prev => ({
              ...prev,
              area: areaId,
              area_id: rec?.id || '',
              market_id: rec?.market_id || '',
              market_name: rec?.market_name || '',
              state_code: rec?.state_code || '',
              state_id: rec?.state_id || '',
            }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Happy Hour Start</Label>
          <Input value={data.happy_hour_start} onChange={e => set('happy_hour_start', e.target.value)} placeholder="4:00 PM" />
        </div>
        <div className="space-y-1">
          <Label>Happy Hour End</Label>
          <Input value={data.happy_hour_end} onChange={e => set('happy_hour_end', e.target.value)} placeholder="7:00 PM" />
        </div>
      </div>

      {/* Venue types & cuisines (v3 catalogs) */}
      <VenueCatalogPicker
        venueTypeIds={data.venue_type_ids}
        cuisineIds={data.cuisine_ids}
        onChange={({ venue_type_ids, cuisine_ids }) => setData(prev => ({ ...prev, venue_type_ids, cuisine_ids }))}
      />

      {/* Days */}
      <div className="space-y-1">
        <Label>Days</Label>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map(day => (
            <button
              type="button"
              key={day}
              onClick={() => toggleDay(day)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                data.days.includes(day) ? 'bg-primary text-white border-primary' : 'bg-background border-border'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Deals */}
      <div className="space-y-1">
        <Label>Deals (one per line)</Label>
        <Textarea
          value={data.deals.join('\n')}
          onChange={e => set('deals', e.target.value.split('\n').filter(Boolean))}
          placeholder="$5 cocktails&#10;Half-price appetizers"
          rows={3}
        />
      </div>

      {/* Photos */}
      <PhotoUploadField
        value={data.photo_urls}
        onChange={urls => set('photo_urls', urls)}
        thumbs={data.photo_thumbs}
        onThumbsChange={t => set('photo_thumbs', t)}
        label="Photos"
        inputId="venue-form-photos"
      />

      {/* Description */}
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={data.description} onChange={e => set('description', e.target.value)} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={data.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Rating</Label>
          <Input type="number" min="0" max="5" step="0.1" value={data.rating} onChange={e => { const n = parseFloat(e.target.value); set('rating', Number.isFinite(n) ? n : 0); }} />
        </div>
        <div className="space-y-1">
          <Label>Subscription Tier</Label>
          <Select value={data.subscription_tier} onValueChange={v => set('subscription_tier', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-6 flex-wrap">
        {[['is_featured', 'Featured'], ['is_new', 'New'], ['is_fan_favorite', 'Fan Favorite']].map(([field, label]) => (
          <div key={field} className="flex items-center gap-2">
            <Switch checked={data[field]} onCheckedChange={v => set(field, v)} />
            <Label>{label}</Label>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? 'Saving...' : venue ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}