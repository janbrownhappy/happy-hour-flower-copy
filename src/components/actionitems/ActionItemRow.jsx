import React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ActionItemRow({ item, onToggle, onDelete }) {
  const isDone = item.status === "done";
  return (
    <div className="flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl">
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onToggle(item)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.title}
        </p>
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{item.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium}`}>
            {item.priority}
          </Badge>
          {item.due_date && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3" /> {format(new Date(item.due_date), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}