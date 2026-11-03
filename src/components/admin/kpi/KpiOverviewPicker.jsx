import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { KPIS } from '@/lib/kpiDefinitions';

export default function KpiOverviewPicker({ selected, onChange }) {
  const toggle = (key) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  return (
    <Popover>
      <PopoverTrigger asChild><Button size="sm" variant="outline" className="gap-1.5"><Settings2 className="w-3.5 h-3.5" />Cards</Button></PopoverTrigger>
      <PopoverContent className="w-72 max-h-96 overflow-y-auto">
        {KPIS.map((k) => (
          <label key={k.key} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
            <Checkbox checked={selected.includes(k.key)} onCheckedChange={() => toggle(k.key)} />{k.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}