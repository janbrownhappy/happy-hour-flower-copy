import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, MessageSquare, RotateCcw, Trash2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import SmsTierLimits from '@/components/admin/SmsTierLimits';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

export default function AdminMessagingLimits() {
  const { locationFilter } = useAdminLocation();
  const queryClient = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: venues = [] } = useQuery({
    queryKey: ['venues-premium'],
    queryFn: () => base44.entities.Venue.list(),
  });

  const { data: allSettings = [] } = useQuery({
    queryKey: ['venue-comm-settings'],
    queryFn: () => base44.entities.VenueCommunicationSettings.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VenueCommunicationSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-comm-settings'] });
      toast.success('Limit updated');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VenueCommunicationSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-comm-settings'] });
      toast.success('Settings created');
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VenueCommunicationSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-comm-settings'] });
      toast.success('Counter reset');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VenueCommunicationSettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-comm-settings'] });
      toast.success('Settings deleted — venue will use default limit (20/month)');
    },
  });

  // Show premium/platinum venues PLUS any venue that already has custom settings
  const scopedVenues = hasTerritory(locationFilter)
    ? venues.filter(v => venueInTerritory(v, locationFilter))
    : venues;
  const venuesWithSettings = new Set(allSettings.map(s => s.venue_id));
  const displayVenues = scopedVenues.filter(v =>
    ['premium', 'platinum'].includes(v.subscription_tier) || venuesWithSettings.has(v.id)
  );
  const settingsMap = Object.fromEntries(allSettings.map(s => [s.venue_id, s]));

  // Venues not yet in the list (available to add)
  const addableVenues = scopedVenues.filter(v => !displayVenues.find(dv => dv.id === v.id));

  const [editingLimits, setEditingLimits] = useState({});
  const [addVenueId, setAddVenueId] = useState('');
  const [addLimit, setAddLimit] = useState('20');

  const handleAddVenue = () => {
    const venue = venues.find(v => v.id === addVenueId);
    if (!venue) { toast.error('Please select a venue'); return; }
    const limit = parseInt(addLimit);
    if (isNaN(limit) || limit < 0) { toast.error('Please enter a valid limit'); return; }
    createMutation.mutate(
      { venue_id: venue.id, monthly_message_limit: limit, messages_sent_this_month: 0, last_reset_date: currentMonth },
      { onSuccess: () => { setAddVenueId(''); setAddLimit('20'); } }
    );
  };

  const handleLimitChange = (venueId, value) => {
    setEditingLimits(prev => ({ ...prev, [venueId]: value }));
  };

  const handleSave = async (venue) => {
    const newLimit = parseInt(editingLimits[venue.id]);
    if (isNaN(newLimit) || newLimit < 0) {
      toast.error('Please enter a valid number (0 or more)');
      return;
    }
    const existing = settingsMap[venue.id];
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: { monthly_message_limit: newLimit } });
    } else {
      createMutation.mutate({ venue_id: venue.id, monthly_message_limit: newLimit, messages_sent_this_month: 0, last_reset_date: currentMonth });
    }
    setEditingLimits(prev => { const n = { ...prev }; delete n[venue.id]; return n; });
  };

  const handleReset = (venue) => {
    const existing = settingsMap[venue.id];
    if (!existing) return;
    if (!confirm(`Reset message counter for "${venue.name}" to 0?`)) return;
    resetMutation.mutate({ id: existing.id, data: { messages_sent_this_month: 0, last_reset_date: currentMonth } });
  };

  const handleDelete = (venue) => {
    const existing = settingsMap[venue.id];
    if (!existing) return;
    if (!confirm(`Delete custom messaging settings for "${venue.name}"? It will revert to the default limit of 20/month.`)) return;
    deleteMutation.mutate(existing.id);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Fan Messaging Limits</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Set and manage the monthly message limit for each Premium / Platinum venue. Default is 20/month. 
          Edit the number and click <strong>Save</strong> to update, <strong>Reset</strong> to clear this month's counter, or <strong>Delete</strong> to remove custom settings and revert to the default.
        </p>
      </div>

      <SmsTierLimits />

      {/* Add a venue */}
      <div className="flex items-end gap-2 mb-6 p-4 border rounded-xl bg-muted/40 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs font-medium text-muted-foreground">Add a venue to manage</label>
          <Select value={addVenueId} onValueChange={setAddVenueId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a venue…" />
            </SelectTrigger>
            <SelectContent>
              {addableVenues.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name} {v.subscription_tier ? `(${v.subscription_tier})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Monthly limit</label>
          <Input
            type="number"
            min={0}
            value={addLimit}
            onChange={e => setAddLimit(e.target.value)}
            className="w-24 h-9 text-sm"
            placeholder="20"
          />
        </div>
        <Button onClick={handleAddVenue} disabled={!addVenueId}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {displayVenues.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
          No premium venues yet.
        </div>
      ) : (
        <div className="space-y-3">
          {displayVenues.map(venue => {
            const s = settingsMap[venue.id];
            const sent = (s?.last_reset_date !== currentMonth ? 0 : s?.messages_sent_this_month) || 0;
            const limit = s?.monthly_message_limit ?? 20;
            const editVal = editingLimits[venue.id];

            return (
              <div key={venue.id} className="border rounded-xl p-5 bg-card flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">{venue.name}</span>
                    <Badge className={venue.subscription_tier === 'platinum' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}>
                      {venue.subscription_tier}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sent} / {limit} messages sent this month
                  </div>
                  {/* mini usage bar */}
                  <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden w-48">
                    <div
                      className={`h-full rounded-full ${sent / limit > 0.8 ? 'bg-red-500' : sent / limit > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (sent / limit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Monthly limit:</label>
                    <Input
                      type="number"
                      min={0}
                      value={editVal !== undefined ? editVal : limit}
                      onChange={e => handleLimitChange(venue.id, e.target.value)}
                      className="w-24 h-8 text-sm"
                      placeholder="e.g. 20"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSave(venue)}
                    title="Save new monthly limit"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  {s && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReset(venue)}
                      title="Reset this month's sent counter to 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Counter
                    </Button>
                  )}
                  {s && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(venue)}
                      title="Delete custom settings — reverts to default 20/month"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}