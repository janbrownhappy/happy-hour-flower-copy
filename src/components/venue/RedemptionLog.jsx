import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Tag, CreditCard, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

export default function RedemptionLog({ venueId }) {
  const [staffMap, setStaffMap] = useState({});
  const [passMap, setPassMap] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['pass-instances-redeemed', venueId],
    queryFn: () => base44.entities.PassInstance.filter(
      { venue_id: venueId, status: 'redeemed' },
      '-redeemed_at',
      500
    ),
    enabled: !!venueId,
  });

  const { data: allPasses = [] } = useQuery({
    queryKey: ['wallet-passes', venueId],
    queryFn: () => base44.entities.WalletPass.filter({ venue_id: venueId }, '-created_date', 100),
    enabled: !!venueId,
  });

  // Build pass lookup
  useEffect(() => {
    const map = {};
    allPasses.forEach(p => { map[p.id] = p; });
    setPassMap(map);
  }, [allPasses]);

  // Fetch staff names for all unique redeemed_by_user_ids
  useEffect(() => {
    const ids = [...new Set(instances.map(i => i.redeemed_by_user_id).filter(Boolean))];
    if (ids.length === 0) return;

    const fetchStaff = async () => {
      const users = await base44.entities.User.list();
      const map = {};
      users.forEach(u => { map[u.id] = u.full_name || u.email || 'Unknown'; });
      setStaffMap(map);
    };
    fetchStaff();
  }, [instances]);

  const filtered = instances.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.consumer_name || '').toLowerCase().includes(q) ||
      (i.consumer_email || '').toLowerCase().includes(q) ||
      (staffMap[i.redeemed_by_user_id] || '').toLowerCase().includes(q) ||
      (passMap[i.wallet_pass_id]?.title || '').toLowerCase().includes(q) ||
      (i.redemption_code || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-slate-700/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Redemption Log</h3>
          <p className="text-slate-500 text-xs mt-0.5">{instances.length} total redemptions</p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-7 pr-3 py-1.5 w-40 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* Empty state */}
      {instances.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl">
          <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No passes redeemed yet.</p>
          <p className="text-slate-600 text-xs mt-1">Redemptions will appear here with staff info.</p>
        </div>
      )}

      {/* Log entries */}
      {paginated.length > 0 && (
        <div className="space-y-2">
          {paginated.map(inst => {
            const pass = passMap[inst.wallet_pass_id];
            const staffName = staffMap[inst.redeemed_by_user_id];
            const isCoupon = inst.pass_type === 'coupon';

            return (
              <div
                key={inst.id}
                className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 flex items-start gap-3"
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isCoupon ? 'bg-amber-500/15' : 'bg-purple-500/15'
                }`}>
                  {isCoupon
                    ? <Tag className="w-3.5 h-3.5 text-amber-400" />
                    : <CreditCard className="w-3.5 h-3.5 text-purple-400" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">
                      {inst.consumer_name || 'Unknown Customer'}
                    </span>
                    {pass && (
                      <span className="text-xs text-slate-400 truncate">· {pass.title}</span>
                    )}
                  </div>
                  {inst.consumer_email && (
                    <p className="text-slate-500 text-xs">{inst.consumer_email}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {/* Staff who redeemed */}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <User className="w-3 h-3 text-slate-500" />
                      {staffName
                        ? <span className="text-amber-400 font-medium">{staffName}</span>
                        : <span className="text-slate-600 italic">No staff recorded</span>}
                    </span>
                    {/* Code */}
                    <span className="font-mono text-xs text-slate-600">{inst.redemption_code}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="shrink-0 text-right">
                  {inst.redeemed_at ? (
                    <>
                      <p className="text-xs text-slate-300">
                        {new Date(inst.redeemed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(inst.redeemed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-slate-500 text-xs">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}