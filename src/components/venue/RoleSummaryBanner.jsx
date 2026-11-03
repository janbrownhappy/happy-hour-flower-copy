import { Building2, Users, Store, Eye, Star, MapPin, Zap, CheckCircle } from 'lucide-react';

/**
 * Resolve the viewer's highest role for this dashboard:
 *  - brand_owner: owns at least one accessible venue
 *  - regional_manager: no owned venues, but is a regional_manager collaborator
 *  - location_admin: only editor/viewer collaborator access
 */
export function resolveDashboardRole(user, venues, myCollabRoles) {
  const ownsAny = venues.some(v => v.owner_id === user?.id);
  if (ownsAny) return 'brand_owner';
  const roles = myCollabRoles.map(c => c.role);
  if (roles.includes('regional_manager')) return 'regional_manager';
  return 'location_admin';
}

const ROLE_META = {
  brand_owner: {
    label: 'Brand Owner',
    icon: Building2,
    accent: 'text-amber-400',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    blurb: 'Full control across your brand and every location',
  },
  regional_manager: {
    label: 'Regional Manager',
    icon: Users,
    accent: 'text-sky-400',
    chip: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    blurb: 'Managing your assigned locations',
  },
  location_admin: {
    label: 'Location Admin',
    icon: Store,
    accent: 'text-blue-400',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    blurb: 'Managing your location',
  },
};

function Stat({ value, label, color = 'text-white' }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

/**
 * Role-aware summary banner. Shows a stat set tailored to the viewer's role:
 * Brand Owner sees brand-wide roll-ups, Regional Manager sees their assigned
 * region, Location Admin sees single-location vitals.
 */
export default function RoleSummaryBanner({ role, venues, amenityCounts = {} }) {
  const meta = ROLE_META[role] || ROLE_META.location_admin;
  const Icon = meta.icon;

  const liveCount = venues.filter(v => v.status === 'active').length;
  const totalViews = venues.reduce((s, v) => s + (v.view_count || 0), 0);
  const totalSaves = venues.reduce((s, v) => s + (v.favorite_count || 0), 0);
  const brandCount = new Set(venues.map(v => v.brand_id).filter(Boolean)).size;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.chip.replace('text-', 'text-').split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
          <Icon className={`w-5 h-5 ${meta.accent}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.chip}`}>
            {meta.label}
          </span>
          <p className="text-slate-400 text-xs mt-1">{meta.blurb}</p>
        </div>
      </div>

      {role === 'brand_owner' && (
        <div className="grid grid-cols-4 gap-3">
          <Stat value={brandCount || '—'} label={brandCount === 1 ? 'Brand' : 'Brands'} color="text-amber-400" />
          <Stat value={venues.length} label={`Location${venues.length !== 1 ? 's' : ''}`} />
          <Stat value={totalViews.toLocaleString()} label="Views" color="text-sky-400" />
          <Stat value={totalSaves.toLocaleString()} label="Saves" color="text-amber-400" />
        </div>
      )}

      {role === 'regional_manager' && (
        <div className="grid grid-cols-3 gap-3">
          <Stat value={venues.length} label="My Locations" color="text-sky-400" />
          <Stat value={liveCount} label="Live" color="text-emerald-400" />
          <Stat value={totalViews.toLocaleString()} label="Region Views" color="text-white" />
        </div>
      )}

      {role === 'location_admin' && (() => {
        const v = venues[0];
        const dealCount = v?.deals?.filter(d => d?.trim()).length || 0;
        const amenityCount = v ? (amenityCounts[String(v.id)] || 0) : 0;
        return (
          <div className="grid grid-cols-3 gap-3">
            <Stat value={dealCount} label={`Active Deal${dealCount !== 1 ? 's' : ''}`} color="text-emerald-400" />
            <Stat value={v?.view_count || 0} label="Views" color="text-sky-400" />
            <Stat value={v?.favorite_count || 0} label="Saves" color="text-amber-400" />
          </div>
        );
      })()}
    </div>
  );
}