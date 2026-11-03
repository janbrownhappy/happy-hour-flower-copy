import { useMemo } from 'react';
import { CreditCard, Tag, Users, TrendingUp, Calendar, Award } from 'lucide-react';

export default function WalletStatsPanel({ passes, instances }) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const loyaltyPasses = passes.filter(p => p.pass_type === 'loyalty_card');
    const couponPasses = passes.filter(p => p.pass_type === 'coupon');

    // Loyalty: count unique users who have an issued/active loyalty instance
    const loyaltySaves = instances.filter(i =>
      loyaltyPasses.some(p => p.id === i.wallet_pass_id) && i.status !== 'voided'
    ).length;

    // Coupons redeemed this week
    const couponsRedeemedThisWeek = instances.filter(i => {
      if (i.status !== 'redeemed') return false;
      if (!i.redeemed_at) return false;
      return new Date(i.redeemed_at) >= weekAgo;
    }).length;

    // Total coupons redeemed all time
    const totalCouponRedeemed = instances.filter(i =>
      couponPasses.some(p => p.id === i.wallet_pass_id) && i.status === 'redeemed'
    ).length;

    // Active loyalty card holders (not redeemed/voided)
    const activeLoyaltyHolders = instances.filter(i =>
      loyaltyPasses.some(p => p.id === i.wallet_pass_id) && i.status === 'issued'
    ).length;

    // Loyalty completions (fully redeemed)
    const loyaltyCompletions = instances.filter(i =>
      loyaltyPasses.some(p => p.id === i.wallet_pass_id) && i.status === 'redeemed'
    ).length;

    return {
      loyaltySaves,
      activeLoyaltyHolders,
      loyaltyCompletions,
      couponsRedeemedThisWeek,
      totalCouponRedeemed,
      totalCouponIssued: instances.filter(i => couponPasses.some(p => p.id === i.wallet_pass_id)).length,
    };
  }, [passes, instances]);

  const hasLoyalty = passes.some(p => p.pass_type === 'loyalty_card');
  const hasCoupons = passes.some(p => p.pass_type === 'coupon');

  if (!hasLoyalty && !hasCoupons) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium px-1">Performance</h3>

      {/* Loyalty Card Stats */}
      {hasLoyalty && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <p className="text-white text-sm font-semibold">Loyalty Cards</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCell
              icon={<Users className="w-4 h-4 text-purple-400" />}
              value={stats.loyaltySaves}
              label="Total Saves"
              color="text-purple-400"
            />
            <StatCell
              icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
              value={stats.activeLoyaltyHolders}
              label="Active Holders"
              color="text-blue-400"
            />
            <StatCell
              icon={<Award className="w-4 h-4 text-amber-400" />}
              value={stats.loyaltyCompletions}
              label="Completed"
              color="text-amber-400"
            />
          </div>
        </div>
      )}

      {/* Coupon Stats */}
      {hasCoupons && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-amber-400" />
            <p className="text-white text-sm font-semibold">Coupons</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCell
              icon={<Calendar className="w-4 h-4 text-emerald-400" />}
              value={stats.couponsRedeemedThisWeek}
              label="Redeemed This Week"
              color="text-emerald-400"
              highlight
            />
            <StatCell
              icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
              value={stats.totalCouponRedeemed}
              label="All-Time Redeemed"
              color="text-amber-400"
            />
            <StatCell
              icon={<Users className="w-4 h-4 text-blue-400" />}
              value={stats.totalCouponIssued}
              label="Total Issued"
              color="text-blue-400"
            />
          </div>
          {/* Redemption rate bar */}
          {stats.totalCouponIssued > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Redemption Rate</span>
                <span>{Math.round((stats.totalCouponRedeemed / stats.totalCouponIssued) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.totalCouponRedeemed / stats.totalCouponIssued) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCell({ icon, value, label, color, highlight }) {
  return (
    <div className={`text-center p-2 rounded-xl ${highlight ? 'bg-emerald-500/8 border border-emerald-500/20' : ''}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-slate-500 text-xs leading-tight mt-0.5">{label}</p>
    </div>
  );
}