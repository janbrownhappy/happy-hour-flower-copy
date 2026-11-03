import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function VenueCategorySelect({ value, onChange, className }) {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    base44.entities.VenueType.list('sort_order', 200)
      .then(list => setTypes(list.filter(t => t.is_active !== false)))
      .catch(() => setTypes([]));
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}><SelectValue placeholder="Select a category…" /></SelectTrigger>
      <SelectContent>
        {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
        <SelectItem value="Other">Other</SelectItem>
      </SelectContent>
    </Select>
  );
}