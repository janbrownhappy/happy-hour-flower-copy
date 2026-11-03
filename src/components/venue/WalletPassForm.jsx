import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, CreditCard, Tag, Upload, Palette, Type, Settings2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PassPreview from './PassPreview';

const COLOR_PRESETS = [
  { label: 'Midnight Gold', bg: '#1a1a2e', fg: '#f5a623', text: '#ffffff' },
  { label: 'Deep Navy', bg: '#0f1b35', fg: '#4fa3f7', text: '#e8f0fe' },
  { label: 'Forest', bg: '#1a2e1a', fg: '#4caf50', text: '#e8f5e9' },
  { label: 'Royal Purple', bg: '#1e0a3c', fg: '#a855f7', text: '#f3e8ff' },
  { label: 'Crimson', bg: '#2e0a0a', fg: '#ef4444', text: '#ffe8e8' },
  { label: 'Rose Gold', bg: '#2e1a1a', fg: '#f43f5e', text: '#ffe4e6' },
  { label: 'Teal Breeze', bg: '#0a2e2e', fg: '#14b8a6', text: '#ccfbf1' },
  { label: 'Slate Modern', bg: '#1e2433', fg: '#64748b', text: '#cbd5e1' },
  { label: 'Obsidian', bg: '#0d0d0d', fg: '#e5e5e5', text: '#a3a3a3' },
  { label: 'Sunset', bg: '#2e1506', fg: '#fb923c', text: '#fff7ed' },
  { label: 'Ocean', bg: '#041628', fg: '#0ea5e9', text: '#e0f2fe' },
  { label: 'Emerald', bg: '#012416', fg: '#10b981', text: '#d1fae5' },
];

const DEFAULT_COUPON = {
  pass_type: 'coupon',
  title: '',
  description: '',
  discount_value: '',
  terms: '',
  expiration_date: '',
  expiration_days: '',
  background_color: '#1a1a2e',
  foreground_color: '#f5a623',
  label_color: '#ffffff',
  logo_url: '',
};

const DEFAULT_LOYALTY = {
  pass_type: 'loyalty_card',
  title: '',
  description: '',
  loyalty_program_name: '',
  loyalty_points_label: 'Stamps',
  loyalty_max_points: 10,
  loyalty_reward_description: '',
  terms: '',
  background_color: '#1e0a3c',
  foreground_color: '#a855f7',
  label_color: '#ffffff',
  logo_url: '',
};

