import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { redeemCoupon } from '@/functions/redeemCoupon';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, ScanLine, RotateCcw, Clock, Tag, Users, LogIn, ShieldAlert } from 'lucide-react';

const CODE_LENGTH = 12; // without dashes: XXXXXXXXXXXX

function formatCode(raw) {
  const clean = raw.replace(/-/g, '').toUpperCase().slice(0, CODE_LENGTH);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) parts.push(clean.slice(i, i + 4));
  return parts.join('-');
}

function unformatCode(formatted) {
  return formatted.replace(/-/g, '');
}

const ALLOWED_ROLES = ['admin', 'venue_owner', 'venue_staff'];

export default function StaffRedeem() {
  const { id: venueId } = useParams();
  const [venue, setVenue] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [rawCode, setRawCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { valid, consumer_name, error, redeemed_at, pass_type, title }
  const [recentRedemptions, setRecentRedemptions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setCurrentUser(me);
      }
      setAuthChecked(true);
      if (venueId) {
        base44.entities.Venue.get(venueId).then(v => setVenue(v)).catch(() => {});
      }
    };
    init();
  }, [venueId]);

  useEffect(() => {
    if (authChecked && currentUser && ALLOWED_ROLES.includes(currentUser.role)) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [authChecked, currentUser]);

  const displayCode = formatCode(rawCode);
  const isComplete = unformatCode(displayCode).length === CODE_LENGTH;

  const handleInput = (e) => {
    const clean = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, CODE_LENGTH);
    setRawCode(clean);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isComplete) handleRedeem();
  };

  const handleRedeem = async () => {
    if (!isComplete || loading) return;
    setLoading(true);
    setResult(null);

    const code = displayCode; // formatted with dashes
    const res = await redeemCoupon({ redemption_code: code });
    const data = res?.data || {};

    // Enrich with pass template info if valid
    let passTitle = '';
    let passType = '';
    if (data.valid) {
      try {
        const instances = await base44.entities.PassInstance.filter({ redemption_code: code });
        if (instances.length > 0) {
          const inst = instances[0];
          passType = inst.pass_type;
          const templates = await base44.entities.WalletPass.filter({ id: inst.wallet_pass_id });
          if (templates.length > 0) passTitle = templates[0].title;
        }
      } catch (_) {}
    }

    const fullResult = { ...data, pass_type: passType, pass_title: passTitle };
    setResult(fullResult);

    if (data.valid) {
      setRecentRedemptions(prev => [{
        code,
        consumer_name: data.consumer_name,
        redeemed_at: data.redeemed_at,
        pass_title: passTitle,
        pass_type: passType,
      }, ...prev].slice(0, 5));
    }

    setLoading(false);
  };

  const handleReset = () => {
    setRawCode('');
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isSuccess = result?.valid === true;
  const isError = result && !result.valid;

  // Auth loading
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center">
          <ScanLine className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl mb-2">Staff Pass Validator</h1>
          {venue && <p className="text-slate-400 text-sm mb-1">{venue.name}</p>}
          <p className="text-slate-500 text-sm">Please sign in with your staff account to continue.</p>
        </div>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.href)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </button>
      </div>
    );
  }

  // Logged in but wrong role
  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm">Your account doesn't have staff permissions for this venue.</p>
          <p className="text-slate-500 text-xs mt-1">Contact your venue manager to be added as staff.</p>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="text-slate-400 hover:text-slate-200 text-sm underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Pass Validator</p>
            {venue && <p className="text-slate-400 text-xs">{venue.name}</p>}
          </div>
        </div>
        {recentRedemptions.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {recentRedemptions.length} redeemed
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 gap-6 max-w-lg mx-auto w-full">

        {/* Result card */}
        {result ? (
          <div className={`w-full rounded-2xl p-8 text-center border transition-all ${
            isSuccess
              ? 'bg-emerald-950/60 border-emerald-500/50'
              : 'bg-red-950/60 border-red-500/50'
          }`}>
            {isSuccess ? (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-emerald-300 font-bold text-2xl mb-1">
                  {result.stamp ? (result.reward_earned ? 'Reward Earned!' : 'Stamp Added') : 'Approved!'}
                </p>
                {result.stamp && (
                  <p className="text-amber-300 text-base font-semibold">
                    {result.reward_earned ? 'Give the reward. Card reset to 0.' : `${result.loyalty_points} of ${result.loyalty_max_points} stamps`}
                  </p>
                )}
                {result.consumer_name && (
                  <p className="text-slate-200 text-lg font-medium mt-2">{result.consumer_name}</p>
                )}
                {result.pass_title && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 text-sm">{result.pass_title}</span>
                  </div>
                )}
                <p className="text-slate-400 text-sm mt-3 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(result.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <p className="text-red-300 font-bold text-2xl mb-2">Declined</p>
                <p className="text-slate-300 text-base">{result.error || 'Invalid pass.'}</p>
                {result.redeemed_at && (
                  <p className="text-slate-500 text-sm mt-2">
                    Previously redeemed at {new Date(result.redeemed_at).toLocaleString()}
                  </p>
                )}
              </>
            )}

            <button
              onClick={handleReset}
              className="mt-6 flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Scan Next
            </button>
          </div>
        ) : (
          /* Input card */
          <div className="w-full">
            <p className="text-slate-400 text-sm text-center mb-6">
              Enter the customer's redemption code or scan their QR code
            </p>

            {/* Big code display */}
            <div
              className="relative cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <div className={`w-full rounded-2xl border-2 py-6 px-4 text-center transition-colors ${
                rawCode.length > 0 ? 'border-amber-500/60 bg-slate-800' : 'border-slate-700 bg-slate-900'
              }`}>
                <p className={`font-mono text-3xl font-bold tracking-[0.25em] transition-colors ${
                  rawCode.length > 0 ? 'text-amber-400' : 'text-slate-600'
                }`}>
                  {displayCode || 'XXXX-XXXX-XXXX'}
                </p>
                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i < unformatCode(displayCode).length ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Hidden real input */}
              <input
                ref={inputRef}
                value={rawCode}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>

            {/* Keypad for mobile */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map((key) => {
                const isBackspace = key === '⌫';
                const isEnter = key === '✓';
                return (
                  <button
                    key={key}
                    disabled={isEnter && !isComplete}
                    onClick={() => {
                      if (isBackspace) {
                        setRawCode(p => p.slice(0, -1));
                      } else if (isEnter) {
                        handleRedeem();
                      } else {
                        const next = (rawCode + key).slice(0, CODE_LENGTH);
                        setRawCode(next);
                      }
                    }}
                    className={`rounded-xl py-4 text-lg font-semibold transition-colors ${
                      isEnter
                        ? isComplete
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : isBackspace
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {loading && isEnter ? (
                      <span className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </span>
                    ) : key}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleRedeem}
              disabled={!isComplete || loading}
              className="w-full mt-4 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-lg transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validating…
                </span>
              ) : 'Validate Pass'}
            </button>
          </div>
        )}

        {/* Recent redemptions */}
        {recentRedemptions.length > 0 && !result && (
          <div className="w-full">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Recent</p>
            <div className="space-y-2">
              {recentRedemptions.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{r.consumer_name || 'Customer'}</p>
                    {r.pass_title && <p className="text-slate-500 text-xs">{r.pass_title}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-xs font-mono">{r.code}</p>
                    <p className="text-slate-500 text-xs flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(r.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}