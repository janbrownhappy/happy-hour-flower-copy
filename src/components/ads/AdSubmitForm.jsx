import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, CreditCard } from 'lucide-react';
import { createAdCheckout } from '@/functions/createAdCheckout';

// Form for a premium/platinum venue owner to submit an ad and pay for it.
export default function AdSubmitForm({ venues, pricing, onSubmitted }) {
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [title, setTitle] = useState('');
  const [clickUrl, setClickUrl] = useState('');
  const [tier, setTier] = useState('weekday');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const price = tier === 'weekend' ? pricing?.weekend_price : pricing?.weekday_price;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch {
      setError('Upload failed. Please try a different image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!venueId) return setError('Please select a venue.');
    if (!imageUrl) return setError('Please upload your ad graphic.');
    if (!startDate || !endDate) return setError('Please choose start and end dates.');
    if (endDate < startDate) return setError('End date must be after the start date.');

    setSubmitting(true);
    try {
      const venue = venues.find(v => v.id === venueId);
      const me = await base44.auth.me();
      const campaign = await base44.entities.AdCampaign.create({
        venue_id: venueId,
        venue_name: venue?.name || '',
        owner_id: me.id,
        owner_email: me.email,
        title,
        image_url: imageUrl,
        click_url: clickUrl,
        tier,
        start_date: startDate,
        end_date: endDate,
        status: 'draft',
        payment_status: 'unpaid',
      });

      const base = window.location.origin;
      const res = await createAdCheckout({
        campaignId: campaign.id,
        successUrl: `${base}/venue-ads`,
        cancelUrl: `${base}/venue-ads`,
      });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res?.data?.error || 'Could not start checkout.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
      <h2 className="text-white font-semibold">Buy an Ad Placement</h2>

      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Venue</Label>
        <Select value={venueId} onValueChange={setVenueId}>
          <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Select a venue" /></SelectTrigger>
          <SelectContent>
            {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Ad Title (optional)</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Half-price wings all weekend" className="bg-slate-900 border-slate-700 text-white" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Ad Graphic</Label>
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-600 rounded-xl py-6 cursor-pointer hover:border-amber-500 transition-colors text-slate-400 hover:text-amber-400">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-sm">{imageUrl ? 'Change graphic' : 'Upload graphic'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {imageUrl && <img src={imageUrl} alt="Ad preview" className="w-full rounded-xl mt-2 max-h-48 object-cover" />}
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Click-through URL (optional)</Label>
        <Input value={clickUrl} onChange={e => setClickUrl(e.target.value)} placeholder="https://… (defaults to your venue page)" className="bg-slate-900 border-slate-700 text-white" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Placement Tier</Label>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekday">Weekday — ${pricing?.weekday_price ?? '—'}</SelectItem>
            <SelectItem value="weekend">Weekend — ${pricing?.weekend_price ?? '—'}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">Weekday ads show Mon–Fri; weekend ads show Sat–Sun.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs">Start Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs">End Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleSubmit} disabled={submitting || uploading} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {submitting ? 'Starting checkout…' : `Pay $${price ?? '—'} & Submit for Review`}
      </Button>
      <p className="text-xs text-slate-500 text-center">Your ad goes live only after payment succeeds and our team approves the creative.</p>
    </div>
  );
}