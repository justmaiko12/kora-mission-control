"use client";

import { FocusedItem } from "@/lib/types";

interface ContextBadgeProps {
  item: FocusedItem;
  onClear: () => void;
}

const typeLabel: Record<FocusedItem["type"], string> = {
  email: "Email",
  task: "Task",
  notification: "Notification",
};

export default function ContextBadge({ item, onClear }: ContextBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">
      <span className="text-xs uppercase tracking-wide text-indigo-300/80">
        Discussing {typeLabel[item.type]}
      </span>
      <span className="flex-1 truncate">{item.title}</span>
      <button
        onClick={onClear}
        className="rounded-lg border border-indigo-500/30 px-2 py-0.5 text-xs text-indigo-200 hover:bg-indigo-500/20 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
