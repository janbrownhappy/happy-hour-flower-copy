import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import downloadCsv from './downloadCsv';

export default function KpiLeaderboard({ rows = [] }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <p className="text-sm font-semibold">Ambassador leaderboard ({rows.length})</p>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!rows.length}
          onClick={() => downloadCsv('hhf-ambassadors.csv', ['Name', 'Referrals', 'Clicks', 'Earnings'], rows.map((r) => [r.name, r.referrals, r.clicks, r.earnings]))}>
          <Download className="w-3.5 h-3.5" />CSV
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="p-3">#</th><th className="p-3">Ambassador</th><th className="p-3 text-right">Referrals</th><th className="p-3 text-right">Clicks</th><th className="p-3 text-right">Earnings</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-3 text-muted-foreground">{i + 1}</td><td className="p-3 font-medium">{r.name}</td>
              <td className="p-3 text-right">{r.referrals}</td><td className="p-3 text-right">{r.clicks}</td><td className="p-3 text-right">${r.earnings}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No Partnero data collected yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}