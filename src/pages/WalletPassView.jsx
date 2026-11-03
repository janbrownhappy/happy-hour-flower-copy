import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { generateWalletPassViaPassKit } from '@/functions/generateWalletPassViaPassKit';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle, Ticket, Download, Star, CreditCard, XCircle, Clock, ArrowLeft,
} from 'lucide-react';

function hexToRgb(hex) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  } catch {
    return '245, 166, 35';
  }
}

const STATUS_LABEL = {
  issued: { text: 'Active', cls: 'bg-emerald-500/15 text-emerald-300' },
  redeemed: { text: 'Redeemed', cls: 'bg-slate-500/20 text-slate-300' },
  expired: { text: 'Expired', cls: 'bg-red-500/15 text-red-300' },
  voided: { text: 'Voided', cls: 'bg-red-500/15 text-red-300' },
};

// Consumer-facing wallet pass viewer. Targeted by proximity/NFC deep links
// (/wallet-pass/:id). Shows the coupon, redemption code, expiry, and an
// "Add to Apple Wallet" button that generates the PassKit pass on demand.
export default function WalletPassView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [passUrl, setPassUrl] = useState(null);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const inst = await base44.entities.PassInstance.get(id);
        if (cancelled) return;
        if (!inst) { setNotFound(true); setLoading(false); return; }
        setInstance(inst);
        setPassUrl(inst.apple_pass_url || null);
        const tpl = await base44.entities.WalletPass.get(inst.wallet_pass_id);
        if (cancelled) return;
        setTemplate(tpl);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddToWallet = async () => {
    if (passUrl) { window.open(passUrl, '_blank', 'noopener'); return; }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await generateWalletPassViaPassKit({ passInstanceId: id });
      const url = res?.data?.pass_url;
      if (url) {
        setPassUrl(url);
        window.open(url, '_blank', 'noopener');
      } else {
        setGenError(res?.data?.error || 'Could not generate your wallet pass. Please try again.');
      }
    } catch (err) {
      setGenError(err?.response?.data?.error || 'Could not generate your wallet pass. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (notFound || !instance || !template) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center">
          <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-lg font-heading font-bold">Pass not found</h1>
          <p className="text-sm text-muted-foreground mt-1">This coupon may have been removed or the link is invalid.</p>
          <Button variant="outline" className="w-full mt-6" onClick={() => navigate('/explore')}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  const isCoupon = instance.pass_type === 'coupon';
  const bg = template.background_color || '#1a1a2e';
  const fg = template.foreground_color || '#f5a623';
  const labelCol = template.label_color || '#ffffff';
  const fgRgb = hexToRgb(fg);
  const status = STATUS_LABEL[instance.status] || STATUS_LABEL.issued;
  const isActive = instance.status === 'issued';
  const expires = instance.expires_at ? new Date(instance.expires_at) : null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center p-5 gap-5">
      <div className="w-full max-w-sm flex items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Pass card */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative"
        style={{
          background: `radial-gradient(ellipse at top left, rgba(${fgRgb}, 0.15) 0%, ${bg} 60%)`,
          boxShadow: `0 25px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(${fgRgb}, 0.15)`,
        }}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${fg}, rgba(${fgRgb}, 0.4))` }} />
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {template.logo_url ? (
                <img src={template.logo_url} alt="logo" className="w-12 h-12 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `rgba(${fgRgb}, 0.2)`, border: `1px solid rgba(${fgRgb}, 0.3)` }}>
                  <CreditCard className="w-5 h-5" style={{ color: fg }} />
                </div>
              )}
              <div>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: fg }}>
                  {isCoupon ? 'COUPON' : 'LOYALTY'}
                </p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: labelCol, opacity: 0.75 }}>
                  {template.venue_name || instance.venue_id}
                </p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.text}</span>
          </div>

          <p className="text-xl font-black leading-tight tracking-tight mb-1" style={{ color: fg }}>
            {template.title}
          </p>

          {isCoupon && template.discount_value && (
            <div className="inline-block px-3 py-1 rounded-xl mt-1 mb-3" style={{ background: `rgba(${fgRgb}, 0.15)`, border: `1px solid rgba(${fgRgb}, 0.25)` }}>
              <p className="text-2xl font-black" style={{ color: fg }}>{template.discount_value}</p>
            </div>
          )}

          {template.description && (
            <p className="text-sm mt-1 mb-2 leading-snug" style={{ color: labelCol, opacity: 0.75 }}>
              {template.description}
            </p>
          )}

          {expires && (
            <p className="text-xs mt-1 mb-3 font-medium flex items-center gap-1" style={{ color: labelCol, opacity: 0.5 }}>
              <Clock className="w-3 h-3" />
              Expires {expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          {template.terms && (
            <p className="text-[11px] mt-1 leading-snug" style={{ color: labelCol, opacity: 0.4 }}>
              {template.terms}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center px-6 my-1">
          <div className="flex-1 border-t border-dashed" style={{ borderColor: `rgba(${fgRgb}, 0.2)` }} />
        </div>

        {/* Barcode + redemption code */}
        <div className="px-6 py-5">
          <div className="rounded-2xl p-4 flex flex-col items-center gap-3 bg-white">
            <div className="flex gap-px items-end h-12">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i % 4 === 0 ? 3 : i % 7 === 0 ? 1 : 2,
                    height: 28 + (i % 5 === 0 ? 12 : i % 3 === 0 ? 6 : 0),
                    background: '#111',
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
            <p className="text-base font-mono font-bold tracking-[0.25em] text-slate-900">
              {instance.redemption_code}
            </p>
            <p className="text-[11px] text-slate-500">Present this code at the venue to redeem</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        {isActive ? (
          <Button className="w-full gap-2" onClick={handleAddToWallet} disabled={generating}>
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing pass…</>
              : passUrl
                ? <><Download className="w-4 h-4" /> Add to Apple Wallet</>
                : <><Ticket className="w-4 h-4" /> Add to Apple Wallet</>}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted rounded-xl py-3">
            <CheckCircle className="w-4 h-4" />
            {instance.status === 'redeemed' ? 'This coupon has been redeemed.' : `This coupon is ${instance.status}.`}
          </div>
        )}

        {genError && <p className="text-sm text-destructive text-center">{genError}</p>}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate(`/venue/${instance.venue_id}`)}>
          <Star className="w-4 h-4 mr-2" /> View venue
        </Button>
      </div>
    </div>
  );
}