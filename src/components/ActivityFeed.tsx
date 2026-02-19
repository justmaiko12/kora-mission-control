"use client";

import { useState, useEffect } from "react";

interface ActivityItem {
  id: string;
  type: "email" | "deal" | "automation" | "system" | "command";
  action: string;
  details?: string;
  timestamp: string;
  icon?: string;
}

interface ActivityFeedProps {
  context?: string; // "email" | "deals" | "general"
  onCommand?: (command: string) => void;
  emailAccount?: string; // Current email account when in email context
  visibleEmails?: Array<{ from: string; subject: string; id: string }>; // Current emails for context
}

export default function ActivityFeed({ context = "general", onCommand, emailAccount, visibleEmails }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [commandResult, setCommandResult] = useState<string | null>(null);

  // Fetch recent activity
  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/activity");
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error("Failed to fetch activity:", err);
      }
    }
    fetchActivity();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setCommandResult(null);

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command: command.trim(), 
          context,
          emailAccount: context === "email" ? emailAccount : undefined,
          visibleEmails: context === "email" ? visibleEmails?.slice(0, 20) : undefined, // Send top 20 for context
        }),
      });
      
      const data = await res.json();
      setCommandResult(data.result || data.message || "Done!");
      
      if (onCommand) {
        onCommand(command.trim());
      }
      
      setCommand("");
      
      // Add to activity feed locally
      setActivities(prev => [{
        id: `cmd-${Date.now()}`,
        type: "command",
        action: command.trim(),
        details: data.result || "Executed",
        timestamp: new Date().toISOString(),
        icon: "⚡",
      }, ...prev]);
      
    } catch (err) {
      setCommandResult("Command failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (item: ActivityItem) => {
    if (item.icon) return item.icon;
    switch (item.type) {
      case "email": return "📧";
      case "deal": return "💰";
      case "automation": return "🤖";
      case "command": return "⚡";
      default: return "📌";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full max-h-full bg-zinc-950 border-t border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-sm">Activity</h3>
        </div>
        <span className="text-xs text-zinc-500">
          {context !== "general" ? `${context} context` : "all activity"}
        </span>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {activities.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-8">
            No recent activity
          </div>
        ) : (
          activities.slice(0, 20).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900/50 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{getIcon(item)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{item.action}</p>
                {item.details && (
                  <p className="text-xs text-zinc-500 truncate">{item.details}</p>
                )}
              </div>
              <span className="text-xs text-zinc-600 flex-shrink-0">
                {formatTime(item.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Command Result */}
      {commandResult && (
        <div className="mx-4 mb-2 px-3 py-2 bg-emerald-900/30 border border-emerald-700/50 rounded-lg text-sm text-emerald-300 relative">
          <button
            onClick={() => setCommandResult(null)}
            className="absolute top-1 right-1 p-1 hover:bg-emerald-800/50 rounded text-emerald-400 hover:text-emerald-200"
            title="Dismiss"
          >
            ✕
          </button>
          <div className="max-h-24 overflow-y-auto pr-6">
            {commandResult.length > 300 ? `${commandResult.slice(0, 300)}...` : commandResult}
          </div>
        </div>
      )}

      {/* Command Bar */}
      <form onSubmit={handleCommand} className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={
              context === "email" 
                ? "Tell me what to do with these emails..." 
                : "What do you need?"
            }
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !command.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "..." : "Run"}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2 px-1">
          {context === "email" 
            ? `Try: "these look like spam" • "archive the amazon deliveries" • "what looks important?"`
            : `Try: "what's on my plate?" • "remind me about Nike deal tomorrow"`
          }
        </p>
      </form>
    </div>
  );
}
