import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import DobSelect from '@/components/DobSelect';
import { meetsMinimumAge, getAge, MIN_AGE } from '@/lib/ageVerification';

// Required 21+ birthday check for accounts that skipped it (e.g. Google sign-ups, older venue owners).
export default function VerifyAge() {
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const age = getAge(dob);
  const underage = dob && age !== null && age < MIN_AGE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!meetsMinimumAge(dob)) return;
    setSaving(true);
    const me = await base44.auth.me();
    const profiles = await base44.entities.Profile.filter({ created_by_id: me.id });
    if (profiles.length > 0) await base44.entities.Profile.update(profiles[0].id, { date_of_birth: dob });
    else await base44.entities.Profile.create({ date_of_birth: dob });
    window.location.href = me.role === 'venue_owner' ? '/venue-owner' : '/explore';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #0f1b3d 0%, #1a2e6b 50%, #0d1a3a 100%)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Confirm your age</h1>
          <p className="text-blue-200 text-sm">We feature alcohol-related deals, so everyone must be {MIN_AGE}+.</p>
        </div>
        <DobSelect value={dob} onChange={setDob} />
        {underage && (
          <p className="text-xs text-red-400 font-medium">You must be {MIN_AGE} or older to use Happy Hour Flower.</p>
        )}
        <Button type="submit" disabled={saving || !meetsMinimumAge(dob)}
          className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl">
          {saving ? 'Saving…' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}