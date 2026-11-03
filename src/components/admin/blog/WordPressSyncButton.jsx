import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function WordPressSyncButton({ onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const sync = async () => {
    setSyncing(true);
    setResult(null);
    const res = await base44.functions.invoke('syncWordPressPosts', {}).catch((e) => ({ data: { error: e.message } }));
    setResult(res.data);
    setSyncing(false);
    onSynced?.();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={sync} disabled={syncing} size="sm">
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync WordPress Now'}
      </Button>
      {result && (
        <p className={`text-xs text-right max-w-xs ${result.error ? 'text-destructive' : 'text-muted-foreground'}`}>
          {result.error || result.message}
          {result.errors?.length ? ` ${result.errors[0]}` : ''}
        </p>
      )}
    </div>
  );
}