import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Inbox, Loader2 } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-muted text-muted-foreground',
};

// Review queue for amenity labels the research pass proposed but that don't exist in
// the catalog yet. Approving flags them for addition to src/lib/amenities.js.
export default function AmenityProposalQueue() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.AmenityProposal.list('-created_date', 500)
      .then(setProposals)
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const review = async (proposal, status) => {
    setBusyId(proposal.id);
    try {
      await base44.entities.AmenityProposal.update(proposal.id, {
        status,
        reviewed_at: new Date().toISOString(),
      });
      setProposals((prev) =>
        prev.map((p) => (p.id === proposal.id ? { ...p, status } : p))
      );
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    pending: proposals.filter((p) => p.status === 'pending').length,
    approved: proposals.filter((p) => p.status === 'approved').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };
  const visible = proposals.filter((p) => p.status === filter);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Inbox className="w-4 h-4 text-primary" /> Proposed Amenities
          {counts.pending > 0 && <Badge variant="default">{counts.pending} pending</Badge>}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Amenities the research pass found with a source but that don't exist in the catalog yet.
          Approve to queue for the next catalog update.
        </p>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          No {filter} proposals.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 border border-border rounded-lg p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{p.label}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[p.status] || ''}`}>
                    {p.status}
                  </span>
                  {p.suggested_category && (
                    <Badge variant="outline" className="text-[10px]">{p.suggested_category}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Found on <span className="font-medium">{p.venue_name || 'Unknown venue'}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Source: {p.source}</p>
                {p.status === 'approved' && (
                  <p className="text-[11px] text-green-700 mt-1">
                    Add slug <code className="font-mono">{p.suggested_slug}</code> to the catalog.
                  </p>
                )}
              </div>
              {p.status === 'pending' && (
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => review(p, 'approved')}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => review(p, 'rejected')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}