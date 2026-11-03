import { useState, useEffect } from 'react';
import { Phone, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ProfilePhoneField({ value, onSave }) {
  const [phone, setPhone] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setPhone(value || ''); }, [value]);

  const valid = /^[0-9+()\-. ]{7,20}$/.test(phone.trim());
  const changed = phone.trim() !== (value || '');

  const save = async () => {
    setSaving(true);
    await onSave(phone.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="font-semibold text-sm flex items-center gap-2 mb-1">
        <Phone className="w-4 h-4 text-primary" /> Mobile Phone
      </p>
      <p className="text-xs text-muted-foreground mb-3">Used for text alerts about deals and if we need to reach you.</p>
      <div className="flex gap-2">
        <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="(864) 555-0123"
          value={phone} onChange={e => setPhone(e.target.value)} className="h-11" />
        <Button onClick={save} disabled={saving || !changed || !valid} className="h-11">
          {saved ? <Check className="w-4 h-4" /> : saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}