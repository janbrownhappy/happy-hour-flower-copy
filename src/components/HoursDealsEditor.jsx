import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Zap, Plus, Trash2, Crown, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import CopyDayMenu from '@/components/venue/CopyDayMenu';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

export default function HoursDealsEditor({ venue, canEdit, canUnlimitedSpecials, maxDays = null, onSave, onUpgrade }) {
  const [days, setDays] = useState(venue?.days || []);
  const [daySchedules, setDaySchedules] = useState(venue?.day_schedules || {});
  const [dealsByDay, setDealsByDay] = useState(venue?.deals_by_day || {});
  // Per-day sets of premium-exclusive deal indices, e.g. { Mon: Set(0, 2) }
  const [premiumDealsByDay, setPremiumDealsByDay] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!venue) return;
    // Normalize full day names to short keys (e.g. 'Tuesday' → 'Tue')
    const FULL_TO_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
    const normDay = d => FULL_TO_SHORT[d] || d;
    const normObj = obj => {
      if (!obj) return {};
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [normDay(k), v]));
    };

    const normalizedDays = (venue.days || []).map(normDay).filter(d => DAYS.includes(d));
    const normalizedSchedules = normObj(venue.day_schedules);
    const normalizedDealsByDay = normObj(venue.deals_by_day);

    setDays(normalizedDays);
    // Build day_schedules — fall back to global happy_hour_start/end if per-day not set
    const schedules = { ...normalizedSchedules };
    normalizedDays.forEach(day => {
      if (!schedules[day] || (!schedules[day].start && !schedules[day].end)) {
        schedules[day] = {
          start: venue.happy_hour_start || '',
          end: venue.happy_hour_end || '',
        };
      }
    });
    setDaySchedules(schedules);
    // Initialize deals_by_day — fall back to global deals if per-day not set
    const dbd = {};
    normalizedDays.forEach(day => {
      dbd[day] = normalizedDealsByDay[day]?.length
        ? normalizedDealsByDay[day]
        : venue.deals?.length ? [...venue.deals] : [''];
    });
    setDealsByDay(dbd);
    // Initialize premium-exclusive deal-index sets from the stored map
    const normalizedPremium = normObj(venue.premium_deals_by_day);
    const pbd = {};
    normalizedDays.forEach(day => {
      pbd[day] = new Set(Array.isArray(normalizedPremium[day]) ? normalizedPremium[day] : []);
    });
    setPremiumDealsByDay(pbd);
    // Auto-expand days that have times set
    const expanded = {};
    normalizedDays.forEach(d => { expanded[d] = true; });
    setExpandedDays(expanded);
  }, [venue]);

  const toggleDay = (day) => {
    if (days.includes(day)) {
      setDays(prev => prev.filter(d => d !== day));
      setDaySchedules(prev => { const n = { ...prev }; delete n[day]; return n; });
      setDealsByDay(prev => { const n = { ...prev }; delete n[day]; return n; });
      setPremiumDealsByDay(prev => { const n = { ...prev }; delete n[day]; return n; });
      setExpandedDays(prev => { const n = { ...prev }; delete n[day]; return n; });
    } else {
      // Free tier: cap the number of active days
      if (maxDays && days.length >= maxDays) {
        onUpgrade && onUpgrade('More Happy Hour Days');
        return;
      }
      setDays(prev => [...prev, day]);
      setDaySchedules(prev => ({ ...prev, [day]: { start: '', end: '' } }));
      setDealsByDay(prev => ({ ...prev, [day]: [''] }));
      setExpandedDays(prev => ({ ...prev, [day]: true }));
    }
  };

  const atDayLimit = maxDays && days.length >= maxDays;

  const setDayTime = (day, field, val) => {
    setDaySchedules(prev => ({ ...prev, [day]: { ...prev[day], [field]: val } }));
  };

  const copyToSelected = (sourceDay, targetDaysRaw) => {
    // Respect the free-tier day cap when copying onto new days
    let targetDays = targetDaysRaw;
    if (maxDays) {
      const newDays = targetDaysRaw.filter(d => !days.includes(d));
      const room = Math.max(0, maxDays - days.length);
      if (newDays.length > room) {
        const allowedNew = newDays.slice(0, room);
        targetDays = targetDaysRaw.filter(d => days.includes(d) || allowedNew.includes(d));
        onUpgrade && onUpgrade('More Happy Hour Days');
      }
    }
    const sched = daySchedules[sourceDay];
    const sourceDeals = dealsByDay[sourceDay] || [];
    const sourcePremium = premiumDealsByDay[sourceDay] || new Set();
    setDaySchedules(prev => {
      const n = { ...prev };
      targetDays.forEach(d => {
        if (sched?.start || sched?.end) n[d] = { start: sched.start || '', end: sched.end || '' };
      });
      return n;
    });
    setDealsByDay(prev => {
      const n = { ...prev };
      targetDays.forEach(d => { if (sourceDeals.length) n[d] = [...sourceDeals]; });
      return n;
    });
    // Copy the premium-exclusive flags alongside the deals
    setPremiumDealsByDay(prev => {
      const n = { ...prev };
      targetDays.forEach(d => { if (sourceDeals.length) n[d] = new Set(sourcePremium); });
      return n;
    });
    // Make sure target days are active
    setDays(prev => {
      const next = [...prev];
      targetDays.forEach(d => { if (!next.includes(d)) next.push(d); });
      return next;
    });
  };

  const updateDeal = (day, i, val) => {
    setDealsByDay(prev => {
      const dayDeals = [...(prev[day] || [''])];
      dayDeals[i] = val;
      return { ...prev, [day]: dayDeals };
    });
  };

  const addDeal = (day) => {
    setDealsByDay(prev => ({ ...prev, [day]: [...(prev[day] || ['']), ''] }));
  };

  const removeDeal = (day, i) => {
    setDealsByDay(prev => {
      const dayDeals = (prev[day] || ['']).filter((_, j) => j !== i);
      return { ...prev, [day]: dayDeals.length ? dayDeals : [''] };
    });
    // Drop the removed index from the premium set and shift higher indices down by one
    setPremiumDealsByDay(prev => {
      const current = prev[day];
      if (!current) return prev;
      const next = new Set();
      current.forEach(idx => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return { ...prev, [day]: next };
    });
  };

  const togglePremiumDeal = (day, i) => {
    setPremiumDealsByDay(prev => {
      const next = new Set(prev[day] || []);
      if (next.has(i)) next.delete(i); else next.add(i);
      return { ...prev, [day]: next };
    });
  };



  const handleSave = async () => {
    setSaving(true);
    // Clean empty deals — and remap premium indices to the cleaned arrays,
    // since filtering out blank deals shifts the surviving indices.
    const cleanDealsByDay = {};
    const cleanPremiumByDay = {};
    Object.entries(dealsByDay).forEach(([day, dayDeals]) => {
      const premiumSet = premiumDealsByDay[day] || new Set();
      const filtered = [];
      const premiumIndices = [];
      (dayDeals || []).forEach((d, origIdx) => {
        if (!d.trim()) return;
        const newIdx = filtered.length;
        filtered.push(d);
        if (premiumSet.has(origIdx)) premiumIndices.push(newIdx);
      });
      if (filtered.length) {
        cleanDealsByDay[day] = filtered;
        if (premiumIndices.length) cleanPremiumByDay[day] = premiumIndices;
      }
    });
    // Global fallback fields
    const firstDay = days[0];
    const firstSchedule = firstDay ? daySchedules[firstDay] : null;
    const firstDayDeals = firstDay ? cleanDealsByDay[firstDay] : null;
    await onSave({
      days,
      day_schedules: daySchedules,
      deals_by_day: cleanDealsByDay,
      premium_deals_by_day: cleanPremiumByDay,
      happy_hour_start: firstSchedule?.start || '',
      happy_hour_end: firstSchedule?.end || '',
      deals: firstDayDeals || [],
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <p className="text-white font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Schedule by Day
        </p>
        <p className="text-slate-400 text-xs">Select the days you offer happy hour and set times & deals per day.</p>
        {maxDays && (
          <p className="text-xs text-amber-400">
            Free plan: up to {maxDays} days, 1 special per day.{atDayLimit ? ' Limit reached — upgrade for more.' : ''}
          </p>
        )}

        {/* Day toggle pills */}
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const active = days.includes(day);
            const blocked = !active && atDayLimit;
            return (
              <button
                key={day}
                onClick={() => canEdit && toggleDay(day)}
                disabled={!canEdit || blocked}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                } disabled:cursor-not-allowed ${blocked ? 'opacity-40' : ''}`}
              >
                {DAY_FULL[day]}
              </button>
            );
          })}
        </div>

        {/* Per-day cards */}
        <div className="space-y-3 mt-2">
          {DAYS.filter(d => days.includes(d)).map(day => {
            const sched = daySchedules[day] || { start: '', end: '' };
            const dayDeals = dealsByDay[day] || [''];
            const isExpanded = expandedDays[day] !== false;
            const hasTime = sched.start && sched.end;
            const dealsCount = dayDeals.filter(d => d.trim()).length;

            return (
              <div key={day} className="bg-slate-700/60 border border-slate-600 rounded-xl overflow-hidden">
                {/* Day header */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !isExpanded }))}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-amber-300 font-semibold text-sm">{DAY_FULL[day]}</span>
                    {hasTime && (
                      <span className="text-xs text-slate-400">{sched.start} – {sched.end}</span>
                    )}
                    {dealsCount > 0 && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        {dealsCount} deal{dealsCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {!hasTime && (
                      <span className="text-xs text-slate-500">Set times below</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-600/50 pt-3">
                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-slate-500 text-xs mb-1 block">Start Time</Label>
                        <Input
                          value={sched.start}
                          onChange={e => setDayTime(day, 'start', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                          placeholder="4:00 PM"
                          disabled={!canEdit}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-500 text-xs mb-1 block">End Time</Label>
                        <Input
                          value={sched.end}
                          onChange={e => setDayTime(day, 'end', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                          placeholder="7:00 PM"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                    {/* Deals */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-500 text-xs">Deals & Specials</Label>
                      </div>
                      {canUnlimitedSpecials && canEdit && (
                        <p className="text-slate-500 text-[11px] -mt-1">Tag a deal “premium-only” to show it only to Premium members.</p>
                      )}
                      {(canUnlimitedSpecials ? dayDeals : dayDeals.slice(0, 1)).map((deal, i) => {
                        const isPremiumDeal = (premiumDealsByDay[day] || new Set()).has(i);
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex gap-2">
                              <Input
                                value={deal}
                                onChange={e => updateDeal(day, i, e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white flex-1 h-8 text-sm"
                                placeholder="e.g., $5 Draft Beers, 2-for-1 Apps"
                                disabled={!canEdit}
                              />
                              {canUnlimitedSpecials && dayDeals.length > 1 && canEdit && (
                                <button onClick={() => removeDeal(day, i)} className="p-1.5 rounded-lg hover:bg-slate-700">
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                              )}
                            </div>
                            {/* Premium-only toggle — available to venues that can publish premium specials */}
                            {canUnlimitedSpecials && canEdit && deal.trim() && (
                              <button
                                type="button"
                                onClick={() => togglePremiumDeal(day, i)}
                                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${
                                  isPremiumDeal
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                    : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-amber-500/40 hover:text-amber-300'
                                }`}
                              >
                                {isPremiumDeal ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {isPremiumDeal ? 'Premium members only' : 'Make premium-only'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {canEdit && (
                        canUnlimitedSpecials ? (
                          <button
                            onClick={() => addDeal(day)}
                            className="w-full mt-1 py-2 border border-dashed border-amber-500/40 rounded-lg text-sm text-amber-400 hover:border-amber-500 hover:bg-amber-500/5 transition-colors flex items-center justify-center gap-1.5"
                            >
                            <Plus className="w-4 h-4" /> Add deal for {DAY_FULL[day]}
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpgrade('Multiple Deals & Specials')}
                            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                          >
                            <Crown className="w-3 h-3" /> Add more deals (Premium)
                          </button>
                        )
                      )}
                    </div>

                    {/* Inline copy-to-other-days */}
                    {canEdit && (hasTime || dealsCount > 0) && (
                      <div className="pt-1">
                        <CopyDayMenu
                          sourceDay={day}
                          onCopy={(targetDays) => copyToSelected(day, targetDays)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {days.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">Select days above to set your schedule.</p>
          )}
        </div>
      </div>

      {/* Save button */}
      {canEdit && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 font-semibold text-white rounded-xl transition-colors ${
            saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</>
          ) : saved ? (
            'Saved! ✓'
          ) : (
            'Save Schedule'
          )}
        </Button>
      )}
      {!canEdit && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">You have view-only access. Contact an owner or editor to make changes.</p>
        </div>
      )}
    </div>
  );
}