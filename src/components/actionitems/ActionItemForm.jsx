import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function ActionItemForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({
      title: title.trim(),
      notes: notes.trim(),
      priority,
      due_date: dueDate || undefined,
      status: "todo",
    });
    setTitle("");
    setNotes("");
    setPriority("medium");
    setDueDate("");
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card border border-border rounded-2xl space-y-3">
      <Input
        placeholder="What needs to get done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low priority</SelectItem>
            <SelectItem value="medium">Medium priority</SelectItem>
            <SelectItem value="high">High priority</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="sm:w-44"
        />
        <Button type="submit" disabled={saving || !title.trim()} className="sm:ml-auto gap-1.5">
          <Plus className="w-4 h-4" /> {saving ? "Adding..." : "Add item"}
        </Button>
      </div>
    </form>
  );
}