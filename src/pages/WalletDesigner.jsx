import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Tag, CreditCard, Plus, Pencil, Trash2,
  Send, Users, BarChart2, ChevronDown, ChevronUp,
  ScanLine, Sparkles, Crown, TrendingUp, Gift, ClipboardList
} from 'lucide-react';
import WalletPassForm from '@/components/venue/WalletPassForm';
import PassPreview from '@/components/venue/PassPreview';
import IssuePassDialog from '@/components/venue/IssuePassDialog';
import RedeemCouponScanner from '@/components/venue/RedeemCouponScanner';
import WalletStatsPanel from '@/components/venue/WalletStatsPanel';
import RedemptionLog from '@/components/venue/RedemptionLog';

const STATUS_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  archived: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function WalletDesigner() {
  const { id: venueId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); // home | create-coupon | create-loyalty | edit | redeem
  const [editingPass, setEditingPass] = useState(null);
  const [issuingPass, setIssuingPass] = useState(null);
  const [expandedPass, setExpandedPass] = useState(null);
  const [activeSection, setActiveSection] = useState('passes'); // passes | redeem | log

  useEffect(() => {
    if (venueId) loadVenue();
  }, [venueId]);

  const loadVenue = async () => {
    const [me, v] = await Promise.all([base44.auth.me(), base44.entities.Venue.get(venueId)]);
    const allowed = me.role === 'admin' || v?.owner_id === me.id || (v?.editor_ids || []).includes(me.id);
    if (!allowed) { navigate('/explore', { replace: true }); return; }
    setVenue(v);
    setLoading(false);
  };

  const { data: passes = [], isLoading: passesLoading } = useQuery({
    queryKey: ['wallet-passes', venueId],
    queryFn: () => base44.entities.WalletPass.filter({ venue_id: venueId }, '-created_date', 100),
    enabled: !!venueId,
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['pass-instances', venueId],
    queryFn: () => base44.entities.PassInstance.filter({ venue_id: venueId }, '-created_date', 500),
    enabled: !!venueId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createWalletPass', { venue_id: venueId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['wallet-passes', venueId]);
      setView('home');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WalletPass.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wallet-passes', venueId]);
      setView('home');
      setEditingPass(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WalletPass.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['wallet-passes', venueId]),
  });

  const toggleStatus = (pass) => {
    const next = pass.status === 'active' ? 'paused' : 'active';
    updateMutation.mutate({ id: pass.id, data: { status: next } });
  };

  const handleDelete = (pass) => {
    if (!confirm(`Delete "${pass.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(pass.id);
  };

  const getInstancesForPass = (passId) => instances.filter(i => i.wallet_pass_id === passId);

  const coupons = passes.filter(p => p.pass_type === 'coupon');
  const loyaltyCards = passes.filter(p => p.pass_type === 'loyalty_card');
  const totalIssued = instances.length;
  const totalRedeemed = instances.filter(i => i.status === 'redeemed').length;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Edit / Create form ──
  if (view === 'edit' && editingPass) {
    return (
      <div className="min-h-screen bg-slate-900">
        <PageHeader venue={venue} venueId={venueId} onBack={() => { setView('home'); setEditingPass(null); }} />
        <div className="max-w-5xl mx-auto px-4 py-6">
          <WalletPassForm
            passType={editingPass.pass_type}
            existing={editingPass}
            onSave={(data) => updateMutation.mutateAsync({ id: editingPass.id, data })}
            onCancel={() => { setView('home'); setEditingPass(null); }}
          />
        </div>
      </div>
    );
  }

  if (view === 'create-coupon' || view === 'create-loyalty') {
    const passType = view === 'create-coupon' ? 'coupon' : 'loyalty_card';
    return (
      <div className="min-h-screen bg-slate-900">
        <PageHeader venue={venue} venueId={venueId} onBack={() => setView('home')} />
        <div className="max-w-5xl mx-auto px-4 py-6">
          <WalletPassForm
            passType={passType}
            onSave={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setView('home')}
          />
        </div>
      </div>
    );
  }

  // ── Issue pass dialog ──
  if (issuingPass) {
    return (
      <div className="min-h-screen bg-slate-900">
        <PageHeader venue={venue} venueId={venueId} onBack={() => setIssuingPass(null)} />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <IssuePassDialog
            template={issuingPass}
            venueId={venueId}
            onClose={() => setIssuingPass(null)}
            onIssued={() => queryClient.invalidateQueries(['pass-instances', venueId])}
          />
        </div>
      </div>
    );
  }

  // ── Main home view ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <PageHeader venue={venue} venueId={venueId} />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Stats row */}
        {passes.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Templates', value: passes.length, icon: CreditCard, color: 'text-amber-400' },
                { label: 'Issued', value: totalIssued, icon: Users, color: 'text-blue-400' },
                { label: 'Redeemed', value: totalRedeemed, icon: TrendingUp, color: 'text-emerald-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <WalletStatsPanel passes={passes} instances={instances} />
          </>
        )}

        {/* Section tabs */}
        <div className="flex gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
          {[
            { id: 'passes', label: 'Templates', icon: CreditCard },
            { id: 'redeem', label: 'Scan', icon: ScanLine },
            { id: 'log', label: 'Activity', icon: ClipboardList },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                activeSection === id
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Redeem */}
        {activeSection === 'redeem' && <RedeemCouponScanner />}

        {/* Activity Log */}
        {activeSection === 'log' && <RedemptionLog venueId={venueId} />}

        {/* Passes */}
        {activeSection === 'passes' && (
          <div className="space-y-6">

            {/* Empty state — hero create cards */}
            {passes.length === 0 && !passesLoading && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                  <h2 className="text-white font-bold text-lg">Design Your First Pass</h2>
                  <p className="text-slate-400 text-sm mt-1">Create digital wallet cards your customers can save on their phones</p>
                </div>
                <HeroCreateCards onCreateCoupon={() => setView('create-coupon')} onCreateLoyalty={() => setView('create-loyalty')} />
              </div>
            )}

            {/* Existing passes */}
            {passes.length > 0 && (
              <>
                {/* Coupons section */}
                <PassSection
                  title="Coupons"
                  icon={<Tag className="w-4 h-4 text-amber-500" />}
                  count={coupons.length}
                  isLoading={passesLoading}
                  onNew={() => setView('create-coupon')}
                  newLabel="New Coupon"
                  newColor="bg-amber-500 hover:bg-amber-600"
                  emptyMsg="No coupons yet"
                  emptyAction={() => setView('create-coupon')}
                  emptyActionLabel="Design a coupon →"
                  emptyActionColor="text-amber-400"
                >
                  {coupons.map(pass => (
                    <PassCard
                      key={pass.id}
                      pass={pass}
                      instances={getInstancesForPass(pass.id)}
                      expanded={expandedPass === pass.id}
                      onToggleExpand={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
                      onEdit={() => { setEditingPass(pass); setView('edit'); }}
                      onIssue={() => setIssuingPass(pass)}
                      onToggleStatus={() => toggleStatus(pass)}
                      onDelete={() => handleDelete(pass)}
                    />
                  ))}
                </PassSection>

                {/* Loyalty Cards section */}
                <PassSection
                  title="Loyalty Cards"
                  icon={<CreditCard className="w-4 h-4 text-purple-400" />}
                  count={loyaltyCards.length}
                  isLoading={passesLoading}
                  onNew={() => setView('create-loyalty')}
                  newLabel="New Card"
                  newColor="bg-purple-600 hover:bg-purple-700"
                  emptyMsg="No loyalty cards yet"
                  emptyAction={() => setView('create-loyalty')}
                  emptyActionLabel="Design a loyalty card →"
                  emptyActionColor="text-purple-400"
                >
                  {loyaltyCards.map(pass => (
                    <PassCard
                      key={pass.id}
                      pass={pass}
                      instances={getInstancesForPass(pass.id)}
                      expanded={expandedPass === pass.id}
                      onToggleExpand={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
                      onEdit={() => { setEditingPass(pass); setView('edit'); }}
                      onIssue={() => setIssuingPass(pass)}
                      onToggleStatus={() => toggleStatus(pass)}
                      onDelete={() => handleDelete(pass)}
                    />
                  ))}
                </PassSection>

                {/* Add more buttons at bottom */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setView('create-coupon')}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-amber-500/30 text-amber-400 text-sm font-medium hover:border-amber-500/60 hover:bg-amber-500/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Coupon
                  </button>
                  <button
                    onClick={() => setView('create-loyalty')}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-purple-500/30 text-purple-400 text-sm font-medium hover:border-purple-500/60 hover:bg-purple-500/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Loyalty Card
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PageHeader({ venue, venueId, onBack }) {
  const navigate = useNavigate();
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/60 px-4 py-4 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <button
          onClick={onBack || (() => navigate(`/venue-dashboard/${venueId}#wallet`))}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h1 className="text-white font-bold text-sm truncate">
              Wallet Designer {venue?.name ? `· ${venue.name}` : ''}
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">Design loyalty cards &amp; coupons for your customers</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/staff-redeem/${venueId}`}
            className="flex items-center gap-1.5 text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <ScanLine className="w-3.5 h-3.5" /> Staff Validator
          </Link>
          <Link
            to={`/venue-dashboard/${venueId}`}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroCreateCards({ onCreateCoupon, onCreateLoyalty }) {
  return (
    <div className="space-y-3">
      {/* Coupon hero */}
      <button
        onClick={onCreateCoupon}
        className="group w-full relative overflow-hidden rounded-2xl border border-amber-500/20 hover:border-amber-500/50 transition-all text-left"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(245,166,35,0.1), #0f1117)' }}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f5a623, rgba(245,166,35,0.2))' }} />
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)' }}
          >
            <Tag className="w-7 h-7 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-base">Design a Coupon</p>
            <p className="text-slate-400 text-sm mt-0.5 leading-snug">
              One-time discount or special offer. Customers save it to Apple Wallet or Google Pay.
            </p>
            <div className="flex gap-2 mt-2.5 flex-wrap">
              {['20% OFF', '$5 First Drink', 'Happy Hour Special', 'BOGO Appetizers'].map(ex => (
                <span key={ex} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15">{ex}</span>
              ))}
            </div>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <Plus className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      </button>

      {/* Loyalty card hero */}
      <button
        onClick={onCreateLoyalty}
        className="group w-full relative overflow-hidden rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all text-left"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.1), #0f1117)' }}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.2))' }} />
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}
          >
            <Gift className="w-7 h-7 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-base">Design a Loyalty Card</p>
            <p className="text-slate-400 text-sm mt-0.5 leading-snug">
              Digital stamp card to reward regulars. Set a goal and a prize when they complete it.
            </p>
            <div className="flex items-center gap-1.5 mt-2.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border-2 border-purple-400/30"
                  style={{ background: i < 4 ? '#a855f7' : 'transparent' }}
                />
              ))}
              <span className="text-xs text-purple-400 ml-1">= Free Drink 🎁</span>
            </div>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
            <Plus className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </button>
    </div>
  );
}

