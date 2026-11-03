import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { sendOneSignalNotification } from '@/functions/sendOneSignalNotification';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Users, Send, Crown, AlertCircle, CheckCircle, Sparkles, ImageIcon, Video, X, Loader2 } from 'lucide-react';
import { monthlyMessageCredits, LEGACY_MESSAGE_LIMIT } from '@/lib/entitlements';

const MAX_RCS_IMAGES = 10;

const MESSAGE_TEMPLATES = [
  { label: '🍹 Happy Hour Special', text: "Tonight only! Extra specials during happy hour. Come join us!" },
  { label: '📅 Schedule Change', text: "Heads up! Our happy hour times have changed. Check our updated hours." },
  { label: '🎉 Event Announcement', text: "Special event happening soon! We'd love to see you there." },
  { label: '⭐ New Deal Alert', text: "New deal just dropped! Stop by during happy hour to take advantage." },
];

export default function VenueMessenger({ venueId, venueName, subscriptionTier }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [fanCount, setFanCount] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('push');
  const [imageUrls, setImageUrls] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [fallbackSms, setFallbackSms] = useState('');
  const [trafficType, setTrafficType] = useState('PROMOTION');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [smsStatus, setSmsStatus] = useState(null);

  useEffect(() => {
    base44.functions.invoke('sendVenueFanSms', { action: 'status', venue_id: venueId })
      .then(r => setSmsStatus(r.data)).catch(() => {});
  }, [venueId]);

  const isPremium = ['premium', 'platinum'].includes(subscriptionTier);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const tierCredits = monthlyMessageCredits(subscriptionTier);

  useEffect(() => {
    const load = async () => {
      const [settingsRecords, favorites] = await Promise.all([
        base44.entities.VenueCommunicationSettings.filter({ venue_id: venueId }),
        base44.entities.Favorite.filter({ venue_id: venueId }),
      ]);
      setFanCount(favorites.filter(f => f.receive_venue_comms === true).length);

      let s = settingsRecords[0];
      if (!s) {
        // Default values before first send — the plan's included credits
        s = { monthly_message_limit: tierCredits, messages_sent_this_month: 0, last_reset_date: currentMonth };
      } else if (s.monthly_message_limit == null || s.monthly_message_limit === LEGACY_MESSAGE_LIMIT) {
        // Legacy default means "not explicitly set" — fall back to the plan allowance
        s = { ...s, monthly_message_limit: tierCredits };
      }
      // Auto-reset display if new month
      if (s.last_reset_date !== currentMonth) {
        s = { ...s, messages_sent_this_month: 0 };
      }
      setSettings(s);
      setLoading(false);
    };
    load();
  }, [venueId]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    const finalMessage = type === 'sms' && linkUrl.trim()
      ? `${message.trim()} ${linkUrl.trim()}`
      : message;
    if (type === 'sms') {
      // Texts go through GoHighLevel with their own weekly/monthly plan limits
      const r = await base44.functions.invoke('sendVenueFanSms', { action: 'send', venue_id: venueId, message: finalMessage })
        .catch(err => ({ data: err?.response?.data || { error: 'Something went wrong.' } }));
      setSending(false);
      setSmsStatus(r.data);
      if (r.data?.success) {
        setResult({ ok: true, sms: true, sent: r.data.sent });
        setMessage(''); setLinkUrl('');
      } else {
        setResult({ ok: false, error: r.data?.error || 'Something went wrong.' });
      }
      return;
    }
    const res = await sendOneSignalNotification({
      venue_id: venueId,
      type,
      title,
      message: finalMessage,
      image_urls: type === 'rcs' && imageUrls.length ? imageUrls : undefined,
      video_url: type === 'rcs' ? videoUrl || undefined : undefined,
      fallback_sms: type === 'rcs' ? fallbackSms || undefined : undefined,
      traffic_type: type === 'rcs' ? trafficType : undefined,
    });
    setSending(false);

    const success = res.data?.success;
    const errorMsg = res.data?.error || null;

    // Write to message log
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.VenueMessageLog.create({
      venue_id: venueId,
      venue_name: venueName,
      message: finalMessage,
      channels: [type],
      recipient_count: fanCount,
      status: success ? 'sent' : 'failed',
      error_details: errorMsg || undefined,
      sent_by_user_id: user?.id,
      sent_by_name: user?.full_name,
    }).catch(() => {}); // don't block UI on log failure

    if (success) {
      setResult({ ok: true, sent: res.data.sent, remaining: res.data.remaining });
      setMessage('');
      setTitle('');
      setImageUrls([]);
      setVideoUrl('');
      setFallbackSms('');
      setLinkUrl('');
      setSettings(s => ({ ...s, messages_sent_this_month: (s?.messages_sent_this_month || 0) + 1 }));
    } else {
      setResult({ ok: false, error: errorMsg || 'Something went wrong.' });
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slots = MAX_RCS_IMAGES - imageUrls.length;
    const toUpload = files.slice(0, Math.max(0, slots));
    if (!toUpload.length) { e.target.value = ''; return; }
    setUploadingImage(true);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      setImageUrls(prev => [...prev, ...uploaded]);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  if (!isPremium) {
    return (
      <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <p className="text-white font-semibold">Fan Messaging is a Premium Feature</p>
        <p className="text-slate-400 text-sm">Upgrade to Premium to send push notifications and SMS directly to your fans who've saved your venue.</p>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate(`/plans/venue?venue_id=${venueId}&focus=premium`)}>
          <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading…</div>;
  }

  const sent = settings?.messages_sent_this_month || 0;
  const limit = settings?.monthly_message_limit ?? tierCredits;
  const remaining = Math.max(0, limit - sent);
  const limitReached = remaining === 0;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{fanCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Opted-in Fans</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{sent}/{limit}</p>
          <p className="text-xs text-slate-400 mt-0.5">Sent This Month</p>
        </div>
        <div className={`bg-slate-800 border rounded-xl p-4 text-center ${limitReached ? 'border-red-500/40' : 'border-slate-700'}`}>
          <p className={`text-2xl font-bold ${limitReached ? 'text-red-400' : 'text-emerald-400'}`}>{remaining}</p>
          <p className="text-xs text-slate-400 mt-0.5">Remaining</p>
        </div>
      </div>

      {/* Monthly usage bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400">Monthly Usage</p>
          <p className="text-xs text-slate-400">{sent} of {limit} messages</p>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${sent / limit > 0.8 ? 'bg-red-500' : sent / limit > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (sent / limit) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">Resets on the 1st of each month</p>
      </div>

      {limitReached ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm">Monthly limit reached</p>
            <p className="text-red-400/80 text-xs mt-0.5">Your {limit}-message limit resets on the 1st of next month. Contact support to increase your limit.</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <p className="text-white font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-500" /> Send Message to Fans
          </p>

          {fanCount === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-300 text-xs">No fans have opted in yet. When customers save your venue they'll be asked if they want updates from you.</p>
            </div>
          )}

          {/* Channel */}
          <div>
            <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Channel</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('push')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors ${type === 'push' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
              >
                <Bell className="w-4 h-4" /> Push Notification
              </button>
              <button
                onClick={() => setType('sms')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors ${type === 'sms' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
              >
                <MessageSquare className="w-4 h-4" /> SMS
              </button>
              <button
                onClick={() => setType('rcs')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors ${type === 'rcs' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
              >
                <Sparkles className="w-4 h-4" /> RCS
              </button>
            </div>
            {type === 'rcs' && (
              <p className="text-xs text-blue-400/70 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> RCS delivers rich messages with branding on Android. Requires brand approval in OneSignal.
              </p>
            )}
          </div>

          {/* RCS media — multiple images form a carousel, plus an optional video */}
          {type === 'rcs' && (
            <div className="space-y-4">
              {/* Images (carousel) */}
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
                  Images (optional) {imageUrls.length > 0 && <span className="text-slate-500 normal-case">— {imageUrls.length}/{MAX_RCS_IMAGES}</span>}
                </Label>
                {imageUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                    {imageUrls.map((url, idx) => (
                      <div key={url} className="relative shrink-0">
                        <img src={url} alt={`RCS attachment ${idx + 1}`} className="h-28 w-28 rounded-xl border border-slate-600 object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageUrls.length < MAX_RCS_IMAGES && (
                  <label className={`flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed cursor-pointer text-sm transition-colors ${uploadingImage ? 'border-slate-600 text-slate-500' : 'border-blue-500/40 text-blue-300 hover:bg-blue-500/5'}`}>
                    {uploadingImage ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><ImageIcon className="w-4 h-4" /> {imageUrls.length ? 'Add more images' : 'Add images to your RCS message'}</>
                    )}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                  </label>
                )}
                <p className="text-xs text-slate-500 mt-1.5">Add up to {MAX_RCS_IMAGES} images. Multiple images display as a swipeable carousel on supported Android devices.</p>
              </div>

              {/* Video */}
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Video (optional)</Label>
                {videoUrl ? (
                  <div className="relative inline-block">
                    <video src={videoUrl} controls className="max-h-40 rounded-xl border border-slate-600" />
                    <button
                      onClick={() => setVideoUrl('')}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed cursor-pointer text-sm transition-colors ${uploadingVideo ? 'border-slate-600 text-slate-500' : 'border-blue-500/40 text-blue-300 hover:bg-blue-500/5'}`}>
                    {uploadingVideo ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><Video className="w-4 h-4" /> Add a video to your RCS message</>
                    )}
                    <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingVideo} className="hidden" />
                  </label>
                )}
                <p className="text-xs text-slate-500 mt-1.5">Videos play inline as a rich card on supported Android devices.</p>
              </div>
            </div>
          )}

          {/* RCS required fields: traffic type + fallback SMS */}
          {type === 'rcs' && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Message Purpose</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'PROMOTION', label: 'Promotional' },
                    { value: 'TRANSACTION', label: 'Transactional' },
                    { value: 'OTP', label: 'Authentication' },
                    { value: 'CUSTOMER_CARE', label: 'Customer Care' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTrafficType(opt.value)}
                      className={`py-2 rounded-xl border text-sm font-medium transition-colors ${trafficType === opt.value ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Fallback SMS Text (optional)</Label>
                <Textarea
                  value={fallbackSms}
                  onChange={e => setFallbackSms(e.target.value)}
                  placeholder="Plain text shown if RCS isn't available. Defaults to your message."
                  className="bg-slate-700 border-slate-600 text-white resize-none mt-1"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-slate-500 mt-1.5">Sent as a regular SMS when the recipient's device doesn't support RCS.</p>
              </div>
            </div>
          )}

          {/* Templates */}
          <div>
            <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Quick Templates</Label>
            <div className="grid grid-cols-2 gap-2">
              {MESSAGE_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setMessage(t.text)}
                  className="text-left text-xs border border-slate-600 rounded-xl p-2.5 text-slate-300 hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title (push or RCS) */}
          {(type === 'push' || type === 'rcs') && (
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Title (optional)</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={venueName}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                maxLength={60}
              />
            </div>
          )}

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Message</Label>
              <span className="text-xs text-slate-500">{message.length}/160</span>
            </div>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Tonight only — $3 drafts during happy hour! See you soon 🍺"
              className="bg-slate-700 border-slate-600 text-white resize-none"
              rows={3}
              maxLength={160}
            />
          </div>

          {/* Link (SMS only) */}
          {type === 'sms' && (
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Link (optional)</Label>
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://yourvenue.com/specials"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
              <p className="text-xs text-slate-500 mt-1.5">Added to the end of your text message.</p>
            </div>
          )}

          {type === 'sms' && smsStatus?.limits && (
            <p className="text-xs text-slate-400">
              Texts used: {smsStatus.sent_day}/{smsStatus.limits.daily} today · {smsStatus.sent_week}/{smsStatus.limits.weekly} this week. Only fans with text alerts on receive texts.
            </p>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-3 flex items-start gap-2 ${result.ok ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {result.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
              <p className={`text-sm ${result.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.ok && result.sms
                  ? `Text sent to ${result.sent} fan${result.sent !== 1 ? 's' : ''}!`
                  : result.ok
                  ? `Message sent to ${result.sent} fan${result.sent !== 1 ? 's' : ''}! ${result.remaining} message${result.remaining !== 1 ? 's' : ''} remaining this month.`
                  : result.error}
              </p>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !message.trim() || fanCount === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            {sending
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Sending…</>
              : <><Send className="w-4 h-4 mr-2" /> Send to {fanCount} Fan{fanCount !== 1 ? 's' : ''}</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}