import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';

const PAGE_SIZE = 25;

const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  unsubscribed: 'bg-muted text-muted-foreground',
};

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = () => {
    base44.entities.Lead.list('-created_date', 500)
      .then(setLeads)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatusUpdate = async (lead, status) => {
    const updated = await base44.entities.Lead.update(lead.id, { status });
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.venue_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchRole = roleFilter === 'all' || l.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    venue_owners: leads.filter(l => l.role === 'venue_owner').length,
  };

  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{counts.new}</p>
          <p className="text-xs text-muted-foreground">New</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{counts.contacted}</p>
          <p className="text-xs text-muted-foreground">Contacted</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{counts.converted}</p>
          <p className="text-xs text-muted-foreground">Converted</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{counts.venue_owners}</p>
          <p className="text-xs text-muted-foreground">Venue Owners</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="consumer">Consumer</SelectItem>
            <SelectItem value="venue_owner">Venue Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-2">{filtered.length} leads</p>

      <div className="space-y-2">
        {paginated.map(lead => (
          <div key={lead.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">
                  {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Anonymous'}
                </p>
                {lead.venue_name && <span className="text-xs text-muted-foreground">· {lead.venue_name}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {lead.email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /> {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {lead.phone}
                  </span>
                )}
                {lead.zip_code && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {lead.zip_code}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <Badge variant="outline" className={`text-xs py-0 ${STATUS_STYLES[lead.status] || ''}`}>
                  {lead.status || 'new'}
                </Badge>
                {lead.role && <Badge variant="secondary" className="text-xs py-0 capitalize">{lead.role.replace('_', ' ')}</Badge>}
                {lead.source && <Badge variant="outline" className="text-xs py-0">{lead.source}</Badge>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <p className="text-xs text-muted-foreground">
                {lead.created_date && new Date(lead.created_date).toLocaleDateString()}
              </p>
              <Select value={lead.status || 'new'} onValueChange={v => handleStatusUpdate(lead, v)}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No leads found.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}