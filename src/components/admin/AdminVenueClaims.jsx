import { useState, useEffect } from 'react';

const DEFAULT_CLAIM_NOTE = "Welcome to Happy Hour Flower. Don't forget to review all the details and make sure you choose the appropriate amenities. This is a key feature that consumers use to find their next happy hour experience. Double check the days, times and specials.";
import { base44 } from '@/api/base44Client';
import ProofViewerDialog from '@/components/admin/ProofViewerDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, ExternalLink, FileText, User, Phone, Mail, Building2, RefreshCw, AlertTriangle, History } from 'lucide-react';
import VenueClaimHistory from '@/components/admin/VenueClaimHistory';
import RequestProofButton from '@/components/admin/RequestProofButton';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

const RELATIONSHIP_LABELS = {
  owner: 'Owner',
  general_manager: 'General Manager',
  marketing_manager: 'Marketing Manager',
  authorized_representative: 'Authorized Representative',
  other: 'Other',
};

const STATUS_BADGE = {
  pending:  { cls: 'bg-amber-100 text-amber-700 border-amber-200',  icon: <Clock className="w-3 h-3" /> },
  approved: { cls: 'bg-green-100 text-green-700 border-green-200',  icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { cls: 'bg-red-100  text-red-700   border-red-200',     icon: <XCircle className="w-3 h-3" /> },
};

export default function AdminVenueClaims() {
  const { locationFilter } = useAdminLocation();
  const [claims, setClaims] = useState([]);
  const [venueRecords, setVenueRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState({});
  const [processing, setProcessing] = useState({});
  const [filter, setFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'challenge' | 'claim'
  const [historyVenue, setHistoryVenue] = useState(null); // { venueId, venueName }
  const [viewProof, setViewProof] = useState(null);

  const load = async () => {
    setLoading(true);
    const [all, venueData] = await Promise.all([
      base44.entities.VenueClaimRequest.list('-created_date', 500).catch(() => []),
      base44.entities.Venue.list().catch(() => []),
    ]);
    setClaims(all);
    setVenueRecords(venueData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const hasTerritory = locationFilter.state_code || locationFilter.market_id || locationFilter.area_id;
  const inTerritoryIds = hasTerritory
    ? new Set(venueRecords.filter(v => venueInTerritory(v, locationFilter)).map(v => v.id))
    : null;
  // New-business ("add") submissions have no venue record yet, so they can't be matched
  // against a territory — always keep them visible so they don't get silently hidden.
  const territoryClaims = inTerritoryIds
    ? claims.filter(c => !c.venue_id || inTerritoryIds.has(c.venue_id))
    : claims;

  const isChallenge = (c) => c.relationship_details?.startsWith('OWNERSHIP CHALLENGE:');
  const challengeCount = territoryClaims.filter(c => c.status === 'pending' && isChallenge(c)).length;
  const pendingCount = territoryClaims.filter(c => c.status === 'pending').length;

  const filtered = territoryClaims.filter(c => {
    const statusMatch = filter === 'all' || c.status === filter;
    const typeMatch = typeFilter === 'all' || (typeFilter === 'challenge' ? isChallenge(c) : !isChallenge(c));
    return statusMatch && typeMatch;
  });

  const handleAction = async (claim, action) => {
    setProcessing(p => ({ ...p, [claim.id]: action }));
    try {
      await base44.functions.invoke('processVenueClaim', {
        claimId: claim.id,
        action,
        admin_notes: adminNotes[claim.id] ?? DEFAULT_CLAIM_NOTE,
      });
      await load();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(p => ({ ...p, [claim.id]: null }));
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'all', label: 'All', count: territoryClaims.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs leading-none ${
                  filter === key ? 'bg-white/20 text-white' : key === 'pending' ? 'bg-amber-500 text-white' : 'bg-muted-foreground/20'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: 'All Types' },
            { key: 'challenge', label: '⚠ Challenges', count: challengeCount },
            { key: 'claim', label: 'Claims' },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === key ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs leading-none bg-white/20 text-white">{count}</span>
              )}
            </button>
          ))}
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

    <div className="flex gap-4">
    <div className="flex-1 min-w-0">
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No {filter !== 'all' ? filter : ''} claims</p>
          <p className="text-xs mt-1 opacity-60">Claims submitted by venue owners will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => {
            const badge = STATUS_BADGE[claim.status];
            const isProcessing = processing[claim.id];
            const isPending = claim.status === 'pending';
            const challenge = isChallenge(claim);
            const cleanDetails = challenge
              ? claim.relationship_details.replace(/^OWNERSHIP CHALLENGE:\s*/i, '')
              : claim.relationship_details;

            return (
              <div key={claim.id} className={`border rounded-2xl bg-card overflow-hidden ${challenge ? 'border-orange-400' : 'border-border'}`}>
                {/* Top stripe */}
                {isPending && <div className={`h-1 ${challenge ? 'bg-orange-400' : 'bg-amber-400'}`} />}

                <div className="p-4 space-y-3">
                  {/* Row 1: Venue + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{claim.venue_name}</p>
                        {claim.venue_id ? (
                          <a
                            href={`/venue/${claim.venue_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View listing <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet listed — needs manual creation</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {claim.request_type === 'add' && (
                        <Badge className="flex items-center gap-1 bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                          <Building2 className="w-3 h-3" /> New business
                        </Badge>
                      )}
                      {claim.source === 'portal' && (
                        <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs">Portal</Badge>
                      )}
                      {challenge && (
                        <Badge className="flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 text-xs">
                          <AlertTriangle className="w-3 h-3" /> Challenge
                        </Badge>
                      )}
                      <Badge className={`flex items-center gap-1 border text-xs ${badge.cls}`}>
                        {badge.icon} {claim.status}
                      </Badge>
                      <button
                        onClick={() => setHistoryVenue({ venueId: claim.venue_id, venueName: claim.venue_name })}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="View venue claim history"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Requester details */}
                  <div className="bg-muted/50 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{claim.claimant_name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{RELATIONSHIP_LABELS[claim.relationship] || claim.relationship}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{claim.claimant_email}</span>
                    </div>
                    {claim.claimant_phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span>{claim.claimant_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Submitted {new Date(claim.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Proposed business details (portal "add" requests) */}
                  {claim.request_type === 'add' && (claim.proposed_address || claim.proposed_city || claim.proposed_category || claim.proposed_phone) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                      <p className="font-semibold text-blue-700">Proposed business details</p>
                      {(claim.proposed_address || claim.proposed_city) && <p>{[claim.proposed_address, claim.proposed_city].filter(Boolean).join(', ')}</p>}
                      {claim.proposed_category && <p>Category: {claim.proposed_category}</p>}
                      {claim.proposed_phone && <p>Phone: {claim.proposed_phone}</p>}
                    </div>
                  )}

                  {/* Row 3: Additional details + proof */}
                  {(claim.relationship_details || claim.proof_url) && (
                    <div className="space-y-1.5">
                      {cleanDetails && (
                        <p className={`text-xs rounded-lg px-3 py-2 italic ${challenge ? 'bg-orange-50 text-orange-800 border border-orange-100' : 'text-muted-foreground bg-muted/30'}`}>"{cleanDetails}"</p>
                      )}
                      {claim.proof_url && (
                        <button
                          type="button"
                          onClick={() => setViewProof(claim.proof_url)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" /> View proof document <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {isPending && !claim.proof_url && (
                    <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span className="text-amber-800">No proof attached.</span>
                      <RequestProofButton claim={claim} onSent={load} />
                    </div>
                  )}

                  {/* Row 4: Approve/Deny for pending claims */}
                  {isPending && (
                    <div className="space-y-2 pt-1 border-t border-border">
                      <Textarea
                        value={adminNotes[claim.id] ?? DEFAULT_CLAIM_NOTE}
                        onChange={e => setAdminNotes(n => ({ ...n, [claim.id]: e.target.value }))}
                        placeholder="Optional note to include in email to claimant…"
                        rows={2}
                        className="text-xs resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(claim, 'approve')}
                          disabled={!!isProcessing}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isProcessing === 'approve'
                            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Approving…</>
                            : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Approve</>}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(claim, 'reject')}
                          disabled={!!isProcessing}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {isProcessing === 'reject'
                            ? <><div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-1.5" />Denying…</>
                            : <><XCircle className="w-3.5 h-3.5 mr-1.5" />Deny</>}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reviewed info for non-pending */}
                  {!isPending && (claim.admin_notes || claim.reviewed_at) && (
                    <div className="pt-1 border-t border-border space-y-1">
                      {claim.admin_notes && (
                        <p className="text-xs text-muted-foreground"><span className="font-medium">Note:</span> {claim.admin_notes}</p>
                      )}
                      {claim.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed {new Date(claim.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      <ProofViewerDialog proofUrl={viewProof} onClose={() => setViewProof(null)} />

      {/* History side panel */}
      {historyVenue && (
        <div className="w-80 flex-shrink-0 border border-border rounded-2xl overflow-hidden bg-card flex flex-col" style={{ maxHeight: '80vh' }}>
          <VenueClaimHistory
            venueId={historyVenue.venueId}
            venueName={historyVenue.venueName}
            onClose={() => setHistoryVenue(null)}
          />
        </div>
      )}
      </div>
    </div>
  );
}