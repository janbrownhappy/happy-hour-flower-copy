import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createBillingPortal } from '@/functions/createBillingPortal';
import { openExternal, isDespia } from '@/lib/revenuecat';

export default function ManageSubscriptionLink() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = async () => {
    setError('');
    // Open the window synchronously so popup blockers / Despia allow it.
    // In Despia, open only once the real URL is known so Safari gets it directly.
    const win = isDespia() ? null : openExternal('about:blank');
    setBusy(true);
    try {
      const { data } = await createBillingPortal({ returnUrl: window.location.href });
      if (win) win.location.href = data.url; else openExternal(data.url);
    } catch (e) {
      win?.close();
      setError(e?.response?.data?.error || 'Could not open billing portal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center">
      <button onClick={open} disabled={busy} className="text-sm text-primary underline inline-flex items-center gap-1">
        {busy && <Loader2 className="w-3 h-3 animate-spin" />}Manage subscription
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}