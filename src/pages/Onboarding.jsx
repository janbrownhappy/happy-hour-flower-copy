import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Users, Building2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);

  const handleSelectRole = async (role) => {
    setSelecting(true);
    try {
      // Update user's role
      await base44.auth.updateMe({ role });
      
      // Route based on role
      if (role === 'venue_owner') {
        navigate('/onboarding/venue');
      } else {
        navigate('/onboarding/welcome');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setSelecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo & Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-3xl">
            🌸
          </div>
          <h1 className="text-4xl font-heading font-bold text-white mb-2">
            Welcome to
            <br />
            <span className="text-amber-400">Happy Hour Flower</span>
          </h1>
          <p className="text-slate-300 text-lg">Let's get you set up in under 90 seconds.</p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3 mb-6">
          <p className="text-slate-300 text-center text-sm font-semibold">I AM A...</p>
          
          <button
            onClick={() => handleSelectRole('user')}
            disabled={selecting}
            className="w-full p-4 rounded-xl border border-slate-600 bg-slate-800/50 hover:bg-slate-700/70 transition-colors text-left group disabled:opacity-50"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white text-lg">Happy Hour Explorer</h3>
                </div>
                <p className="text-slate-400 text-sm ml-11">
                  I want to find the best happy hours near me, save my favorites, and get deals first.
                </p>
              </div>
              <div className="text-slate-400 group-hover:text-amber-400 transition-colors">→</div>
            </div>
          </button>

          <button
            onClick={() => handleSelectRole('venue_owner')}
            disabled={selecting}
            className="w-full p-4 rounded-xl border border-slate-600 bg-slate-800/50 hover:bg-slate-700/70 transition-colors text-left group disabled:opacity-50"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white text-lg">Venue / Bar Owner</h3>
                </div>
                <p className="text-slate-400 text-sm ml-11">
                  I want to list my happy hours, manage specials, and reach local customers.
                </p>
              </div>
              <div className="text-slate-400 group-hover:text-amber-400 transition-colors">→</div>
            </div>
          </button>
        </div>

        {/* Sign In Link */}
        <p className="text-center text-sm text-slate-400">
          Already have an account? <button className="text-amber-400 hover:text-amber-300 font-semibold">Sign in</button>
        </p>
      </div>
    </div>
  );
}