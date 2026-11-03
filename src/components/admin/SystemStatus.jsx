import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

// Live health check of core platform services. Each check runs a lightweight probe
// and resolves to 'operational' | 'degraded' | 'down'.
const STATUS_CONFIG = {
  operational: { label: 'Operational', color: 'text-green-600', icon: CheckCircle2 },
  degraded: { label: 'Degraded', color: 'text-amber-500', icon: AlertTriangle },
  down: { label: 'Down', color: 'text-rose-600', icon: XCircle },
  checking: { label: 'Checking…', color: 'text-muted-foreground', icon: Loader2 },
};

async function timed(fn, degradedMs = 2500) {
  const start = performance.now();
  await fn();
  const elapsed = performance.now() - start;
  return elapsed > degradedMs ? 'degraded' : 'operational';
}

export default function SystemStatus() {
  const [services, setServices] = useState([
    { key: 'database', label: 'Database', status: 'checking' },
    { key: 'auth', label: 'Auth Service', status: 'checking' },
    { key: 'payments', label: 'Payments (Stripe)', status: 'checking' },
    { key: 'notifications', label: 'Push Notifications', status: 'checking' },
    { key: 'resend', label: 'Email (Resend)', status: 'checking' },
    { key: 'ghl', label: 'SMS & CRM (GoHighLevel)', status: 'checking' },
    { key: 'revenuecat', label: 'In-App Purchases (RevenueCat)', status: 'checking' },
    { key: 'walletwallet', label: 'Wallet Passes (WalletWallet)', status: 'checking' },
  ]);

  const setStatus = (key, status) =>
    setServices(prev => prev.map(s => (s.key === key ? { ...s, status } : s)));

  useEffect(() => {
    // Database — quick entity read
    timed(() => base44.entities.AppSetting.list('-created_date', 1))
      .then(s => setStatus('database', s))
      .catch(() => setStatus('database', 'down'));

    // Auth — current user lookup
    timed(() => base44.auth.me())
      .then(s => setStatus('auth', s))
      .catch(() => setStatus('auth', 'down'));

    // Payments — Stripe MRR endpoint responding
    base44.functions.invoke('getStripeMRR', {})
      .then(res => setStatus('payments', res?.data?.error ? 'degraded' : 'operational'))
      // A permission error means the check couldn't run, not that Stripe is down.
      .catch((e) => setStatus('payments', e?.response?.status === 403 ? 'degraded' : 'down'));

    // Push Notifications — verify OneSignal config present via a lightweight probe
    base44.functions.invoke('sendOneSignalNotification', { probe: true })
      .then((res) => setStatus('notifications', res?.data?.ok ? 'operational' : 'degraded'))
      .catch(() => setStatus('notifications', 'degraded'));

    // Outside services — one call checks that each accepts our keys
    const extKeys = ['resend', 'ghl', 'revenuecat', 'walletwallet'];
    base44.functions.invoke('checkServiceHealth', {})
      .then((res) => extKeys.forEach((k) => setStatus(k, res?.data?.[k]?.ok ? 'operational' : 'down')))
      .catch(() => extKeys.forEach((k) => setStatus(k, 'degraded')));
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">System Status</h3>
      </div>
      <div className="space-y-2.5">
        {services.map(svc => {
          const cfg = STATUS_CONFIG[svc.status] || STATUS_CONFIG.checking;
          const Icon = cfg.icon;
          return (
            <div key={svc.key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{svc.label}</span>
              <span className={`flex items-center gap-1.5 font-medium ${cfg.color}`}>
                <Icon className={`w-3.5 h-3.5 ${svc.status === 'checking' ? 'animate-spin' : ''}`} />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}