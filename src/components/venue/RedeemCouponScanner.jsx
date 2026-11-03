import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { redeemCoupon } from '@/functions/redeemCoupon';
import { CheckCircle, XCircle, ScanLine } from 'lucide-react';

export default function RedeemCouponScanner() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await redeemCoupon({ redemption_code: code.trim().toUpperCase() });
    setResult(res.data);
    setLoading(false);
  };

  const handleReset = () => { setCode(''); setResult(null); };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <p className="text-white font-semibold flex items-center gap-2 mb-4">
        <ScanLine className="w-4 h-4 text-amber-500" /> Redeem a Coupon
      </p>
      <p className="text-slate-400 text-sm mb-4">
        Enter or scan the customer's redemption code to validate and mark it as used.
      </p>

      {!result ? (
        <div className="space-y-3">
          <div>
            <Label className="text-slate-400 text-xs uppercase tracking-wide">Redemption Code</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              className="bg-slate-700 border-slate-600 text-white mt-1 font-mono tracking-widest text-center text-lg"
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
            />
          </div>
          <Button
            onClick={handleRedeem}
            disabled={loading || !code.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {loading ? 'Validating…' : 'Validate & Redeem'}
          </Button>
        </div>
      ) : (
        <div className={`rounded-xl p-5 text-center ${result.valid ? 'bg-emerald-900/40 border border-emerald-500/40' : 'bg-red-900/40 border border-red-500/40'}`}>
          {result.valid ? (
            <>
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-300 font-bold text-lg">{result.stamp ? result.message : 'Valid! Coupon Redeemed'}</p>
              {result.consumer_name && <p className="text-slate-300 text-sm mt-1">Customer: <span className="text-white font-medium">{result.consumer_name}</span></p>}
              <p className="text-slate-500 text-xs mt-2">{new Date(result.redeemed_at).toLocaleString()}</p>
            </>
          ) : (
            <>
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="text-red-300 font-bold text-lg">Invalid Coupon</p>
              <p className="text-slate-400 text-sm mt-1">{result.error}</p>
              {result.redeemed_at && <p className="text-slate-500 text-xs mt-1">Redeemed at: {new Date(result.redeemed_at).toLocaleString()}</p>}
            </>
          )}
          <Button onClick={handleReset} variant="outline" className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700">
            Scan Another
          </Button>
        </div>
      )}
    </div>
  );
}