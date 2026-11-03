import { CreditCard, Wifi, Star } from 'lucide-react';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function PassPreview({ form, passType }) {
  const isCoupon = passType === 'coupon';
  const maxPoints = Math.min(form.loyalty_max_points || 10, 15);
  const bg = form.background_color || (isCoupon ? '#1a1a2e' : '#1e0a3c');
  const fg = form.foreground_color || (isCoupon ? '#f5a623' : '#a855f7');
  const labelCol = form.label_color || '#ffffff';

  const fgRgb = (() => { try { return hexToRgb(fg); } catch { return '245,166,35'; } })();
  const bgRgb = (() => { try { return hexToRgb(bg); } catch { return '26,26,46'; } })();

  return (
    <div className="flex flex-col items-center p-4 bg-slate-950/60 rounded-2xl border border-slate-700/40">
      <p className="text-slate-500 text-xs uppercase tracking-widest mb-4 font-medium">Live Preview</p>

      {/* Card */}
      <div
        className="w-full max-w-[300px] rounded-3xl overflow-hidden shadow-2xl relative select-none"
        style={{
          background: `radial-gradient(ellipse at top left, rgba(${fgRgb}, 0.15) 0%, ${bg} 60%)`,
          boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(${fgRgb}, 0.15)`,
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${fg}, rgba(${fgRgb}, 0.4))` }} />

        <div className="p-5 pb-3">
          {/* Header: logo + type label */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="logo"
                  className="w-12 h-12 rounded-2xl object-cover shadow-lg"
                  style={{ boxShadow: `0 4px 12px rgba(${fgRgb}, 0.3)` }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: `rgba(${fgRgb}, 0.2)`, border: `1px solid rgba(${fgRgb}, 0.3)` }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: fg }} />
                </div>
              )}
              <div>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: fg }}>
                  {isCoupon ? 'COUPON' : 'LOYALTY'}
                </p>
                {!isCoupon && form.loyalty_program_name && (
                  <p className="text-xs mt-0.5 font-medium" style={{ color: labelCol, opacity: 0.75 }}>
                    {form.loyalty_program_name}
                  </p>
                )}
              </div>
            </div>
            {/* Decorative star / badge */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `rgba(${fgRgb}, 0.15)` }}
            >
              <Star className="w-3.5 h-3.5" style={{ color: fg }} />
            </div>
          </div>

          {/* Title */}
          <p
            className="text-xl font-black leading-tight tracking-tight mb-1"
            style={{ color: fg }}
          >
            {form.title || (isCoupon ? 'Your Coupon Title' : 'Loyalty Program')}
          </p>

          {/* Coupon: big discount value */}
          {isCoupon && (
            <div
              className="inline-block px-3 py-1 rounded-xl mt-1 mb-3"
              style={{ background: `rgba(${fgRgb}, 0.15)`, border: `1px solid rgba(${fgRgb}, 0.25)` }}
            >
              <p className="text-2xl font-black" style={{ color: fg }}>
                {form.discount_value || '20% OFF'}
              </p>
            </div>
          )}

          {isCoupon && form.description && (
            <p className="text-sm mt-1 mb-2 leading-snug" style={{ color: labelCol, opacity: 0.7 }}>
              {form.description}
            </p>
          )}

          {isCoupon && (form.expiration_date || form.expiration_days) && (
            <p className="text-xs mt-1 mb-3 font-medium" style={{ color: labelCol, opacity: 0.45 }}>
              {form.expiration_date
                ? `Expires ${new Date(form.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : `Valid for ${form.expiration_days} days after issue`}
            </p>
          )}

          {/* Loyalty: stamp grid */}
          {!isCoupon && (
            <div className="mt-3 mb-2">
              <p className="text-xs mb-2.5 font-medium" style={{ color: labelCol, opacity: 0.55 }}>
                {form.loyalty_max_points || 10} {form.loyalty_points_label || 'Stamps'} = reward
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from({ length: maxPoints }).map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: i < 3 ? fg : 'transparent',
                      border: `2px solid ${i < 3 ? fg : `rgba(${fgRgb}, 0.35)`}`,
                      boxShadow: i < 3 ? `0 0 8px rgba(${fgRgb}, 0.5)` : 'none',
                    }}
                  >
                    {i < 3 && (
                      <div className="w-2 h-2 rounded-full" style={{ background: bg, opacity: 0.6 }} />
                    )}
                  </div>
                ))}
                {(form.loyalty_max_points || 10) > 15 && (
                  <span className="text-xs self-center" style={{ color: labelCol, opacity: 0.4 }}>
                    +{(form.loyalty_max_points || 10) - 15}
                  </span>
                )}
              </div>
              {form.loyalty_reward_description && (
                <div
                  className="mt-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: `rgba(${fgRgb}, 0.12)`, color: fg, border: `1px solid rgba(${fgRgb}, 0.2)` }}
                >
                  🎁 {form.loyalty_reward_description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider dots */}
        <div className="flex items-center px-5 my-1">
          <div className="flex-1 border-t border-dashed" style={{ borderColor: `rgba(${fgRgb}, 0.2)` }} />
        </div>

        {/* Barcode strip */}
        <div className="px-5 py-4">
          <div
            className="rounded-2xl p-3 flex flex-col items-center gap-2"
            style={{ background: `rgba(255,255,255,0.06)` }}
          >
            <div className="flex gap-px items-end h-8">
              {Array.from({ length: 34 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i % 4 === 0 ? 3 : i % 7 === 0 ? 1 : 2,
                    height: 18 + (i % 5 === 0 ? 8 : i % 3 === 0 ? 4 : 0),
                    background: labelCol,
                    opacity: 0.35 + (i % 3) * 0.15,
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
            <p className="text-xs font-mono tracking-widest" style={{ color: labelCol, opacity: 0.3 }}>
              HHF-PREVIEW
            </p>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-3 text-center">Approximate wallet pass appearance</p>
    </div>
  );
}