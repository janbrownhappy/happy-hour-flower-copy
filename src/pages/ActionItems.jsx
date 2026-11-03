import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ListChecks } from "lucide-react";
import ActionItemForm from "@/components/actionitems/ActionItemForm";
import ActionItemRow from "@/components/actionitems/ActionItemRow";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function ActionItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    const data = await base44.entities.ActionItem.list("-created_date", 500);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAdd = async (data) => {
    const created = await base44.entities.ActionItem.create(data);
    setItems((prev) => [created, ...prev]);
  };

  const handleToggle = async (item) => {
    const nextStatus = item.status === "done" ? "todo" : "done";
    const updated = await base44.entities.ActionItem.update(item.id, { status: nextStatus });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  };

  const handleDelete = async (item) => {
    await base44.entities.ActionItem.delete(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const open = items
    .filter((i) => i.status !== "done")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  const done = items.filter((i) => i.status === "done");

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-2">
        <ListChecks className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold">Action Items</h1>
        {!loading && (
          <span className="text-sm font-normal text-muted-foreground">({open.length} open)</span>
        )}
      </div>

      <ActionItemForm onAdd={handleAdd} />

      {loading ? (
        <div className="space-y-2">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              To Do ({open.length})
            </h2>
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing open — add your first item above.</p>
            ) : (
              open.map((item) => (
                <ActionItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
              ))
            )}
          </section>

          {done.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Done ({done.length})
              </h2>
              {done.map((item) => (
                <ActionItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}