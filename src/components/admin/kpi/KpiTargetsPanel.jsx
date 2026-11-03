import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPIS, kpiByKey, formatKpi } from '@/lib/kpiDefinitions';

// Effective-dated targets for the currently selected scope (company, state or market).
export default function KpiTargetsPanel({ scope, targets }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ metric_key: '', target_value: '', effective_from: new Date().toISOString().slice(0, 10), effective_to: '' });
  const canTarget = scope.level !== 'area';
  const scoped = targets.filter((t) => (scope.level === 'all' ? (t.scope_level || 'all') === 'all' : t.scope_id === scope.id));
  const refresh = () => qc.invalidateQueries({ queryKey: ['kpi'] });
  const save = async () => {
    await base44.entities.KpiTarget.create({ ...form, target_value: Number(form.target_value), effective_to: form.effective_to || undefined,
      scope_level: scope.level, scope_id: scope.id });
    setForm((f) => ({ ...f, metric_key: '', target_value: '' }));
    refresh();
  };
  const remove = async (id) => { await base44.entities.KpiTarget.delete(id); refresh(); };
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <p className="text-sm font-semibold">Targets for this {scope.level === 'all' ? 'company' : scope.level}</p>
      {!canTarget ? <p className="text-sm text-muted-foreground">Targets can be set at company, state or market level.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Select value={form.metric_key} onValueChange={(v) => setForm({ ...form, metric_key: v })}>
            <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Metric" /></SelectTrigger>
            <SelectContent>{KPIS.filter((k) => !k.missing && (scope.level === 'all' || k.geo)).map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="Target" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
          <Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
          <Button onClick={save} disabled={!form.metric_key || form.target_value === ''}>Add target</Button>
        </div>
      )}
      <div className="divide-y divide-border">
        {scoped.map((t) => (
          <div key={t.id} className="py-2 flex items-center justify-between text-sm">
            <span>{kpiByKey[t.metric_key]?.label || t.metric_key}: <b>{formatKpi(t.target_value, kpiByKey[t.metric_key]?.fmt)}</b>
              <span className="text-muted-foreground"> · from {t.effective_from}{t.effective_to ? ` to ${t.effective_to}` : ''}</span></span>
            <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        {!scoped.length && <p className="text-sm text-muted-foreground py-2">No targets set.</p>}
      </div>
    </div>
  );
}