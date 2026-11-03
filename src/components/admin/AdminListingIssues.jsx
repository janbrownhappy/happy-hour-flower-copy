import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Link as RouterLink } from 'react-router-dom';
import { Flag, ExternalLink, Loader2 } from 'lucide-react';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

const ISSUE_LABELS = {
  incorrect_hours: 'Incorrect hours',
  wrong_deals: 'Wrong/outdated deals',
  closed_permanently: 'Closed permanently',
  wrong_location: 'Wrong location',
  wrong_contact_info: 'Wrong contact info',
  other: 'Other',
};

const STATUS_STYLES = {
  open: 'bg-orange-100 text-orange-700 border-orange-200',
  in_review: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

const STATUS_OPTIONS = ['open', 'in_review', 'resolved', 'dismissed'];

export default function AdminListingIssues() {
  const { locationFilter } = useAdminLocation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [notesDraft, setNotesDraft] = useState({});

  const [venueRecords, setVenueRecords] = useState([]);

  const load = async () => {
    setLoading(true);
    const [data, venueData] = await Promise.all([
      base44.entities.ListingIssue.list('-created_date'),
      base44.entities.Venue.list(),
    ]);
    setIssues(data);
    setVenueRecords(venueData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const hasTerritory = locationFilter.state_code || locationFilter.market_id || locationFilter.area_id;
  const inTerritoryIds = hasTerritory
    ? new Set(venueRecords.filter(v => venueInTerritory(v, locationFilter)).map(v => v.id))
    : null;
  const territoryIssues = inTerritoryIds ? issues.filter(i => inTerritoryIds.has(i.venue_id)) : issues;

  const updateIssue = async (id, patch) => {
    await base44.entities.ListingIssue.update(id, patch);
    setIssues(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };

  const filtered = filter === 'all' ? territoryIssues : territoryIssues.filter(i => i.status === filter);
  const countBy = (s) => territoryIssues.filter(i => i.status === s).length;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Flag className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-heading font-bold">Listing Issue Reports ({territoryIssues.length})</h2>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
          >
            {s.replace('_', ' ')}{s !== 'all' ? ` (${countBy(s)})` : ` (${territoryIssues.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No reports in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(issue => (
            <div key={issue.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RouterLink to={`/venue/${issue.venue_id}`} className="font-semibold hover:text-primary inline-flex items-center gap-1">
                      {issue.venue_name || 'Unknown venue'}
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </RouterLink>
                    <Badge variant="outline">{ISSUE_LABELS[issue.issue_type] || issue.issue_type}</Badge>
                    <Badge className={STATUS_STYLES[issue.status]}>{issue.status.replace('_', ' ')}</Badge>
                  </div>
                  {issue.description && (
                    <p className="text-sm text-muted-foreground mt-1.5">{issue.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Reported by {issue.reporter_name || 'Anonymous'}
                    {issue.created_date && ` · ${new Date(issue.created_date).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              {/* Admin notes */}
              <Textarea
                placeholder="Internal notes…"
                rows={2}
                className="text-sm"
                value={notesDraft[issue.id] ?? issue.admin_notes ?? ''}
                onChange={(e) => setNotesDraft(prev => ({ ...prev, [issue.id]: e.target.value }))}
                onBlur={() => {
                  const draft = notesDraft[issue.id];
                  if (draft !== undefined && draft !== (issue.admin_notes ?? '')) {
                    updateIssue(issue.id, { admin_notes: draft });
                  }
                }}
              />

              {/* Status actions */}
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter(s => s !== issue.status).map(s => (
                  <Button key={s} size="sm" variant="outline" className="text-xs capitalize"
                    onClick={() => updateIssue(issue.id, { status: s })}>
                    Mark {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}