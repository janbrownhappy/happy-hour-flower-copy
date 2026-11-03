import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DobSelect from '@/components/DobSelect';
import { Label } from '@/components/ui/label';
import { MapPin, Bell, Sparkles, ArrowRight, ArrowLeft, Check, Map, MessageSquare, Navigation } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import isTestEnv from '@/lib/isTestEnv';
import CascadingLocationPicker from '@/components/location/CascadingLocationPicker';
import OnboardingAreaPicker from '@/components/location/OnboardingAreaPicker';
import { getAge, meetsMinimumAge, MIN_AGE } from '@/lib/ageVerification';
import { trackEvent as trackRybbitEvent } from '@/lib/rybbit';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || a.area_name || '').localeCompare(b.market_name || b.area_name || '')
  );

const STEPS = [
  { label: 'Your Region', icon: MapPin },
  { label: 'Areas', icon: Map },
  { label: 'Alerts', icon: Bell },
  { label: 'All Set!', icon: Sparkles },
];

export default function CustomerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [territory, setTerritory] = useState({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [dob, setDob] = useState('');
  const [needsDob, setNeedsDob] = useState(true);

  // Area model
  const [areas, setAreas] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]); // area_id values
  const [lastPickedArea, setLastPickedArea] = useState('');
  const [primaryAreaKey, setPrimaryAreaKey] = useState('');
  const [activeMarket, setActiveMarket] = useState('');

  // Notification / permission preferences (step 3)
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const phoneValid = /^[0-9+()\-. ]{7,20}$/.test(phone.trim());

  useEffect(() => {
    Promise.all([
      base44.entities.LocationArea.list('', 500).catch(() => []),
      base44.entities.LocationMarket.list('', 200).catch(() => []),
    ]).then(([a, m]) => {
      setAreas(a.filter((x) => x.is_active !== false));
      setMarkets(sortItems(m.filter((x) => x.is_active !== false)));
    });

    base44.auth.me().then(async u => {
      setUser(u);
      try {
        const profiles = await base44.entities.Profile.filter({ created_by_id: u.id });
        const existingDob = profiles[0]?.date_of_birth || '';
        // Never overwrite a date the user already started typing
        setDob(prev => prev || existingDob);
        if (existingDob && meetsMinimumAge(existingDob)) setNeedsDob(false);
      } catch {
        setNeedsDob(true);
      }
      if (!u?.full_name || u.full_name.trim().split(/\s+/).length < 2) {
        setNeedsName(true);
        const rawName = (u?.full_name || '').trim();
        const emailPrefix = (u?.email || '').split('@')[0].toLowerCase();
        const looksLikeEmailPrefix =
          rawName.length > 0 &&
          (rawName.includes('.') || rawName.includes('_') || rawName.includes('@') ||
           rawName.toLowerCase() === emailPrefix);
        if (looksLikeEmailPrefix) {
          setFirstName('');
          setLastName('');
        } else {
          const parts = rawName.split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
      }
    }).catch(() => {});
  }, []);

  const dobAge = getAge(dob);
  const dobUnderage = dob && dobAge !== null && dobAge < MIN_AGE;

  const handleTerritorySubmit = async (e) => {
    e.preventDefault();
    if (needsName && (!firstName.trim() || !lastName.trim())) return;
    if (needsDob && !meetsMinimumAge(dob)) return;
    setSaving(true);
    try {
      if (needsName) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        await base44.auth.updateMe({ full_name: fullName });
        setUser(prev => ({ ...prev, full_name: fullName }));
      }
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      const locPrefs = {
        state: territory.state,
        state_id: territory.state_id,
        state_code: territory.state_code,
        market_id: territory.market_id,
        market_name: territory.market_name,
        zip_code: territory.zip_code,
        last_updated: new Date().toISOString(),
      };
      const profileData = { zip_code: territory.zip_code, location_preferences: locPrefs };
      if (dob) profileData.date_of_birth = dob;
      if (needsName) profileData.display_name = `${firstName.trim()} ${lastName.trim()}`;
      if (profiles.length > 0) {
        await base44.entities.Profile.update(profiles[0].id, profileData);
      } else {
        await base44.entities.Profile.create(profileData);
      }
      // Focus the picked market so the Areas step opens confined to it
      if (territory.market_id) setActiveMarket(territory.market_id);
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      const chosen = selectedAreas.length > 0 ? selectedAreas : areas.map(a => a.area_id);
      // Primary area precedence: explicit pick > first selection
      const userPick =
        lastPickedArea && selectedAreas.includes(lastPickedArea) ? lastPickedArea : '';
      const primaryAreaId = userPick || selectedAreas[0] || '';
      const primaryArea = areas.find(a => a.area_id === primaryAreaId) || null;
      setPrimaryAreaKey(primaryAreaId);

      const updateData = {
        notif_areas: chosen,
        location_preferences: {
          state: territory.state,
          state_id: territory.state_id,
          state_code: territory.state_code,
          zip_code: territory.zip_code,
          area: primaryAreaId,
          area_id: primaryArea?.id || '',
          market_id: primaryArea?.market_id || '',
          market_name: primaryArea?.market_name || '',
          state_code: primaryArea?.state_code || '',
          last_updated: new Date().toISOString(),
        },
      };

      if (profiles.length > 0) {
        await base44.entities.Profile.update(profiles[0].id, updateData);
      } else {
        await base44.entities.Profile.create(updateData);
      }
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableLocation = () => {
    // Flip the toggle and prompt the browser for the GPS permission
    setLocationEnabled(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationEnabled(true),
        () => setLocationEnabled(false)
      );
    }
  };

  const handleNotificationsSubmit = async () => {
    setSaving(true);
    try {
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      const prefs = {
        location_services_enabled: locationEnabled,
        notif_push: pushEnabled,
        notif_sms: smsEnabled,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      };
      if (profiles.length > 0) {
        await base44.entities.Profile.update(profiles[0].id, prefs);
      } else {
        await base44.entities.Profile.create(prefs);
      }
      trackRybbitEvent('onboarding_completed');
      setStep(4);
    } finally {
      setSaving(false);
    }
  };

  const handleAreaToggle = (areaId) => {
    setSelectedAreas(prev => {
      const isRemoving = prev.includes(areaId);
      setLastPickedArea(isRemoving ? '' : areaId);
      return isRemoving ? prev.filter(a => a !== areaId) : [...prev, areaId];
    });
  };

  const toggleAllInMarket = (marketId) => {
    const marketAreaIds = areas.filter(a => a.market_id === marketId).map(a => a.area_id);
    const allSelected = marketAreaIds.every(id => selectedAreas.includes(id));
    if (allSelected) {
      setSelectedAreas(prev => prev.filter(id => !marketAreaIds.includes(id)));
    } else {
      setSelectedAreas(prev => [...new Set([...prev, ...marketAreaIds])]);
    }
  };

  const areaNameById = useMemo(() => {
    const m = {};
    for (const a of areas) m[a.area_id] = a.area_name;
    return m;
  }, [areas]);

  // Confine areas/markets to the single MARKET the user picked in Step 1
  // (e.g. SC → "Greenville / Upstate" shows only Upstate areas). Fall back to the
  // whole state, then everything, if a market wasn't captured.
  const stateAreas = useMemo(() => {
    if (territory.market_id) return areas.filter(a => a.market_id === territory.market_id);
    if (territory.state) return areas.filter(a => (a.state_name || '') === territory.state);
    return areas;
  }, [areas, territory.market_id, territory.state]);

  const stateMarkets = useMemo(() => {
    const marketIds = new Set(stateAreas.map(a => a.market_id));
    return markets.filter(m => marketIds.has(m.market_id));
  }, [markets, stateAreas]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #0f1b3d 0%, #1a2e6b 50%, #0d1a3a 100%)' }}>

      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="text-3xl font-bold text-white mb-1">🌸 <span className="font-heading">HappyHour</span></div>
        <p className="text-blue-300 text-sm">Your Happy Hour Guide</p>
      </div>

      <div className="w-full max-w-lg">

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone = step > num;
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDone ? 'bg-amber-500 shadow-lg shadow-amber-500/40' :
                    isActive ? 'bg-white shadow-lg' :
                    'bg-slate-700/70 border border-slate-600'
                  }`}>
                    {isDone
                      ? <Check className="w-5 h-5 text-white" />
                      : <Icon className={`w-5 h-5 ${isActive ? 'text-slate-800' : 'text-slate-400'}`} />
                    }
                  </div>
                  <span className={`text-xs font-medium transition-colors ${
                    isActive ? 'text-white' : isDone ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-16 sm:w-24 h-0.5 mb-5 transition-colors ${
                    step > num ? 'bg-amber-500' : 'bg-slate-600'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        <MotionConfig transition={isTestEnv() ? { duration: 0 } : undefined}>
        <AnimatePresence mode="wait">

          {/* ── Step 1: Region ── */}
          {step === 1 && (
            <motion.div key="step1"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: isTestEnv() ? 0 : 0.25 }}>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Where are you located?</h1>
                <p className="text-blue-200 text-sm max-w-sm mx-auto">
                  We'll use this to show happy hours near you first and personalize your feed.
                </p>
              </div>

              <form onSubmit={handleTerritorySubmit}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5">

                {/* Name (only when missing) */}
                {needsName && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-blue-200 text-sm mb-1.5 block">
                        First Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-12 bg-blue-950/60 border-blue-500/30 text-white placeholder:text-blue-400/60 rounded-xl focus:ring-amber-500/70"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-blue-200 text-sm mb-1.5 block">
                        Last Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-12 bg-blue-950/60 border-blue-500/30 text-white placeholder:text-blue-400/60 rounded-xl focus:ring-amber-500/70"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Date of birth — required 21+ age gate (we advertise alcohol) */}
                {needsDob && (
                  <div>
                    <Label className="text-blue-200 text-sm mb-1.5 block">
                      Date of Birth <span className="text-red-400">*</span>
                    </Label>
                    <DobSelect value={dob} onChange={setDob} />
                    {dobUnderage ? (
                      <p className="mt-1.5 text-xs text-red-400 font-medium">
                        You must be {MIN_AGE} or older to join — this platform features alcohol-related content.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-blue-300/70">
                        You must be {MIN_AGE}+ to join. We never share your birth date.
                      </p>
                    )}
                  </div>
                )}

                {/* State → Region → City → ZIP */}
                <CascadingLocationPicker
                  value={territory}
                  onChange={setTerritory}
                  labelClassName="text-blue-200 text-sm mb-1.5 block"
                  selectClassName="bg-blue-950/60 border border-blue-500/30 text-white placeholder:text-blue-400/60 focus:ring-amber-500/70"
                />

                <Button
                  type="submit"
                  disabled={saving || !territory.state_id || !territory.market_id || !territory.zip_code || (needsName && (!firstName.trim() || !lastName.trim())) || (needsDob && !meetsMinimumAge(dob))}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-white font-bold text-base rounded-xl shadow-lg shadow-amber-500/30 transition-all"
                >
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>Pick My Areas <ArrowRight className="w-4 h-4 ml-2" /></>
                  }
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Areas ── */}
          {step === 2 && (
            <motion.div key="step2"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: isTestEnv() ? 0 : 0.25 }}>

              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-white mb-2">Choose Your Areas</h1>
                <p className="text-blue-200 text-sm">
                  Select the areas you want to follow. We'll show those first on your Explore feed.
                </p>
              </div>

              <OnboardingAreaPicker
                areas={stateAreas}
                markets={stateMarkets}
                selected={selectedAreas}
                activeMarket={activeMarket}
                onSetActiveMarket={setActiveMarket}
                onToggle={handleAreaToggle}
                onToggleAllInMarket={toggleAllInMarket}
              />

              <div className="flex gap-3 mt-4">
                <Button onClick={() => setStep(1)} variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/60 px-4 rounded-xl"
                  disabled={saving}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button onClick={handleComplete}
                  className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30"
                  disabled={saving}>
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>Save & Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                  }
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Alerts / Permissions ── */}
          {step === 3 && (
            <motion.div key="step3"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: isTestEnv() ? 0 : 0.25 }}>

              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-white mb-2">Stay in the Loop</h1>
                <p className="text-blue-200 text-sm max-w-sm mx-auto">
                  Turn these on so we can show nearby happy hours and alert you to fresh deals.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-3">
                {/* Location services */}
                <div className="flex items-center justify-between gap-3 p-3 bg-blue-950/40 rounded-xl border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Navigation className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Location Services</p>
                      <p className="text-xs text-blue-300/80">Used to show happy hours near you and alert you to specials when you arrive. Never sold.</p>
                    </div>
                  </div>
                  <Switch
                    checked={locationEnabled}
                    onCheckedChange={(val) => val ? handleEnableLocation() : setLocationEnabled(false)}
                  />
                </div>

                {/* Push notifications */}
                <div className="flex items-center justify-between gap-3 p-3 bg-blue-950/40 rounded-xl border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Push Notifications</p>
                      <p className="text-xs text-blue-300/80">New deals in your areas as they drop</p>
                    </div>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                </div>

                {/* SMS alerts */}
                <div className="flex items-center justify-between gap-3 p-3 bg-blue-950/40 rounded-xl border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">SMS Alerts</p>
                      <p className="text-xs text-blue-300/80">Text message notifications for deals</p>
                    </div>
                  </div>
                  <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                </div>

                {/* Mobile phone */}
                <div>
                  <Label className="text-blue-200 text-sm mb-1.5 block">
                    Mobile Phone {smsEnabled && <span className="text-red-400">*</span>}
                  </Label>
                  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="(864) 555-0123"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className="h-12 bg-blue-950/60 border-blue-500/30 text-white placeholder:text-blue-400/60 rounded-xl" />
                  <p className="mt-1.5 text-xs text-blue-300/70">For text alerts and so we can reach you. Never sold.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button onClick={() => setStep(2)} variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/60 px-4 rounded-xl"
                  disabled={saving}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button onClick={handleNotificationsSubmit}
                  className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30"
                  disabled={saving || (smsEnabled && !phoneValid) || (phone.trim() && !phoneValid)}>
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                  }
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: All Set! ── */}
          {step === 4 && (
            <motion.div key="step4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/40"
                >
                  <span className="text-4xl">🌸</span>
                </motion.div>

                <h1 className="text-3xl font-bold text-white mb-3">You're all set!</h1>
                <p className="text-blue-200 mb-6">
                  {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}!` : 'Welcome!'} Your feed is personalized for{' '}
                  <span className="text-amber-400 font-semibold">
                    {selectedAreas.length > 0
                      ? `${selectedAreas.length} area${selectedAreas.length !== 1 ? 's' : ''}`
                      : 'all areas'
                    }
                  </span>{' '}
                  {territory.market_name ? `in ${territory.market_name}` : 'in your region'}.
                </p>

                {/* Summary chips */}
                {selectedAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {selectedAreas.slice(0, 5).map(id => (
                      <span key={id} className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-medium">
                        {areaNameById[id] || id}
                      </span>
                    ))}
                    {selectedAreas.length > 5 && (
                      <span className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-full text-slate-300 text-xs font-medium">
                        +{selectedAreas.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => navigate('/explore', { replace: true, state: { fromOnboarding: true, area: primaryAreaKey } })}
                  className="w-full h-13 bg-amber-500 hover:bg-amber-400 text-white font-bold text-base rounded-xl shadow-lg shadow-amber-500/30"
                >
                  <Map className="w-5 h-5 mr-2" />
                  Explore Happy Hours
                </Button>

                <p className="text-xs text-slate-500 mt-4">
                  You can update your territory preferences anytime in your Profile settings.
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        </MotionConfig>
      </div>
    </div>
  );
}