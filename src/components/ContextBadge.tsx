"use client";

import { FocusedItem } from "@/lib/types";

interface ContextBadgeProps {
  item: FocusedItem;
  onClear: () => void;
  compact?: boolean;
}

const typeEmoji: Record<FocusedItem["type"], string> = {
  email: "📧",
  task: "✅",
  notification: "🔔",
};

// Ensure value is always a string
const safeString = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

export default function ContextBadge({ item, onClear, compact }: ContextBadgeProps) {
  const title = safeString(item?.title) || "(no subject)";
  const emoji = item?.type ? typeEmoji[item.type] || "📌" : "📌";
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200">
        <span>{emoji}</span>
        <span className="truncate max-w-[200px]">{title}</span>
        <button
          onClick={onClear}
          className="text-indigo-300/60 hover:text-indigo-200 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">
      <span className="text-xs uppercase tracking-wide text-indigo-300/80">
        {emoji} Discussing
      </span>
      <span className="flex-1 truncate">{title}</span>
      <button
        onClick={onClear}
        className="rounded-lg border border-indigo-500/30 px-2 py-0.5 text-xs text-indigo-200 hover:bg-indigo-500/20 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
