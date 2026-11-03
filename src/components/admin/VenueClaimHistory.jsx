import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import openProofFile from '@/lib/openProofFile';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RELATIONSHIP_LABELS = {
  owner: 'Owner',
  general_manager: 'General Manager',
  marketing_manager: 'Marketing Manager',
  authorized_representative: 'Authorized Representative',
  other: 'Other',
};

const isChallenge = (c) => c.relationship_details?.startsWith('OWNERSHIP CHALLENGE:');

function TimelineEvent({ claim, index, total }) {
  const challenge = isChallenge(claim);
  const cleanDetails = challenge
    ? claim.relationship_details.replace(/^OWNERSHIP CHALLENGE:\s*/i, '')
    : claim.relationship_details;

  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    approved: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
    rejected: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  }[claim.status];

  const statusCls = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }[claim.status];

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
          challenge ? 'bg-orange-50 border-orange-300' : 'bg-primary/10 border-primary/30'
        }`}>
          {challenge ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
        </div>
        {index < total - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 pb-4 border rounded-xl p-3 mb-1 ${challenge ? 'border-orange-200 bg-orange-50/30' : 'border-border bg-card'}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {challenge && (
                <Badge className="text-xs bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Challenge
                </Badge>
              )}
              <Badge className={`text-xs border flex items-center gap-1 ${statusCls}`}>
                {statusIcon} {claim.status}
              </Badge>
            </div>
            <p className="text-xs font-semibold mt-1">{claim.claimant_name}</p>
            <p className="text-xs text-muted-foreground">
              {RELATIONSHIP_LABELS[claim.relationship] || claim.relationship} · {claim.claimant_email}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              {new Date(claim.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {claim.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Reviewed {new Date(claim.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {cleanDetails && (
          <p className={`text-xs italic rounded-lg px-2.5 py-1.5 mb-2 ${
            challenge ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'
          }`}>"{cleanDetails}"</p>
        )}

        {claim.admin_notes && (
          <p className="text-xs text-muted-foreground border-t border-border pt-1.5 mt-1.5">
            <span className="font-medium">Admin note:</span> {claim.admin_notes}
          </p>
        )}

        {claim.proof_url && (
          <button
            type="button"
            onClick={() => openProofFile(claim.proof_url)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            <FileText className="w-3 h-3" /> View proof
          </button>
        )}
      </div>
    </div>
  );
}

export default function VenueClaimHistory({ venueId, venueName, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    base44.entities.VenueClaimRequest.list('-created_date', 500)
      .then(all => {
        setHistory(all.filter(c => c.venue_id === venueId));
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [venueId]);

  const challenges = history.filter(isChallenge);
  const claims = history.filter(c => !isChallenge(c));
  const approved = history.filter(c => c.status === 'approved');
  const pending = history.filter(c => c.status === 'pending');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border flex-shrink-0">
        <div>
          <h3 className="font-semibold text-sm">Claim History</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{venueName}</p>
        </div>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-border flex-shrink-0">
        {[
          { label: 'Total', value: history.length, cls: 'text-foreground' },
          { label: 'Challenges', value: challenges.length, cls: 'text-orange-600' },
          { label: 'Approved', value: approved.length, cls: 'text-green-600' },
          { label: 'Pending', value: pending.length, cls: 'text-amber-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="text-center">
            <p className={`text-xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No claim history</p>
              <p className="text-xs mt-1 opacity-60">No claims or challenges have been submitted for this venue.</p>
            </div>
          ) : (
            <div>
              {history.map((claim, i) => (
                <TimelineEvent key={claim.id} claim={claim} index={i} total={history.length} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}