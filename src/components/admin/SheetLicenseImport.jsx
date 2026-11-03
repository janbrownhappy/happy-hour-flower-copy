import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, Loader2 } from 'lucide-react';

const MARKETS = ['Upstate', 'Midlands', 'Charleston', 'Beaches', 'Low Country'];

export default function SheetLicenseImport({ publish, onQueued }) {
  const [link, setLink] = useState('https://docs.google.com/spreadsheets/d/1xjdAKL1KBFi_XIxrOEoZ2HykW63GR5GJcOMJV4a2VXI/edit');
  const [market, setMarket] = useState('');
  const [start, setStart] = useState(2);
  const [count, setCount] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async () => {
    const sheet_id = (link.match(/\/d\/([\w-]+)/) || [])[1];
    if (!sheet_id) return setMsg('Paste a valid Google Sheet link');
    setBusy(true);
    const { data } = await base44.functions.invoke('queueLicenseSheet', { sheet_id, market, start_row: Number(start), count: Number(count), publish });
    setBusy(false);
    setMsg(data.error || `${data.queued} venues queued (${data.batch_label}), ${data.excluded} non-venues skipped.${data.next_start_row ? ` Next start row: ${data.next_start_row}` : ''}`);
    if (data.next_start_row) setStart(data.next_start_row);
    onQueued?.();
  };

  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <p className="text-sm font-medium flex items-center gap-2"><Sheet className="w-4 h-4 text-primary" /> Import from license sheet</p>
      <p className="text-xs text-muted-foreground">Uses the sheet's name, address, website and socials directly; enrichment only fills what's missing. Caterers, grocery/gas, stadiums, theaters and country clubs are skipped.</p>
      <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Google Sheet link" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs">Market
          <select className="ml-1 border border-input rounded-md px-2 min-h-[44px] bg-background text-sm" value={market} onChange={e => setMarket(e.target.value)}>
            <option value="">By row range</option>
            {MARKETS.map(m => <option key={m} value={m}>{m} (whole market)</option>)}
          </select>
        </label>
        {!market && <>
          <label className="text-xs">Start row <Input type="number" className="w-24 inline-block ml-1" value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className="text-xs">Rows <Input type="number" className="w-24 inline-block ml-1" value={count} onChange={e => setCount(e.target.value)} /></label>
        </>}
        <Button onClick={run} disabled={busy} className="ml-auto">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : market ? `Queue ${market}` : 'Queue rows'}</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}