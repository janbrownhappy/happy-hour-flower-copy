import React, { useEffect, useState } from 'react';
import { SECTIONS } from '@/lib/consumerTestPlan';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const KEY = 'hhf_consumer_test_results';
const OPTIONS = [
  ['pass', 'Pass', 'bg-green-600 text-white'],
  ['fail', 'Fail', 'bg-red-600 text-white'],
  ['blocked', 'Blocked', 'bg-amber-500 text-white'],
];

export default function TestPlanChecklist({ sections = SECTIONS, storageKey = KEY }) {
  const [results, setResults] = useState(() => JSON.parse(localStorage.getItem(storageKey) || '{}'));
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(results)); }, [results, storageKey]);
  const set = (id, patch) => setResults((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const done = sections.filter((s) => results[s.id]?.status).length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl">Checklist</h2>
        <span className="text-sm text-muted-foreground">{done} of {sections.length} marked</span>
      </div>
      {sections.map((s) => {
        const r = results[s.id] || {};
        return (
          <div key={s.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{s.title}</p>
              <div className="flex gap-2">
                {OPTIONS.map(([v, label, active]) => (
                  <button key={v} onClick={() => set(s.id, { status: r.status === v ? '' : v })}
                    className={`select-none px-3 rounded-md text-sm border border-border transition-colors ${r.status === v ? active : 'bg-background'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="Notes (optional)" value={r.notes || ''} onChange={(e) => set(s.id, { notes: e.target.value })} />
          </div>
        );
      })}
      <div className="flex gap-3 print:hidden">
        <Button onClick={() => window.print()}>Print / save PDF</Button>
        <Button variant="outline" onClick={() => setResults({})}>Clear results</Button>
      </div>
    </section>
  );
}