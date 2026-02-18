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

  const formatSchedule = (schedule: CronJob["schedule"]): string => {
    if (schedule.kind === "cron" && schedule.expr) {
      return `Cron: ${schedule.expr}`;
    }
    if (schedule.kind === "every" && schedule.everyMs) {
      const seconds = schedule.everyMs / 1000;
      if (seconds < 60) return `Every ${seconds}s`;
      const minutes = seconds / 60;
      if (minutes < 60) return `Every ${Math.round(minutes)}m`;
      const hours = minutes / 60;
      return `Every ${Math.round(hours)}h`;
    }
    if (schedule.kind === "at" && schedule.at) {
      return `At: ${new Date(schedule.at).toLocaleString()}`;
    }
    return "Unknown";
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
              Cron jobs and scheduled tasks running in OpenClaw
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
                            {job.name || job.payload.text?.slice(0, 50) || "Unnamed"}
                          </h3>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">
                          {formatSchedule(job.schedule)}
                        </p>
                        {job.payload.text && (
                          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                            {job.payload.text}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-zinc-500 flex-shrink-0">
                        <div>Next: {formatRelativeTime(job.nextRun)}</div>
                        {job.lastRun && (
                          <div className="mt-1">Last: {formatRelativeTime(job.lastRun)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        job.sessionTarget === "main" 
                          ? "bg-indigo-900/50 text-indigo-300" 
                          : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {job.sessionTarget}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full">
                        {job.payload.kind}
                      </span>
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
                Disabled ({disabledJobs.length})
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
                          {job.name || job.payload.text?.slice(0, 40) || "Unnamed"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {formatSchedule(job.schedule)}
                      </span>
                    </div>
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
