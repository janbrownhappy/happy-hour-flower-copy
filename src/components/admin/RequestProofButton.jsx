import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Loader2 } from 'lucide-react';

// Emails the claimant a private link to upload proof of authorization.
export default function RequestProofButton({ claim, onSent }) {
  const [sending, setSending] = useState(false);
  const send = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('claimProof', { action: 'request', claimId: claim.id });
      if (res.data?.error) throw new Error(res.data.error);
      onSent?.();
    } catch (e) {
      alert('Could not send request: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" onClick={send} disabled={sending} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50">
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
        {claim.proof_requested_at ? 'Resend proof request' : 'Request proof'}
      </button>
      {claim.proof_requested_at && (
        <span className="text-xs text-muted-foreground">
          Requested {new Date(claim.proof_requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, waiting on upload
        </span>
      )}
    </div>
  );
}