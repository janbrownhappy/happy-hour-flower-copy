import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import FieldTestStart from './FieldTestStart';
import FieldTestLive from './FieldTestLive';
import FieldTestHistory from './FieldTestHistory';
import FieldTestReport from './FieldTestReport';

// Phase 5 — admin-only Location Field Test (measurement only; never changes settings).
export default function FieldTestPanel() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [open, setOpen] = useState(null);
  const load = () => base44.entities.FieldTestSession.list('-started_at', 500).then(setSessions);
  useEffect(() => { load(); }, []);
  const active = sessions?.find((s) => s.status === 'active' && s.user_id === user?.id);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <p className="font-semibold">Location Field Test (Phase 5)</p>
        <p className="text-xs text-muted-foreground">Captures every Despia GPS update from this admin account while a session is active. Arrival push delivery stays DISABLED — PHASE 5. No settings are changed automatically.</p>
      </div>
      {sessions && (active
        ? <FieldTestLive session={active} onStopped={(s) => { load(); setOpen(s); }} />
        : <FieldTestStart onStarted={load} />)}
      <div><p className="text-sm font-semibold mb-2">Field Test History</p><FieldTestHistory sessions={sessions} onOpen={setOpen} /></div>
      <FieldTestReport session={open} onClose={() => setOpen(null)} />
    </div>
  );
}