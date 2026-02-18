"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Simple chat component for automations
function AutomationsChat({ onRefresh }: { onRefresh: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/openclaw/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[Automations Context] ${userMessage}`,
          context: "automations",
        }),
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || data.error || "No response" 
      }]);
      
      // Refresh automations list after Kora responds (might have created/modified something)
      setTimeout(onRefresh, 1000);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${err instanceof Error ? err.message : "Failed to send"}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
      {/* Messages area */}
      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm ${
                msg.role === "user"
                  ? "text-zinc-300 text-right"
                  : "text-zinc-400"
              }`}
            >
              {msg.role === "assistant" && <span className="text-indigo-400">Kora: </span>}
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Input area */}
      <div className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Create, edit, or manage automations... (e.g., 'create a daily reminder at 9am')"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Try: &quot;Create a reminder every day at 9am&quot; or &quot;Disable the session sync job&quot;
        </p>
      </div>
    </div>
  );
}

interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind: "at" | "every" | "cron";
    expr?: string;
    everyMs?: number;
    at?: string;
  };
  payload: {
    kind: "systemEvent" | "agentTurn";
    text?: string;
    message?: string;
  };
  sessionTarget: "main" | "isolated";
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface CronJobsResponse {
  jobs: CronJob[];
  status?: string;
}

export default function AutomationsView() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automations");
      if (!res.ok) throw new Error("Failed to fetch automations");
      const data: CronJobsResponse = await res.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Convert cron expression to human-readable schedule
  const formatSchedule = (schedule: CronJob["schedule"]): string => {
    if (schedule.kind === "cron" && schedule.expr) {
      // Parse common cron patterns
      const parts = schedule.expr.split(" ");
      if (parts.length >= 5) {
        const [min, hour, dom, mon, dow] = parts;
        
        // Daily at specific time
        if (dom === "*" && mon === "*" && dow === "*") {
          const h = parseInt(hour);
          const m = parseInt(min);
          const period = h >= 12 ? "PM" : "AM";
          const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          const minStr = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
          return `Every day at ${hour12}${minStr} ${period}`;
        }
        
        // Weekly
        if (dom === "*" && mon === "*" && dow !== "*") {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const dayName = days[parseInt(dow)] || dow;
          const h = parseInt(hour);
          const period = h >= 12 ? "PM" : "AM";
          const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return `Every ${dayName} at ${hour12} ${period}`;
        }
      }
      return schedule.expr; // Fallback to raw expression
    }
    if (schedule.kind === "every" && schedule.everyMs) {
      const seconds = schedule.everyMs / 1000;
      if (seconds < 60) return `Every ${seconds} seconds`;
      const minutes = seconds / 60;
      if (minutes < 60) return `Every ${Math.round(minutes)} minute${minutes !== 1 ? "s" : ""}`;
      const hours = minutes / 60;
      return `Every ${Math.round(hours)} hour${hours !== 1 ? "s" : ""}`;
    }
    if (schedule.kind === "at" && schedule.at) {
      return `One-time: ${new Date(schedule.at).toLocaleString()}`;
    }
    return "Unknown schedule";
  };

  // Get a human-readable description of what the automation does
  const getAutomationDescription = (job: CronJob): string => {
    const name = job.name?.toLowerCase() || "";
    const message = job.payload.message?.toLowerCase() || job.payload.text?.toLowerCase() || "";
    
    if (name.includes("morning briefing") || message.includes("briefing")) {
      return "Sends you a morning summary with tasks, emails, calendar, and news";
    }
    if (name.includes("editor task") || message.includes("editor")) {
      return "Pings editors on Discord about upcoming task deadlines";
    }
    if (name.includes("session") && name.includes("sync")) {
      return "Keeps Mission Control in sync with Kora's activity";
    }
    if (name.includes("chat processor")) {
      return "Processes chat messages from Mission Control";
    }
    if (message.includes("reminder")) {
      return "Sends you a reminder notification";
    }
    
    // Fallback: show truncated message
    const text = job.payload.message || job.payload.text || "";
    if (text.length > 100) return text.slice(0, 100) + "...";
    return text || "No description";
  };

  const formatRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (Math.abs(diffMins) < 1) return "just now";
    if (diffMins > 0) {
      if (diffMins < 60) return `in ${diffMins}m`;
      if (diffMins < 1440) return `in ${Math.round(diffMins / 60)}h`;
      return `in ${Math.round(diffMins / 1440)}d`;
    } else {
      const ago = Math.abs(diffMins);
      if (ago < 60) return `${ago}m ago`;
      if (ago < 1440) return `${Math.round(ago / 60)}h ago`;
      return `${Math.round(ago / 1440)}d ago`;
    }
  };

  const enabledJobs = jobs.filter(j => j.enabled);
  const disabledJobs = jobs.filter(j => !j.enabled);

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">⚡ Automations</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Scheduled tasks that run automatically
            </p>
          </div>
          <button
            onClick={fetchJobs}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            🔄 {enabledJobs.length} active
          </button>
        </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-500 animate-pulse">Loading automations...</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <span className="text-4xl mb-4">⚡</span>
          <p>No automations configured</p>
          <p className="text-sm text-zinc-600 mt-1">
            Automations are managed via OpenClaw cron
          </p>
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-4">
          {/* Active Automations */}
          {enabledJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Active ({enabledJobs.length})
              </h2>
              <div className="space-y-3">
                {enabledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h3 className="font-semibold truncate">
                            {job.name || "Unnamed Automation"}
                          </h3>
                        </div>
                        <p className="text-sm text-indigo-400 mt-1">
                          🕐 {formatSchedule(job.schedule)}
                        </p>
                        <p className="text-sm text-zinc-400 mt-2">
                          {getAutomationDescription(job)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-zinc-500 flex-shrink-0">
                        {job.nextRun && (
                          <div className="text-emerald-400">Next: {formatRelativeTime(job.nextRun)}</div>
                        )}
                        {job.lastRun && (
                          <div className="mt-1">Last ran: {formatRelativeTime(job.lastRun)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disabled Automations */}
          {disabledJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Paused ({disabledJobs.length})
              </h2>
              <div className="space-y-2">
                {disabledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                        <span className="text-sm text-zinc-400 truncate">
                          {job.name || "Unnamed"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        Was: {formatSchedule(job.schedule)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 ml-4">
                      {getAutomationDescription(job)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Chat for managing automations */}
      <AutomationsChat onRefresh={fetchJobs} />
    </div>
  );
}
