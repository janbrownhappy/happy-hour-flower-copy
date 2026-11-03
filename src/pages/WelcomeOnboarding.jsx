import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Crown, Map, Bell, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FEATURES = [
  {
    icon: <Map className="w-8 h-8" />,
    title: 'Discover Happy Hours',
    description: 'Browse and discover the best happy hour deals near you across Greenville and surrounding areas.',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: <Map className="w-8 h-8" />,
    title: 'Browse by Neighborhood',
    description: 'Filter deals by area — explore happy hours in Downtown, West End, Mauldin, Simpsonville, and more.',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    icon: <Crown className="w-8 h-8" />,
    title: 'Premium Perks',
    description: 'Unlock exclusive deals, unlimited favorites, and ad-free browsing with Explorer Premium.',
    color: 'from-purple-400 to-pink-500',
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'Save Favorites',
    description: 'Build your personal list of favorite venues and track the best spots in town.',
    color: 'from-green-400 to-emerald-500',
  },
];

const NEIGHBORHOODS = [
  { id: 'GVL-01', name: 'Downtown / Main Street', city: 'Greenville' },
  { id: 'GVL-02', name: 'West End', city: 'Greenville' },
  { id: 'GVL-03', name: 'Village of West Greenville', city: 'Greenville' },
  { id: 'GVL-04', name: 'Augusta Road Corridor', city: 'Greenville' },
  { id: 'GVL-05', name: 'Haynie-Sirrine / Fluor Field', city: 'Greenville' },
  { id: 'GVL-06', name: 'Hampton Station / Sans Souci', city: 'Greenville' },
  { id: 'MAU-01', name: 'BridgeWay Station', city: 'Mauldin' },
  { id: 'MAU-02', name: 'Mauldin Main / E. Butler Rd', city: 'Mauldin' },
  { id: 'SIM-01', name: 'Downtown Simpsonville', city: 'Simpsonville' },
  { id: 'SIM-02', name: 'Five Forks', city: 'Simpsonville' },
  { id: 'SIM-03', name: 'Fairview Road', city: 'Simpsonville' },
  { id: 'FTN-01', name: 'Downtown Fountain Inn', city: 'Fountain Inn' },
];

export default function WelcomeOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (step < FEATURES.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigate('/explore');
    }
  };

  const toggleNeighborhood = (id) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save neighborhood preferences to profile
      const user = await base44.auth.me();
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      
      // Convert neighborhood IDs to full names (matching Venue.neighborhood format)
      const neighborhoodNames = selectedNeighborhoods.map(id => {
        const hood = NEIGHBORHOODS.find(n => n.id === id);
        return hood ? `${id} ${hood.name}` : id;
      });
      
      const profileData = {
        notif_neighborhoods: neighborhoodNames,
        notif_new_deals: selectedNeighborhoods.length > 0,
      };

      if (profiles.length > 0) {
        await base44.entities.Profile.update(profiles[0].id, profileData);
      } else {
        await base44.entities.Profile.create(profileData);
      }

      navigate('/explore');
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: FEATURES.length + 1 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-amber-500' : i < step ? 'w-4 bg-amber-500/50' : 'w-2 bg-slate-600'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step < FEATURES.length ? (
            // Feature slides
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${FEATURES[step].color} flex items-center justify-center text-white shadow-lg`}>
                {FEATURES[step].icon}
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-3">
                {FEATURES[step].title}
              </h2>
              <p className="text-slate-300 text-base mb-8">
                {FEATURES[step].description}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {step === FEATURES.length - 1 ? 'Get Started' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            // Neighborhood selection
            <motion.div
              key="neighborhoods"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <Bell className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                <h2 className="text-2xl font-heading font-bold text-white mb-2">
                  Choose Your Neighborhoods
                </h2>
                <p className="text-slate-300 text-sm">
                  Get notified about new happy hour deals in these areas
                </p>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-300 text-sm">Select neighborhoods</p>
                <button
                  onClick={() => setSelectedNeighborhoods(selectedNeighborhoods.length === NEIGHBORHOODS.length ? [] : NEIGHBORHOODS.map(n => n.id))}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  {selectedNeighborhoods.length === NEIGHBORHOODS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 mb-6 max-h-96 overflow-y-auto p-2">
                {NEIGHBORHOODS.map(neighborhood => (
                  <button
                    key={neighborhood.id}
                    onClick={() => toggleNeighborhood(neighborhood.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedNeighborhoods.includes(neighborhood.id)
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/70'
                    }`}
                  >
                    <div className="font-semibold">{neighborhood.name}</div>
                    <div className="text-xs text-slate-400">{neighborhood.city}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  disabled={saving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={saving}
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {selectedNeighborhoods.length === 0 && (
                <p className="text-center text-xs text-slate-400 mt-3">
                  Skip to select all neighborhoods, or choose specific ones you care about
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}