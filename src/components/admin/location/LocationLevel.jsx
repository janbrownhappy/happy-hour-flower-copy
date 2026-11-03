import { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// A single editable column in the cascading hierarchy (State / Region / City / Neighborhood)
export default function LocationLevel({
  title,
  items,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  countLabel,
  disabled,
  emptyHint,
  hasCode,
  suggestions = [],
  readOnly = false,
}) {
  const listId = `loc-suggestions-${title.toLowerCase()}`;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const submitNew = async () => {
    if (!newName.trim()) return;
    await onCreate({ name: newName.trim(), code: newCode.trim() || undefined });
    setNewName('');
    setNewCode('');
    setAdding(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name || '');
    setEditCode(item.code || '');
  };

  const submitEdit = async (item) => {
    if (!editName.trim()) return;
    await onUpdate(item.id, { name: editName.trim(), code: editCode.trim() || undefined });
    setEditingId(null);
  };

  return (
    <div className="flex-1 min-w-[200px] flex flex-col bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{items.length} {countLabel}</p>
        </div>
        {!disabled && !readOnly && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAdding(a => !a)}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[55vh]">
        {disabled ? (
          <p className="text-xs text-muted-foreground text-center py-6">{emptyHint}</p>
        ) : (
          <>
            {adding && (
              <div className="border border-primary/40 rounded-lg p-2 space-y-1.5 bg-primary/5">
                <Input
                  autoFocus
                  list={suggestions.length ? listId : undefined}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={`${title} name`}
                  className="h-8 text-sm"
                  onKeyDown={e => e.key === 'Enter' && submitNew()}
                />
                {suggestions.length > 0 && (
                  <datalist id={listId}>
                    {suggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
                )}
                {hasCode && (
                  <Input
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    placeholder="Code (optional)"
                    className="h-8 text-sm"
                    onKeyDown={e => e.key === 'Enter' && submitNew()}
                  />
                )}
                <div className="flex gap-1">
                  <Button size="sm" className="h-7 flex-1 text-xs" onClick={submitNew}>
                    <Check className="w-3.5 h-3.5" /> Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewName(''); setNewCode(''); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {items.length === 0 && !adding && (
              <p className="text-xs text-muted-foreground text-center py-6">No items yet</p>
            )}

            {items.map(item => (
              editingId === item.id ? (
                <div key={item.id} className="border border-primary/40 rounded-lg p-2 space-y-1.5 bg-primary/5">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && submitEdit(item)} />
                  {hasCode && (
                    <Input value={editCode} onChange={e => setEditCode(e.target.value)} placeholder="Code" className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && submitEdit(item)} />
                  )}
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 flex-1 text-xs" onClick={() => submitEdit(item)}>
                      <Check className="w-3.5 h-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className={`group flex items-center gap-1.5 rounded-lg transition-colors ${selectedId === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className="flex-1 min-w-0 text-left px-2.5 py-2"
                  >
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.code && <p className={`text-xs truncate ${selectedId === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{item.code}</p>}
                  </button>
                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); startEdit(item); }}
                        className={`md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded transition-opacity ${selectedId === item.id ? 'hover:bg-white/20' : 'hover:bg-background'}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                        className={`md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded mr-1 transition-opacity ${selectedId === item.id ? 'hover:bg-white/20' : 'hover:bg-background text-rose-500'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )
            ))}
          </>
        )}
      </div>
    </div>
  );
}