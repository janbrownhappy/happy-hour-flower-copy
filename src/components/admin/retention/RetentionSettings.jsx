import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { seedChurnRules } from '@/functions/seedChurnRules';
import { scoreRetention } from '@/functions/scoreRetention';
import { rollupConsumerEngagement } from '@/functions/rollupConsumerEngagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Play, Save, Download, Layers, Info } from 'lucide-react';
import { RISK_THRESHOLDS_INFO } from './thresholds';

export default function RetentionSettings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const loadRules = () => {
    setLoading(true);
    base44.entities.ChurnScoringRule.list('sort_order', 500)
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  };
  useEffect(loadRules, []);

  const updateRule = async (rule, patch) => {
    setSavingId(rule.id);
    try {
      await base44.entities.ChurnScoringRule.update(rule.id, patch);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ...patch } : r));
    } finally {
      setSavingId(null);
    }
  };

  const run = async (fn, label, key) => {
    setBusy(key); setMsg('');
    try {
      const res = await fn({});
      setMsg(`${label}: ${JSON.stringify(res.data)}`);
    } catch (e) {
      setMsg(`${label} failed.`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-heading font-bold">Retention Settings</h2>

      {/* Actions */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">Scoring Jobs</h3>
        <p className="text-xs text-muted-foreground">The nightly engine runs automatically in chunks. Use these to seed defaults or run a chunk manually.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => run(seedChurnRules, 'Seed rules', 'seed')} disabled={!!busy}>
            <Download className="w-3.5 h-3.5" />{busy === 'seed' ? 'Seeding…' : 'Seed Default Rules'}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => run(scoreRetention, 'Score chunk', 'score')} disabled={!!busy}>
            <Play className="w-3.5 h-3.5" />{busy === 'score' ? 'Scoring…' : 'Run Scoring Chunk'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => run(rollupConsumerEngagement, 'Rollup', 'rollup')} disabled={!!busy}>
            <Layers className="w-3.5 h-3.5" />{busy === 'rollup' ? 'Rolling…' : 'Run Weekly Rollup'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={loadRules} disabled={!!busy}>Reload Rules</Button>
        </div>
        {msg && <p className="text-xs bg-muted rounded-lg px-3 py-2 break-all">{msg}</p>}
      </div>

      {/* Thresholds reference */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Info className="w-4 h-4" />Risk Category Thresholds</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {RISK_THRESHOLDS_INFO.map(t => (
            <div key={t.category} className={`rounded-lg border p-2 text-center ${t.badge}`}>
              <p className="text-xs font-semibold">{t.label}</p>
              <p className="text-[11px] opacity-80">{t.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules editor */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Scoring Rules ({rules.length})</h3>
          <p className="text-xs text-muted-foreground">Adjust point values or disable rules. Changes apply on the next scoring run.</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No rules yet — click "Seed Default Rules".</p>
        ) : (
          <div className="divide-y divide-border/50">
            {rules.map(rule => (
              <div key={rule.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rule.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{rule.applies_to} · {rule.severity}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="w-16 h-8 text-center"
                      defaultValue={rule.points}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val !== rule.points) updateRule(rule, { points: val });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                  <Switch
                    checked={rule.is_active !== false}
                    onCheckedChange={(v) => updateRule(rule, { is_active: v })}
                    disabled={savingId === rule.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}