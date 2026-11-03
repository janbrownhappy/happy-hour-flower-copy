import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ListPlus, Loader2, Upload } from 'lucide-react';
import { urlsFromText, urlsFromFile } from '@/lib/extractUrls';
import BulkImportQueueStatus from '@/components/admin/BulkImportQueueStatus';
import SheetLicenseImport from '@/components/admin/SheetLicenseImport';

export default function BulkWebsiteImport() {
  const [text, setText] = useState('');
  const [publish, setPublish] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('Reading file…');
    const urls = await urlsFromFile(file).catch(err => { setMsg(err.message); return null; });
    e.target.value = '';
    if (!urls) return;
    setText(t => [t.trim(), ...urls].filter(Boolean).join('\n'));
    setMsg(`Found ${urls.length} URLs in ${file.name}`);
  };

  const enqueue = async () => {
    const urls = [...new Set(urlsFromText(text))];
    setAdding(true);
    const batch_label = new Date().toLocaleString();
    for (let i = 0; i < urls.length; i += 500) {
      setMsg(`Adding ${Math.min(i + 500, urls.length)} of ${urls.length} to the queue…`);
      await base44.entities.WebsiteImportJob.bulkCreate(
        urls.slice(i, i + 500).map(url => ({ url, publish, status: 'queued', attempts: 0, batch_label }))
      );
    }
    setMsg(`${urls.length} URLs queued. They process in the background, so you can close this page.`);
    setText('');
    setAdding(false);
    setRefreshKey(k => k + 1);
  };

  const count = urlsFromText(text).length;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><ListPlus className="w-4 h-4 text-primary" /> Bulk Add from Websites</h3>
      <p className="text-xs text-muted-foreground">Paste URLs (one per line) or upload a CSV / Excel file. They're queued and processed in the background, even if you close the browser. Directory and listing sites are skipped automatically.</p>
      <Textarea rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={'https://venue-one.com\nhttps://venue-two.com'} disabled={adding} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer border border-input rounded-md px-3 min-h-[44px]">
          <Upload className="w-4 h-4" /> Upload CSV / Excel
          <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={onFile} disabled={adding} />
        </label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={publish} onCheckedChange={setPublish} disabled={adding} /> Publish new venues after enrichment</label>
        <Button onClick={enqueue} disabled={!count || adding} className="ml-auto">
          {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Queuing…</> : `Queue ${count} URL${count === 1 ? '' : 's'}`}
        </Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <SheetLicenseImport publish={publish} onQueued={() => setRefreshKey(k => k + 1)} />
      <BulkImportQueueStatus refreshKey={refreshKey} />
    </div>
  );
}