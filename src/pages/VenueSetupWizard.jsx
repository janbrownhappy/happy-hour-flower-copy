import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { compressAndUpload } from '@/lib/imageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ChevronLeft, ChevronRight, MapPin, Clock, Zap, Image, Plus, Trash2, Copy, Crown, X } from 'lucide-react';
import { venueHasFeature } from '@/lib/featureTiers';
import { enforceVenueLimits, maxDescriptionLength } from '@/lib/entitlements';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORIES = [
  'Bar',
  'Brewery',
  'Cocktail Lounge',
  'Hotel Bar',
  'Live Music Venue',
  'Restaurant & Bar',
  'Rooftop Bar',
  'Sports Bar',
  'Taproom',
  'Wine Bar',
];

const STEPS = [
  { id: 'basics',  label: 'Your Venue',   emoji: '🏢' },
  { id: 'hours',   label: 'Happy Hours',  emoji: '🕐' },
  { id: 'deals',   label: 'Deals',        emoji: '🎉' },
  { id: 'photo',   label: 'Photo',        emoji: '📸' },
  { id: 'done',    label: 'Done!',        emoji: '✅' },
];

export default function VenueSetupWizard() {
  const { id: venueId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venueTier, setVenueTier] = useState('free');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  // Premium capability is driven by the VENUE's subscription tier (matches the dashboard).
  const isPremium = venueHasFeature(venueTier, 'unlimited-photos');
  const descMax = maxDescriptionLength(venueTier);
  const [upgradeRequested, setUpgradeRequested] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    category: '',
    description: '',
    happy_hour_start: '',
    happy_hour_end: '',
    days: [],
    day_schedules: {}, // { Monday: { start: '', end: '' }, ... }
    deals: [''],
    deals_by_day: {}, // { Monday: ['deal1', 'deal2'], ... }
    photo_urls: [],
  });
  const [photoInput, setPhotoInput] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStage, setPhotoStage] = useState('');

  useEffect(() => {
    base44.entities.Venue.filter({ id: venueId }).then(results => {
      const v = results[0];
      if (v) {
        setVenueTier(v.subscription_tier || 'free');
        // Rebuild day_schedules from existing data — seed all saved days with the global time
        const day_schedules = {};
        (v.days || []).forEach(day => {
          day_schedules[day] = {
            start: v.day_schedules?.[day]?.start || v.happy_hour_start || '',
            end: v.day_schedules?.[day]?.end || v.happy_hour_end || '',
          };
        });
        // Seed deals_by_day — use saved per-day deals or fall back to global deals
        const deals_by_day = {};
        if (v.deals_by_day && Object.keys(v.deals_by_day).length) {
          Object.assign(deals_by_day, v.deals_by_day);
        } else if (v.deals?.length) {
          (v.days || []).forEach(day => { deals_by_day[day] = [...v.deals]; });
        }
        setForm({
          name: v.name || '',
          address: v.address || '',
          category: v.category || '',
          description: v.description || '',
          happy_hour_start: v.happy_hour_start || '',
          happy_hour_end: v.happy_hour_end || '',
          days: v.days || [],
          day_schedules,
          deals: v.deals?.length ? v.deals : [''],
          deals_by_day,
          photo_urls: v.photo_urls || [],
          photo_thumbs: v.photo_thumbs || {},
        });
      }
      setLoading(false);
    });
  }, [venueId]);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const toggleDay = (day) => {
    if (form.days.includes(day)) {
      const newSchedules = { ...form.day_schedules };
      delete newSchedules[day];
      setForm(prev => ({ ...prev, days: prev.days.filter(d => d !== day), day_schedules: newSchedules }));
    } else {
      setForm(prev => ({
        ...prev,
        days: [...prev.days, day],
        day_schedules: { ...prev.day_schedules, [day]: { start: '', end: '' } },
      }));
    }
  };

  const setDayTime = (day, field, val) => {
    setForm(prev => ({
      ...prev,
      day_schedules: { ...prev.day_schedules, [day]: { ...prev.day_schedules[day], [field]: val } },
    }));
  };

  const copyTimesToAllDays = (sourceDay) => {
    const sched = form.day_schedules[sourceDay];
    if (!sched?.start || !sched?.end) return;
    const newSchedules = { ...form.day_schedules };
    form.days.forEach(day => {
      newSchedules[day] = { start: sched.start, end: sched.end };
    });
    setForm(prev => ({ ...prev, day_schedules: newSchedules }));
  };

  const updateDeal = (i, val) => {
    const upd = [...form.deals]; upd[i] = val; set('deals', upd);
  };
  const removeDeal = (i) => set('deals', form.deals.filter((_, j) => j !== i));
  const addDeal = () => set('deals', [...form.deals, '']);

  // Per-day deal helpers
  const updateDayDeal = (day, i, val) => {
    const dayDeals = [...(form.deals_by_day[day] || [''])];
    dayDeals[i] = val;
    setForm(prev => ({ ...prev, deals_by_day: { ...prev.deals_by_day, [day]: dayDeals } }));
  };
  const removeDayDeal = (day, i) => {
    const dayDeals = (form.deals_by_day[day] || ['']).filter((_, j) => j !== i);
    setForm(prev => ({ ...prev, deals_by_day: { ...prev.deals_by_day, [day]: dayDeals.length ? dayDeals : [''] } }));
  };
  const addDayDeal = (day) => {
    const dayDeals = [...(form.deals_by_day[day] || ['']), ''];
    setForm(prev => ({ ...prev, deals_by_day: { ...prev.deals_by_day, [day]: dayDeals } }));
  };
  const copyDealsToAllDays = (sourceDay) => {
    const sourceDeals = form.deals_by_day[sourceDay] || [];
    const newDealsByDay = { ...form.deals_by_day };
    form.days.forEach(day => { newDealsByDay[day] = [...sourceDeals]; });
    setForm(prev => ({ ...prev, deals_by_day: newDealsByDay }));
  };

  const addPhoto = () => {
    if (photoInput.trim()) {
      if (!isPremium && form.photo_urls.length >= 1) {
        setShowUpgradeDialog(true);
        return;
      }
      set('photo_urls', [...form.photo_urls, photoInput.trim()]);
      setPhotoInput('');
    }
  };
  const removePhoto = (i) => set('photo_urls', form.photo_urls.filter((_, j) => j !== i));

  const handleRequestUpgrade = async () => {
    const user = await base44.auth.me();
    if (user) {
      await base44.functions.invoke('requestPremiumUpgrade', { source: 'venue_setup' });
    }
    setUpgradeRequested(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isPremium && form.photo_urls.length >= 1) {
      setShowUpgradeDialog(true);
      e.target.value = '';
      return;
    }
    setPhotoUploading(true);
    try {
      const { url, thumbUrl } = await compressAndUpload(file, setPhotoStage);
      set('photo_urls', [...form.photo_urls, url]);
      set('photo_thumbs', { ...(form.photo_thumbs || {}), [url]: thumbUrl });
    } catch (err) {
      alert(err.message || 'Upload failed. Please try again.');
    }
    setPhotoUploading(false);
    e.target.value = '';
  };

  const buildSavePayload = () => {
    const scheduledDays = form.days.filter(d => form.day_schedules[d]);
    const firstSchedule = scheduledDays.length ? form.day_schedules[scheduledDays[0]] : null;
    // Clean deals_by_day — remove empty strings, keep only days with actual deals
    const deals_by_day = {};
    Object.entries(form.deals_by_day).forEach(([day, dayDeals]) => {
      const filtered = (dayDeals || []).filter(d => d.trim());
      if (filtered.length) deals_by_day[day] = filtered;
    });
    // Derive global deals fallback from first day's deals for backward compat
    const firstDayDeals = scheduledDays.length ? deals_by_day[scheduledDays[0]] : null;
    return enforceVenueLimits(venueTier, {
      ...form,
      deals: firstDayDeals || form.deals.filter(d => d.trim()),
      deals_by_day,
      happy_hour_start: firstSchedule?.start || form.happy_hour_start,
      happy_hour_end: firstSchedule?.end || form.happy_hour_end,
    });
  };

  const saveAndNext = async () => {
    setSaving(true);
    await base44.entities.Venue.update(venueId, buildSavePayload());
    setSaving(false);
    setStep(s => s + 1);
  };

  const finish = async () => {
    setSaving(true);
    await base44.entities.Venue.update(venueId, buildSavePayload());
    setSaving(false);
    navigate(`/venue-dashboard/${venueId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentStep = STEPS[step];
  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-lg mx-auto py-6">

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Setting up your venue</span>
            <span>Step {step + 1} of {STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`text-xs font-medium transition-colors ${i <= step ? 'text-amber-400' : 'text-slate-600'}`}>
                {s.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 1: BASICS ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🏢</div>
              <h2 className="text-2xl font-heading font-bold text-white">Tell us about your venue</h2>
              <p className="text-slate-400 text-sm mt-1">This is what customers will see on your listing.</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Venue Name <span className="text-amber-400">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="e.g., The Scoundrel"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Address</Label>
                <Input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="123 Main St, Greenville, SC"
                />
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Used to show your venue on the map
                </p>
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Category</Label>
                <Select value={form.category} onValueChange={val => set('category', val)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Description</Label>
                  <span className={`text-xs ${form.description.length > descMax * 0.9 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {form.description.length}/{descMax}
                  </span>
                </div>
                <Textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value.slice(0, descMax))}
                  maxLength={descMax}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  rows={3}
                  placeholder="What makes your happy hour special? Tell customers why they should visit."
                />
                {descMax < 1000 && (
                  <p className="text-slate-500 text-xs mt-1">Free plan: {descMax} characters. Premium venues get 1,000.</p>
                )}
              </div>
            </div>
            <Button
              onClick={saveAndNext}
              disabled={!form.name || saving}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl"
            >
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</> : <>Next: Happy Hours <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        )}

        {/* ── STEP 2: HOURS ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🕐</div>
              <h2 className="text-2xl font-heading font-bold text-white">When is happy hour?</h2>
              <p className="text-slate-400 text-sm mt-1">Select each day and set its start & end time.</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
              {DAYS.map(day => {
                const active = form.days.includes(day);
                const sched = form.day_schedules[day] || { start: '', end: '' };
                return (
                  <div key={day} className="space-y-2">
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      <span className="font-semibold text-sm">{day}</span>
                      <span className="text-xs">
                        {active && sched.start && sched.end
                          ? `${sched.start} – ${sched.end}`
                          : active ? 'Set times below ↓' : 'Tap to add'}
                      </span>
                    </button>
                    {active && (
                      <div className="pl-2 space-y-1.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-slate-500 text-xs mb-1 block">Start</Label>
                            <Input
                              value={sched.start}
                              onChange={e => setDayTime(day, 'start', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                              placeholder="4:00 PM"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs mb-1 block">End</Label>
                            <Input
                              value={sched.end}
                              onChange={e => setDayTime(day, 'end', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                              placeholder="7:00 PM"
                            />
                          </div>
                        </div>
                        {sched.start && sched.end && form.days.length > 1 && (
                          <button
                            onClick={() => copyTimesToAllDays(day)}
                            className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy {sched.start}–{sched.end} to all selected days
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(s => s - 1)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 px-4">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={saveAndNext} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</> : <>Next: Deals <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
            <button onClick={() => setStep(s => s + 1)} className="w-full text-center text-slate-500 text-sm hover:text-slate-300 transition-colors">
              Skip for now →
            </button>
          </div>
        )}

        {/* ── STEP 3: DEALS ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-2xl font-heading font-bold text-white">What are your specials?</h2>
              <p className="text-slate-400 text-sm mt-1">
                {isPremium ? 'Add as many deals per day as you like.' : 'Add one special per day. Upgrade to Premium for unlimited specials.'}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              {form.days.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Go back and select your happy hour days first.</p>
              ) : (
                form.days.map(day => {
                  const dayDeals = form.deals_by_day[day] || [''];
                  // Free users: limit to 1 deal per day
                  const visibleDeals = isPremium ? dayDeals : dayDeals.slice(0, 1);
                  return (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-300 font-semibold text-sm">{day}</span>
                        {isPremium && form.days.length > 1 && dayDeals.some(d => d.trim()) && (
                          <button
                            onClick={() => copyDealsToAllDays(day)}
                            className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy to all days
                          </button>
                        )}
                      </div>
                      {visibleDeals.map((deal, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={deal}
                            onChange={e => updateDayDeal(day, i, e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white flex-1 h-8 text-sm"
                            placeholder="e.g., $5 Draft Beers, 2-for-1 Apps"
                          />
                          {isPremium && dayDeals.length > 1 && (
                            <button onClick={() => removeDayDeal(day, i)} className="p-1.5 rounded-lg hover:bg-slate-700">
                              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                        </div>
                      ))}
                      {isPremium ? (
                        <button
                          onClick={() => addDayDeal(day)}
                          className="text-xs text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add deal for {day}
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowUpgradeDialog(true)}
                          className="text-xs text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add another deal for {day}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(s => s - 1)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 px-4">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={saveAndNext} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</> : <>Next: Photo <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
            <button onClick={() => setStep(s => s + 1)} className="w-full text-center text-slate-500 text-sm hover:text-slate-300 transition-colors">
              Skip for now →
            </button>
          </div>
        )}

        {/* ── STEP 4: PHOTO ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">📸</div>
              <h2 className="text-2xl font-heading font-bold text-white">Add a photo</h2>
              <p className="text-slate-400 text-sm mt-1">
                {isPremium ? 'Add as many photos as you like. Venues with photos get 3× more clicks.' : 'Free plan includes 1 photo. Upgrade to Premium for unlimited photos.'}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              {/* Upload from device */}
              <label className={`flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${photoUploading ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-600 hover:border-amber-500 hover:bg-amber-500/5'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={photoUploading} />
                {photoUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-amber-400 text-sm">{photoStage === 'optimizing' ? 'Optimizing…' : 'Uploading…'}</span>
                  </>
                ) : (
                  <>
                    <Image className="w-6 h-6 text-slate-400" />
                    <span className="text-slate-300 text-sm font-medium">Tap to choose a photo</span>
                    <span className="text-slate-500 text-xs">JPG, PNG, HEIC, etc.</span>
                  </>
                )}
              </label>

              {/* Or paste a URL */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs">or paste a URL</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <div className="flex gap-2">
                <Input
                  value={photoInput}
                  onChange={e => setPhotoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhoto(); } }}
                  className="bg-slate-700 border-slate-600 text-white flex-1"
                  placeholder="https://..."
                />
                <Button onClick={addPhoto} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.photo_urls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {form.photo_urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-28 object-cover rounded-xl" />
                      <button onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(s => s - 1)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 px-4">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={saveAndNext} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</> : <>Finish Setup <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
            <button onClick={() => setStep(s => s + 1)} className="w-full text-center text-slate-500 text-sm hover:text-slate-300 transition-colors">
              Skip for now →
            </button>
          </div>
        )}

        {/* ── STEP 5: DONE ── */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="py-8">
              <div className="text-6xl mb-4">🎊</div>
              <h2 className="text-3xl font-heading font-bold text-white mb-2">You're all set!</h2>
              <p className="text-slate-400">
                <span className="text-amber-400 font-semibold">{form.name}</span> has been submitted for review.
              </p>
              <p className="text-slate-500 text-sm mt-2">Our team approves listings within 24 hours. You'll be visible to 7,000+ locals soon!</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left space-y-2">
              {[
                { done: !!form.name, label: 'Venue name & details' },
                { done: !!(form.happy_hour_start && form.days.length), label: 'Happy hour schedule' },
                { done: form.deals.filter(d => d.trim()).length > 0, label: 'Deals & specials' },
                { done: form.photo_urls.length > 0, label: 'Photo added' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.done
                    ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex-shrink-0" />}
                  <span className={`text-sm ${item.done ? 'text-slate-300' : 'text-slate-500'}`}>{item.label}</span>
                  {!item.done && <span className="text-xs text-slate-600 ml-auto">Optional</span>}
                </div>
              ))}
            </div>

            <Button
              onClick={finish}
              disabled={saving}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl text-base"
            >
              {saving ? 'Saving…' : 'Go to My Dashboard →'}
            </Button>
          </div>
        )}

      </div>
    </div>

    {/* ── UPGRADE DIALOG ── */}
    {showUpgradeDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <button onClick={() => setShowUpgradeDialog(false)} className="p-1 text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-white font-heading font-bold text-xl mb-2">Premium Feature</h3>
          <p className="text-slate-400 text-sm mb-4">
            This feature is available on <span className="text-amber-400 font-semibold">Premium</span> and <span className="text-amber-400 font-semibold">Platinum</span> plans. Would you like to upgrade?
          </p>
          <ul className="space-y-1.5 mb-5">
            {['Unlimited photos', 'Unlimited specials per day', 'Featured placement', 'Priority support'].map(f => (
              <li key={f} className="text-xs text-slate-300 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {upgradeRequested ? (
            <div className="text-center py-2">
              <p className="text-emerald-400 font-semibold text-sm">✓ Request sent! We'll be in touch soon.</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                Not now
              </Button>
              <Button onClick={handleRequestUpgrade}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                <Crown className="w-4 h-4 mr-1" /> Yes, upgrade!
              </Button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}