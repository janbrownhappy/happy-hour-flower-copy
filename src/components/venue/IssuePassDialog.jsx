import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { generateWalletPassViaPassKit } from '@/functions/generateWalletPassViaPassKit';
import { sendPassEmail } from '@/functions/sendPassEmail';
import { Send, X, CheckCircle, Download } from 'lucide-react';

function generateSerial() {
  return 'PASS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function generateRedemptionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function IssuePassDialog({ template, venueId, onClose, onIssued }) {
  const [form, setForm] = useState({ consumer_name: '', consumer_email: '' });
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState(null);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const isCoupon = template.pass_type === 'coupon';

  const computeExpiry = () => {
    if (template.expiration_date) return new Date(template.expiration_date).toISOString();
    if (template.expiration_days) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(template.expiration_days));
      return d.toISOString();
    }
    return null;
  };

  const handleIssue = async () => {
    if (!form.consumer_name.trim() || !form.consumer_email.trim()) return;
    setIssuing(true);

    const serialNumber = generateSerial();
    const redemptionCode = generateRedemptionCode();
    const expiresAt = computeExpiry();

    const instance = await base44.entities.PassInstance.create({
      wallet_pass_id: template.id,
      venue_id: venueId,
      pass_type: template.pass_type,
      consumer_name: form.consumer_name.trim(),
      consumer_email: form.consumer_email.trim(),
      serial_number: serialNumber,
      redemption_code: redemptionCode,
      status: 'issued',
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
      loyalty_points: 0,
      loyalty_max_points: template.loyalty_max_points || 10,
      delivery_method: 'email',
      delivery_status: 'pending',
    });

    // Update issued count on template
    await base44.entities.WalletPass.update(template.id, {
      total_issued: (template.total_issued || 0) + 1,
    });

    // Generate Apple Wallet .pkpass and email it
    let passUrl = null;
    try {
      const passRes = await generateWalletPassViaPassKit({ passInstanceId: instance.id });
      passUrl = passRes?.data?.pass_url || null;

      // Email the pass (recipient and content are built server-side; marks delivery sent)
      await sendPassEmail({ passInstanceId: instance.id });
    } catch (err) {
      console.error('Pass generation/email error:', err);
      // Mark delivery failed but don't block the success UI
      await base44.entities.PassInstance.update(instance.id, { delivery_status: 'failed' });
    }

    setIssued({ instance, redemptionCode, passUrl });
    onIssued && onIssued();
    setIssuing(false);
  };

  if (issued) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-white font-semibold text-lg mb-1">Pass Issued!</p>
        <p className="text-slate-400 text-sm mb-4">
          Issued to <span className="text-white">{issued.instance.consumer_name}</span>
        </p>
        <div className="bg-slate-900 rounded-xl p-4 mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Redemption Code</p>
          <p className="text-amber-400 font-mono text-xl font-bold tracking-widest">{issued.redemptionCode}</p>
          <p className="text-slate-500 text-xs mt-2">
            {isCoupon ? 'Customer presents this code at the venue to redeem.' : 'Used to identify this customer\'s loyalty card.'}
          </p>
        </div>
        {issued.passUrl ? (
          <a
            href={issued.passUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full mb-4 py-2.5 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
          >
            <Download className="w-4 h-4" /> Add to Apple or Google Wallet
          </a>
        ) : (
          <p className="text-slate-500 text-xs mb-4">Pass emailed to customer.</p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white flex-1" onClick={() => { setIssued(null); setForm({ consumer_name: '', consumer_email: '' }); }}>
            Issue Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Send className="w-4 h-4 text-amber-500" />
          Issue Pass to Customer
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        Issuing: <span className="text-amber-400 font-medium">{template.title}</span>
      </p>
      <div className="space-y-3">
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide">Customer Name *</Label>
          <Input
            value={form.consumer_name}
            onChange={e => set('consumer_name', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white mt-1"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide">Customer Email *</Label>
          <Input
            type="email"
            value={form.consumer_email}
            onChange={e => set('consumer_email', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white mt-1"
            placeholder="jane@example.com"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300 hover:bg-slate-700 flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleIssue}
          disabled={issuing || !form.consumer_name.trim() || !form.consumer_email.trim()}
          className="bg-amber-500 hover:bg-amber-600 text-white flex-1"
        >
          {issuing ? 'Generating & Sending…' : 'Issue Pass'}
        </Button>
      </div>
    </div>
  );
}