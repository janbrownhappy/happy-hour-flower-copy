import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, CreditCard, Plus, Send, Pencil, Trash2, Users, BarChart2, ScanLine, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import WalletPassForm from './WalletPassForm';
import IssuePassDialog from './IssuePassDialog';
import RedeemCouponScanner from './RedeemCouponScanner';

const STATUS_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  archived: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function VenueWalletPasses({ venueId, venueName }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('passes'); // passes | redeem
  const [showForm, setShowForm] = useState(null); // null | 'coupon' | 'loyalty_card'
  const [editingPass, setEditingPass] = useState(null);
  const [issuingPass, setIssuingPass] = useState(null);
  const [expandedPass, setExpandedPass] = useState(null);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: ['wallet-passes', venueId],
    queryFn: () => base44.entities.WalletPass.filter({ venue_id: venueId }, '-created_date', 50),
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['pass-instances', venueId],
    queryFn: () => base44.entities.PassInstance.filter({ venue_id: venueId }, '-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createWalletPass', { venue_id: venueId, data }),
    onSuccess: () => { queryClient.invalidateQueries(['wallet-passes', venueId]); setShowForm(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WalletPass.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['wallet-passes', venueId]); setEditingPass(null); },
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

  if (editingPass) {
    return (
      <WalletPassForm
        passType={editingPass.pass_type}
        existing={editingPass}
        onSave={(data) => updateMutation.mutateAsync({ id: editingPass.id, data })}
        onCancel={() => setEditingPass(null)}
      />
    );
  }

  if (showForm) {
    return (
      <WalletPassForm
        passType={showForm}
        onSave={(data) => createMutation.mutateAsync(data)}
        onCancel={() => setShowForm(null)}
      />
    );
  }

  if (issuingPass) {
    return (
      <IssuePassDialog
        template={issuingPass}
        venueId={venueId}
        onClose={() => setIssuingPass(null)}
        onIssued={() => queryClient.invalidateQueries(['pass-instances', venueId])}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Section toggle */}
      <div className="flex gap-2 bg-slate-800 rounded-xl p-1 border border-slate-700">
        {[
          { id: 'passes', label: 'My Passes', icon: CreditCard },
          { id: 'redeem', label: 'Scan & Redeem', icon: ScanLine },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeSection === id
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Redeem Section */}
      {activeSection === 'redeem' && <RedeemCouponScanner />}

      {/* Passes Section */}
      {activeSection === 'passes' && (
        <div className="space-y-6">

          {/* Create new — visual hero cards */}
          {(passes.length === 0 && !isLoading) ? (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm text-center">Choose a pass type to design your first one:</p>
              <div className="grid grid-cols-1 gap-4">
                {/* Coupon card */}
                <button
                  onClick={() => setShowForm('coupon')}
                  className="group relative overflow-hidden rounded-2xl border border-amber-500/20 hover:border-amber-500/50 transition-all text-left"
                  style={{ background: 'radial-gradient(ellipse at top left, rgba(245,166,35,0.12), #1a1a2e)' }}
                >
                  <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f5a623, rgba(245,166,35,0.3))' }} />
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)' }}>
                      <Tag className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-base">Design a Coupon</p>
                      <p className="text-slate-400 text-sm mt-0.5">One-time discount or offer. Set a value, expiry, and custom colors.</p>
                      <div className="flex gap-2 mt-2">
                        {['20% OFF', '$5 Drink', 'BOGO'].map(ex => (
                          <span key={ex} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{ex}</span>
                        ))}
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-amber-500 group-hover:scale-125 transition-transform shrink-0" />
                  </div>
                </button>

                {/* Loyalty card */}
                <button
                  onClick={() => setShowForm('loyalty_card')}
                  className="group relative overflow-hidden rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all text-left"
                  style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #1e0a3c)' }}
                >
                  <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                      <CreditCard className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-base">Design a Loyalty Card</p>
                      <p className="text-slate-400 text-sm mt-0.5">Stamp card to reward repeat customers. Set stamp goal and prize.</p>
                      <div className="flex gap-1.5 mt-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-purple-400/40" style={{ background: i < 3 ? '#a855f7' : 'transparent' }} />
                        ))}
                        <span className="text-xs text-purple-400 self-center ml-1">= Free Drink 🎁</span>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-purple-500 group-hover:scale-125 transition-transform shrink-0" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Coupons */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-500" /> Coupons
                    <span className="text-slate-500 text-xs font-normal">({coupons.length})</span>
                  </h3>
                  <Button size="sm" onClick={() => setShowForm('coupon')} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1" /> New
                  </Button>
                </div>
                {isLoading ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 bg-slate-700/50 rounded-xl animate-pulse" />)}</div>
                ) : coupons.length === 0 ? (
                  <button onClick={() => setShowForm('coupon')} className="w-full border border-dashed border-amber-500/20 rounded-xl py-5 text-center hover:border-amber-500/40 transition-colors">
                    <Tag className="w-5 h-5 text-amber-500/40 mx-auto mb-1" />
                    <p className="text-slate-500 text-sm">No coupons yet — <span className="text-amber-400">design one</span></p>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {coupons.map(pass => (
                      <PassCard
                        key={pass.id}
                        pass={pass}
                        instances={getInstancesForPass(pass.id)}
                        expanded={expandedPass === pass.id}
                        onToggleExpand={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
                        onEdit={() => setEditingPass(pass)}
                        onIssue={() => setIssuingPass(pass)}
                        onToggleStatus={() => toggleStatus(pass)}
                        onDelete={() => handleDelete(pass)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Loyalty Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" /> Loyalty Cards
                    <span className="text-slate-500 text-xs font-normal">({loyaltyCards.length})</span>
                  </h3>
                  <Button size="sm" onClick={() => setShowForm('loyalty_card')} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1" /> New
                  </Button>
                </div>
                {isLoading ? (
                  <div className="space-y-2">{[1].map(i => <div key={i} className="h-20 bg-slate-700/50 rounded-xl animate-pulse" />)}</div>
                ) : loyaltyCards.length === 0 ? (
                  <button onClick={() => setShowForm('loyalty_card')} className="w-full border border-dashed border-purple-500/20 rounded-xl py-5 text-center hover:border-purple-500/40 transition-colors">
                    <CreditCard className="w-5 h-5 text-purple-500/40 mx-auto mb-1" />
                    <p className="text-slate-500 text-sm">No loyalty cards yet — <span className="text-purple-400">design one</span></p>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {loyaltyCards.map(pass => (
                      <PassCard
                        key={pass.id}
                        pass={pass}
                        instances={getInstancesForPass(pass.id)}
                        expanded={expandedPass === pass.id}
                        onToggleExpand={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
                        onEdit={() => setEditingPass(pass)}
                        onIssue={() => setIssuingPass(pass)}
                        onToggleStatus={() => toggleStatus(pass)}
                        onDelete={() => handleDelete(pass)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Color strip */}
      <div className="h-1.5" style={{ background: pass.foreground_color || (isCoupon ? '#f5a623' : '#a855f7') }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-white font-medium truncate">{pass.title}</span>
              <Badge className={`${STATUS_COLORS[pass.status]} border text-xs`}>{pass.status}</Badge>
              {isExpired && <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs">Expired</Badge>}
            </div>
            {isCoupon && pass.discount_value && (
              <p className="text-amber-400 text-sm font-medium">{pass.discount_value}</p>
            )}
            {!isCoupon && pass.loyalty_program_name && (
              <p className="text-purple-400 text-sm">{pass.loyalty_program_name}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{issued} issued</span>
              {isCoupon && <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{redeemed} redeemed</span>}
              {isCoupon && pass.expiration_date && (
                <span>Expires {new Date(pass.expiration_date).toLocaleDateString()}</span>
              )}
              {isCoupon && pass.expiration_days && !pass.expiration_date && (
                <span>Expires {pass.expiration_days}d after issue</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onIssue}
              disabled={pass.status !== 'active'}
              className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400 disabled:opacity-30"
              title="Issue to customer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggleExpand} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400" title="View issued passes">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Toggle status */}
        <button
          onClick={onToggleStatus}
          className={`text-xs mt-2 px-2 py-0.5 rounded-full border transition-colors ${
            pass.status === 'active'
              ? 'border-slate-600 text-slate-500 hover:text-amber-400 hover:border-amber-500/40'
              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          {pass.status === 'active' ? 'Pause issuing' : 'Reactivate'}
        </button>
      </div>

      {/* Expanded: issued passes list */}
      {expanded && (
        <div className="border-t border-slate-700 px-4 py-3">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">Issued Passes ({instances.length})</p>
          {instances.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No passes issued yet. Click <Send className="w-3 h-3 inline" /> to issue one.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {instances.map(inst => (
                <div key={inst.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700/60 last:border-0">
                  <div className="min-w-0">
                    <p className="text-white truncate">{inst.consumer_name}</p>
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