export default function WalletPassForm({ passType, existing, onSave, onCancel }) {
  const defaults = passType === 'coupon' ? DEFAULT_COUPON : DEFAULT_LOYALTY;
  const [form, setForm] = useState(existing || defaults);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  const isCoupon = passType === 'coupon';

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const applyPreset = (preset) => {
    setForm(prev => ({
      ...prev,
      background_color: preset.bg,
      foreground_color: preset.fg,
      label_color: preset.text,
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploadingLogo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const TABS = [
    { id: 'content', label: 'Content', icon: Type },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800/60">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {isCoupon
              ? <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center"><Tag className="w-3.5 h-3.5 text-amber-400" /></div>
              : <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center"><CreditCard className="w-3.5 h-3.5 text-purple-400" /></div>}
            <div>
              <h3 className="text-white font-semibold text-sm">
                {existing ? 'Edit' : 'Design'} {isCoupon ? 'Coupon' : 'Loyalty Card'}
              </h3>
              <p className="text-slate-500 text-xs">Changes preview in real time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body: form left, preview right */}
      <div className="flex flex-col lg:flex-row min-h-[600px]">

        {/* ── LEFT: Form ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tab nav */}
          <div className="flex border-b border-slate-700/80 bg-slate-800/40 px-5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">

              {/* ── CONTENT TAB ── */}
              {activeTab === 'content' && (
                <>
                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Pass Title *</Label>
                    <Input
                      required
                      value={form.title}
                      onChange={e => set('title', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder={isCoupon ? 'e.g. Happy Hour Special' : 'e.g. VIP Loyalty Rewards'}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={2}
                      placeholder="Short tagline shown on the pass"
                    />
                  </div>

                  {isCoupon && (
                    <div>
                      <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Discount Value *</Label>
                      <Input
                        required
                        value={form.discount_value}
                        onChange={e => set('discount_value', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="e.g. 20% OFF or Buy 1 Get 1 Free"
                      />
                      <p className="text-slate-600 text-xs mt-1">This is the big headline shown on the coupon</p>
                    </div>
                  )}

                  {!isCoupon && (
                    <>
                      <div>
                        <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Program Name</Label>
                        <Input
                          value={form.loyalty_program_name}
                          onChange={e => set('loyalty_program_name', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="e.g. The Inner Circle, VIP Club"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Points Label</Label>
                          <Input
                            value={form.loyalty_points_label}
                            onChange={e => set('loyalty_points_label', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                            placeholder="Stamps / Points / Visits"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Stamps for Reward</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={form.loyalty_max_points}
                            onChange={e => set('loyalty_max_points', parseInt(e.target.value) || 10)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Reward Description</Label>
                        <Input
                          value={form.loyalty_reward_description}
                          onChange={e => set('loyalty_reward_description', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="e.g. One free drink of your choice"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── DESIGN TAB ── */}
              {activeTab === 'design' && (
                <>
                  {/* Logo */}
                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Venue Logo</Label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-16 h-16 rounded-2xl border border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ background: form.background_color }}
                      >
                        {form.logo_url
                          ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                          : <Upload className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div className="flex-1">
                        <label className="cursor-pointer">
                          <div className="border border-dashed border-slate-600 rounded-xl px-4 py-3 text-center hover:border-amber-500/50 transition-colors">
                            {uploadingLogo
                              ? <p className="text-amber-400 text-sm animate-pulse">Uploading…</p>
                              : <p className="text-slate-400 text-sm">Upload logo <span className="text-slate-600 text-xs block">PNG/JPG, square recommended</span></p>}
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                        {form.logo_url && (
                          <button type="button" onClick={() => set('logo_url', '')} className="text-xs text-red-400 mt-1 hover:underline">Remove</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Color theme presets */}
                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Color Themes</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          title={preset.label}
                          className="relative rounded-xl h-12 border-2 transition-all hover:scale-110"
                          style={{
                            background: `radial-gradient(circle at 30% 40%, rgba(${parseInt(preset.fg.slice(1,3),16)},${parseInt(preset.fg.slice(3,5),16)},${parseInt(preset.fg.slice(5,7),16)},0.3), ${preset.bg})`,
                            borderColor: form.background_color === preset.bg ? preset.fg : 'rgba(255,255,255,0.08)',
                            boxShadow: form.background_color === preset.bg ? `0 0 12px rgba(${parseInt(preset.fg.slice(1,3),16)},${parseInt(preset.fg.slice(3,5),16)},${parseInt(preset.fg.slice(5,7),16)},0.4)` : 'none',
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full shadow-md" style={{ background: preset.fg }} />
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-6 gap-2 mt-1">
                      {COLOR_PRESETS.map((preset) => (
                        <p key={preset.label} className="text-slate-600 text-center" style={{ fontSize: 9 }}>{preset.label.split(' ')[0]}</p>
                      ))}
                    </div>
                  </div>

                  {/* Custom color pickers */}
                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Custom Colors</Label>
                    <div className="space-y-2">
                      {[
                        { key: 'background_color', label: 'Card Background', hint: 'The main card color' },
                        { key: 'foreground_color', label: 'Accent Color', hint: 'Title, discount & stamps' },
                        { key: 'label_color', label: 'Text Color', hint: 'Description & labels' },
                      ].map(({ key, label, hint }) => (
                        <div key={key} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-700/50">
                          <input
                            type="color"
                            value={form[key]}
                            onChange={e => set(key, e.target.value)}
                            className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-sm font-medium">{label}</p>
                            <p className="text-slate-600 text-xs">{hint}</p>
                          </div>
                          <Input
                            value={form[key]}
                            onChange={e => set(key, e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white text-xs h-8 font-mono w-24 shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === 'settings' && (
                <>
                  {isCoupon && (
                    <>
                      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
                        <p className="text-slate-300 text-sm font-medium">Expiration</p>
                        <div>
                          <Label className="text-slate-500 text-xs mb-1 block">Fixed Expiry Date</Label>
                          <Input
                            type="date"
                            value={form.expiration_date}
                            onChange={e => set('expiration_date', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <div className="flex-1 border-t border-slate-700" />
                          <span>or</span>
                          <div className="flex-1 border-t border-slate-700" />
                        </div>
                        <div>
                          <Label className="text-slate-500 text-xs mb-1 block">Expire After (days from issue)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.expiration_days}
                            onChange={e => set('expiration_days', e.target.value ? parseInt(e.target.value) : '')}
                            className="bg-slate-700 border-slate-600 text-white"
                            placeholder="e.g. 30"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Terms & Conditions</Label>
                    <Textarea
                      value={form.terms}
                      onChange={e => set('terms', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={4}
                      placeholder="Any restrictions, fine print, or usage rules…"
                    />
                  </div>

                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Pass Summary</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Type</span>
                        <span className="text-slate-300">{isCoupon ? 'Coupon' : 'Loyalty Card'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Title</span>
                        <span className="text-slate-300 truncate ml-4">{form.title || '—'}</span>
                      </div>
                      {isCoupon && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Discount</span>
                          <span className="text-amber-400 font-medium">{form.discount_value || '—'}</span>
                        </div>
                      )}
                      {!isCoupon && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Stamps needed</span>
                          <span className="text-purple-400 font-medium">{form.loyalty_max_points || 10}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 px-5 py-4 border-t border-slate-700/60 bg-slate-800/30">
              <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.title}
                className={`flex-1 text-white font-semibold ${isCoupon ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
                ) : existing ? 'Update Pass' : `Create ${isCoupon ? 'Coupon' : 'Loyalty Card'}`}
              </Button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Live Preview (sticky) ── */}
        <div className="lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-700/60 bg-slate-900/40">
          <div className="p-5 sticky top-0">
            <PassPreview form={form} passType={passType} />
            <div className="mt-4 space-y-2">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide text-center">Quick Themes</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {COLOR_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    title={preset.label}
                    className="w-6 h-6 rounded-full border-2 transition-all hover:scale-125"
                    style={{
                      background: preset.fg,
                      borderColor: form.background_color === preset.bg ? 'white' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}