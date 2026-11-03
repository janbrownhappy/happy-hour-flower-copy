import { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CreateVenueFromWebsite from '@/components/admin/CreateVenueFromWebsite';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X, MapPin } from 'lucide-react';
import { buildLocationIndex, resolveVenueLocation } from '@/lib/resolveVenueLocation';

// Recognized CSV headers → Venue field. Keys are lower-cased/trimmed.
const COLUMN_MAP = {
  'name': 'name', 'venue name': 'name', 'venue': 'name',
  'address': 'address', 'street': 'address', 'street address': 'address',
  'city': 'city',
  'state': 'state_code', 'state code': 'state_code', 'st': 'state_code',
  'zip': 'zip_code', 'zip code': 'zip_code', 'zipcode': 'zip_code', 'postal code': 'zip_code',
  'category': 'category', 'type': 'category',
  'phone': 'phone', 'phone number': 'phone',
  'website': 'website', 'url': 'website',
  'description': 'description', 'about': 'description',
};

// Minimal CSV parser handling quoted fields and commas inside quotes.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export default function BulkVenueImport() {
  const [states, setStates] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationState.list('name', 500),
      base44.entities.LocationMarket.list('market_name', 500),
      base44.entities.LocationArea.list('area_name', 1000),
    ]).then(([s, m, a]) => {
      setStates(s);
      setMarkets(m);
      setAreas(a);
    }).finally(() => setLoading(false));
  }, []);

  const index = useMemo(
    () => buildLocationIndex({ states, markets, areas }),
    [states, markets, areas]
  );

  // Each row paired with its auto-derived location.
  const resolvedRows = useMemo(
    () => parsedRows.map(row => ({ row, loc: resolveVenueLocation(row, index) })),
    [parsedRows, index]
  );

  const unmatchedCount = resolvedRows.filter(r => !r.loc.state).length;

  const handleFile = async (file) => {
    setParseError('');
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCSV(text).filter(r => r.some(cell => cell.trim() !== ''));
    if (rows.length < 2) {
      setParseError('CSV needs a header row and at least one venue row.');
      setParsedRows([]);
      return;
    }
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const mapped = rows.slice(1).map(cells => {
      const obj = {};
      headers.forEach((h, i) => {
        const field = COLUMN_MAP[h];
        if (field) obj[field] = (cells[i] || '').trim();
      });
      return obj;
    }).filter(o => o.name); // require a name
    if (mapped.length === 0) {
      setParseError('No rows with a recognizable "name" column were found.');
    }
    setParsedRows(mapped);
  };

  const handleImport = async () => {
    if (resolvedRows.length === 0) return;
    setImporting(true);
    const records = resolvedRows.map(({ row, loc }) => ({
      ...row,
      city: row.city || loc.area?.area_name || loc.market?.market_name || '',
      state_code: loc.state?.code || row.state_code || '',
      state_id: loc.state?.id,
      market_id: loc.market?.market_id,
      market_name: loc.market?.market_name,
      area_id: loc.area?.id,
      area: loc.area?.area_id,
      status: 'pending',
    }));
    let created = 0, failed = 0;
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      try {
        await base44.entities.Venue.bulkCreate(chunk);
        created += chunk.length;
      } catch {
        failed += chunk.length;
      }
    }
    setImporting(false);
    setResult({ created, failed, unmatched: unmatchedCount });
    setParsedRows([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const reset = () => {
    setParsedRows([]);
    setFileName('');
    setParseError('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <CreateVenueFromWebsite />
      <div>
        <h2 className="text-lg font-heading font-bold flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" /> Bulk Import Venues
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of venues from any mix of locations. Recognized columns: name, address, city, state, zip, category, phone, website, description. Imported venues start as <span className="font-medium text-amber-600">Pending</span> and won't appear on Explore until approved.
        </p>
      </div>

      {/* Auto-derived location note */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Location is auto-derived</p>
        <p className="text-xs text-muted-foreground mt-1">
          Each venue is assigned its own State › Market › Area from the <span className="font-medium text-foreground">city</span> and <span className="font-medium text-foreground">state</span> columns in your CSV — no single target needed. Rows we can't match are still imported so you can assign them later.
        </p>
      </div>

      {/* File upload */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <label className="text-sm font-semibold">CSV file</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
          />
          {fileName && (
            <button onClick={reset} className="text-muted-foreground hover:text-foreground" title="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {fileName && !parseError && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> {fileName} — {parsedRows.length} venue{parsedRows.length === 1 ? '' : 's'} ready
            {unmatchedCount > 0 && <span className="text-amber-600">· {unmatchedCount} without a matched location</span>}
          </p>
        )}
        {parseError && (
          <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {parseError}</p>
        )}
      </div>

      {/* Preview */}
      {resolvedRows.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Preview ({resolvedRows.length} venues)
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Address</th>
                  <th className="px-3 py-2 font-semibold">City</th>
                  <th className="px-3 py-2 font-semibold">State</th>
                  <th className="px-3 py-2 font-semibold">Resolved location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resolvedRows.slice(0, 100).map(({ row, loc }, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{row.address || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{row.city || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{row.state_code || '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      {loc.state ? (
                        <span className="text-foreground">
                          {loc.state.code || loc.state.name}
                          {loc.market && <span className="text-muted-foreground"> › {loc.market.market_name}</span>}
                          {loc.area && <span className="text-muted-foreground"> › {loc.area.area_name}</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          <AlertTriangle className="w-3 h-3" /> Unmatched
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resolvedRows.length > 100 && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">Showing first 100 of {resolvedRows.length}.</p>
          )}
        </div>
      )}

      {/* Import action */}
      <div className="flex items-center gap-3">
        <Button onClick={handleImport} disabled={resolvedRows.length === 0 || importing}>
          {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
          Import {resolvedRows.length || ''} venue{resolvedRows.length === 1 ? '' : 's'}
        </Button>
      </div>

      {result && (
        <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-green-700">
            Imported {result.created} venue{result.created === 1 ? '' : 's'}.
            {result.failed > 0 ? ` ${result.failed} failed.` : ''}
            {result.unmatched > 0 ? ` ${result.unmatched} imported without a matched location.` : ''}
          </span>
        </div>
      )}
    </div>
  );
}