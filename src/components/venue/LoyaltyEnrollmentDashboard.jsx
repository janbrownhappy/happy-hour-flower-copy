import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, UserPlus, Award, Sparkles, Wifi } from 'lucide-react';

// Returns a short "x ago" string from an ISO timestamp.
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function initials(name, email) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

// Real-time dashboard of loyalty members enrolling in this venue's programs.
export default function LoyaltyEnrollmentDashboard({ venueId, venueName }) {
  const [members, setMembers] = useState(null); // null = loading
  const [newIds, setNewIds] = useState(new Set()); // ids that just arrived (for highlight)
  const [live, setLive] = useState(false);
  const highlightTimers = useRef([]);

  useEffect(() => {
    let mounted = true;

    // Initial load: only loyalty cards for this venue, newest first.
    base44.entities.PassInstance
      .filter({ venue_id: venueId, pass_type: 'loyalty_card' }, '-created_date', 200)
      .then(list => { if (mounted) setMembers(list); })
      .catch(() => { if (mounted) setMembers([]); });

    // Real-time: new enrollments appear as they happen.
    const unsubscribe = base44.entities.PassInstance.subscribe((event) => {
      if (!mounted) return;
      setLive(true);
      const rec = event.data;
      if (!rec || rec.venue_id !== venueId || rec.pass_type !== 'loyalty_card') return;

      if (event.type === 'create') {
        setMembers(prev => {
          const existing = prev || [];
          if (existing.some(m => m.id === rec.id)) return existing;
          return [rec, ...existing];
        });
        setNewIds(prev => new Set(prev).add(rec.id));
        const t = setTimeout(() => {
          setNewIds(prev => { const next = new Set(prev); next.delete(rec.id); return next; });
        }, 6000);
        highlightTimers.current.push(t);
      } else if (event.type === 'update') {
        setMembers(prev => (prev || []).map(m => (m.id === rec.id ? { ...m, ...rec } : m)));
      } else if (event.type === 'delete') {
        setMembers(prev => (prev || []).filter(m => m.id !== rec.id));
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
      highlightTimers.current.forEach(clearTimeout);
    };
  }, [venueId]);

  const loading = members === null;
  const list = members || [];
  const total = list.length;
  const now = Date.now();
  const today = list.filter(m => m.created_date && now - new Date(m.created_date).getTime() < 24 * 60 * 60 * 1000).length;
  const week = list.filter(m => m.created_date && now - new Date(m.created_date).getTime() < 7 * 24 * 60 * 60 * 1000).length;

  return (
    <div className="space-y-5">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" /> Loyalty Members
          </p>
          <p className="text-slate-400 text-xs mt-0.5">New sign-ups for {venueName} appear here in real-time</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
          live ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {live ? 'Live' : 'Connecting'}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total Members" value={total} accent="purple" loading={loading} />
        <StatCard icon={UserPlus} label="Today" value={today} accent="emerald" loading={loading} />
        <StatCard icon={Award} label="This Week" value={week} accent="amber" loading={loading} />
      </div>

      {/* Member feed */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <p className="text-slate-300 text-xs uppercase tracking-wide font-medium">Recent Enrollments</p>
          <span className="text-slate-500 text-xs">{total}</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-700/40 rounded-xl animate-pulse" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-slate-300 text-sm font-medium">No members yet</p>
            <p className="text-slate-500 text-xs mt-1">When customers enroll in your loyalty program, they'll show up here instantly.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/60 max-h-[28rem] overflow-y-auto">
            {list.map(member => (
              <MemberRow key={member.id} member={member} isNew={newIds.has(member.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, loading }) {
  const accents = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2 ${accents[accent]}`}>
        <Icon className="w-4 h-4" />
      </div>
      {loading ? (
        <div className="h-7 w-10 bg-slate-700/50 rounded animate-pulse" />
      ) : (
        <p className="text-white text-2xl font-bold leading-none">{value}</p>
      )}
      <p className="text-slate-400 text-xs mt-1">{label}</p>
    </div>
  );
}

function MemberRow({ member, isNew }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isNew ? 'bg-emerald-500/10' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300 text-sm font-semibold">
        {initials(member.consumer_name, member.consumer_email)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm truncate">{member.consumer_name || 'New Member'}</p>
          {isNew && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wide shrink-0">New</span>
          )}
        </div>
        <p className="text-slate-500 text-xs truncate">{member.consumer_email || 'No email'}</p>
      </div>
      <div className="text-right shrink-0">
        {typeof member.loyalty_points === 'number' && (
          <p className="text-purple-400 text-xs font-medium">{member.loyalty_points} pts</p>
        )}
        <p className="text-slate-500 text-xs mt-0.5">{timeAgo(member.created_date)}</p>
      </div>
    </div>
  );
}