function PassSection({ title, icon, count, isLoading, onNew, newLabel, newColor, emptyMsg, emptyAction, emptyActionLabel, emptyActionColor, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          {icon} {title}
          <span className="text-slate-500 text-xs font-normal">({count})</span>
        </h3>
        <Button size="sm" onClick={onNew} className={`${newColor} text-white text-xs`}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {newLabel}
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 bg-slate-700/40 rounded-xl animate-pulse" />)}
        </div>
      ) : count === 0 ? (
        <button
          onClick={emptyAction}
          className="w-full border border-dashed border-slate-700 rounded-xl py-6 text-center hover:border-slate-600 transition-colors"
        >
          <p className="text-slate-500 text-sm">{emptyMsg} —&nbsp;
            <span className={emptyActionColor}>{emptyActionLabel}</span>
          </p>
        </button>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

function PassCard({ pass, instances, expanded, onToggleExpand, onEdit, onIssue, onToggleStatus, onDelete }) {
  const isCoupon = pass.pass_type === 'coupon';
  const redeemed = instances.filter(i => i.status === 'redeemed').length;
  const issued = instances.length;
  const isExpired = pass.expiration_date && new Date(pass.expiration_date) < new Date();

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden">
      {/* Accent bar */}
      <div className="h-1" style={{ background: pass.foreground_color || (isCoupon ? '#f5a623' : '#a855f7') }} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Mini preview swatch */}
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border"
            style={{
              background: pass.background_color || '#1a1a2e',
              borderColor: `${pass.foreground_color || '#f5a623'}40`,
            }}
          >
            {isCoupon
              ? <Tag className="w-4 h-4" style={{ color: pass.foreground_color || '#f5a623' }} />
              : <CreditCard className="w-4 h-4" style={{ color: pass.foreground_color || '#a855f7' }} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold truncate">{pass.title}</span>
              <Badge className={`${STATUS_COLORS[pass.status]} border text-xs`}>{pass.status}</Badge>
              {isExpired && <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs">Expired</Badge>}
            </div>
            {isCoupon && pass.discount_value && (
              <p className="text-amber-400 text-sm font-bold mt-0.5">{pass.discount_value}</p>
            )}
            {!isCoupon && pass.loyalty_program_name && (
              <p className="text-purple-400 text-sm mt-0.5">{pass.loyalty_program_name}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{issued} issued</span>
              {isCoupon && <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{redeemed} redeemed</span>}
              {isCoupon && pass.expiration_date && (
                <span>Exp {new Date(pass.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
              {!isCoupon && (
                <span>{pass.loyalty_max_points || 10} {pass.loyalty_points_label || 'stamps'}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors" title="Edit design">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onIssue}
              disabled={pass.status !== 'active'}
              className="p-1.5 rounded-lg hover:bg-amber-500/15 text-amber-400 disabled:opacity-30 transition-colors"
              title="Issue to customer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggleExpand} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <button
          onClick={onToggleStatus}
          className={`text-xs mt-2.5 px-2.5 py-0.5 rounded-full border transition-colors ${
            pass.status === 'active'
              ? 'border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/40'
              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          {pass.status === 'active' ? 'Pause issuing' : 'Reactivate'}
        </button>
      </div>

      {/* Expanded: issued passes list */}
      {expanded && (
        <div className="border-t border-slate-700/60 px-4 py-3">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-medium">
            Issued Passes ({instances.length})
          </p>
          {instances.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">
              No passes issued yet. Click <Send className="w-3 h-3 inline mx-0.5" /> to send one.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {instances.map(inst => (
                <div key={inst.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700/40 last:border-0">
                  <div className="min-w-0">
                    <p className="text-white truncate text-sm">{inst.consumer_name}</p>
                    <p className="text-slate-500 text-xs">{inst.consumer_email}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      inst.status === 'redeemed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      inst.status === 'expired' ? 'bg-slate-500/10 text-slate-500 border-slate-600' :
                      inst.status === 'voided' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>
                      {inst.status}
                    </span>
                    <p className="text-slate-600 text-xs mt-0.5 font-mono">{inst.redemption_code}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}