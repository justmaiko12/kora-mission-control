"use client";

import { useEffect, useMemo, useState } from "react";
import { ViewType } from "@/app/page";

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

type AgentStatus = "active" | "idle" | "paused";

interface AgentSession {
  id: string;
  name: string;
  status: AgentStatus;
  currentTask: string;
  lastHeartbeat: string;
  progress: number;
  type: string;
}

interface RecentCompletion {
  id: string;
  title: string;
  agent: string;
  completedAt: string;
}

interface AgentStatusResponse {
  sessions: AgentSession[];
  activeCount: number;
  recentCompletions: RecentCompletion[];
  updatedAt?: string;
}

interface DashboardData {
  agents: AgentStatusResponse;
  loading: boolean;
  error: string | null;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData>({
    agents: {
      sessions: [],
      activeCount: 0,
      recentCompletions: [],
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const agentRes = await fetch("/api/agents/status");
        const agentData = await agentRes.json();

        setData({
          agents: agentData,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load dashboard data",
        }));
      }
    }

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const channels = [
    {
      id: "email" as ViewType,
      icon: "📧",
      title: "Email",
      color: "from-sky-500 to-cyan-500",
      items: ["Priority inbox", "Client follow-ups", "Outreach drafts"],
    },
    {
      id: "business" as ViewType,
      icon: "💼",
      title: "Deals",
      color: "from-green-500 to-emerald-500",
      items: ["Pipeline review", "New lead scoring", "Contract status"],
    },
    {
      id: "tasks" as ViewType,
      icon: "✅",
      title: "Tasks",
      color: "from-amber-500 to-orange-500",
      items: ["Agent follow-ups", "Today’s priorities", "Blocked items"],
    },
    {
      id: "chat" as ViewType,
      icon: "💬",
      title: "Chat",
      color: "from-indigo-500 to-violet-500",
      items: ["Brief Kora", "Brainstorm", "Ask about progress"],
    },
  ];

  const activeSessions = useMemo(
    () => data.agents.sessions.filter((session) => session.status === "active"),
    [data.agents.sessions]
  );

  const idleSessions = useMemo(
    () => data.agents.sessions.filter((session) => session.status !== "active"),
    [data.agents.sessions]
  );

  const radarPositions = [
    { top: "15%", left: "20%" },
    { top: "26%", left: "58%" },
    { top: "38%", left: "30%" },
    { top: "42%", left: "72%" },
    { top: "55%", left: "46%" },
    { top: "62%", left: "18%" },
    { top: "68%", left: "68%" },
    { top: "78%", left: "36%" },
    { top: "24%", left: "78%" },
    { top: "52%", left: "12%" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{getGreeting()}, Michael 👋</h1>
          <p className="text-zinc-500 text-sm md:text-base mt-1">
            {data.loading ? "Loading..." : "Here's what needs your attention"}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs md:text-sm text-zinc-500">Today</p>
          <p className="text-base md:text-lg font-semibold">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Error State */}
      {data.error && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-4 text-yellow-400 text-sm">
          {data.error} — showing cached data
        </div>
      )}

      {/* Agent Activity Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/80 via-zinc-950 to-zinc-900/70 p-4 md:p-6">
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.14),transparent_45%)]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg md:text-2xl font-semibold text-emerald-100">Agent Activity</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Live Mesh
              </span>
            </div>
            <p className="mt-2 text-sm md:text-base text-emerald-100/70">
              Monitoring sub-agents and active sessions across the Kora mesh. Live telemetry, handoffs, and completions.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <div className="relative aspect-square w-full max-w-[420px] rounded-full border border-emerald-400/30 bg-emerald-500/5 p-6">
                <div className="absolute inset-6 rounded-full border border-emerald-400/20" />
                <div className="absolute inset-12 rounded-full border border-emerald-400/10" />
                <div className="absolute inset-0 rounded-full border border-emerald-400/10" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12),transparent_60%)]" />
                <div className="absolute inset-0 rounded-full border border-emerald-400/30 shadow-[0_0_60px_rgba(16,185,129,0.15)]" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent animate-[spin_14s_linear_infinite]" />
                <div className="absolute left-1/2 top-0 h-full w-px bg-emerald-400/10" />
                <div className="absolute top-1/2 left-0 h-px w-full bg-emerald-400/10" />

                {data.loading && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-emerald-200/80">
                    Loading telemetry...
                  </div>
                )}

                {!data.loading &&
                  data.agents.sessions.map((session, index) => {
                    const position = radarPositions[index % radarPositions.length];
                    const isActive = session.status === "active";
                    return (
                      <div
                        key={session.id}
                        className="absolute"
                        style={{ top: position.top, left: position.left }}
                      >
                        <div className="relative flex items-center">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isActive ? "bg-emerald-300" : "bg-zinc-500"
                            }`}
                          />
                          {isActive && (
                            <span className="absolute -inset-2 animate-ping rounded-full bg-emerald-400/40" />
                          )}
                          <span className="absolute left-3 top-1 text-[10px] text-emerald-100/70">
                            {session.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">Active</p>
                  <p className="text-3xl font-semibold text-emerald-100">
                    {data.loading ? "—" : data.agents.activeCount}
                  </p>
                  <p className="text-xs text-emerald-100/70">
                    {data.loading ? "Telemetry syncing" : `${activeSessions.length} running sessions`}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">Idle</p>
                  <p className="text-2xl font-semibold text-emerald-100">
                    {data.loading ? "—" : idleSessions.length}
                  </p>
                  <p className="text-xs text-emerald-100/60">Ready for next task</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-[320px]">
            <div className="rounded-2xl border border-emerald-400/20 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-100">Sessions</h3>
              <div className="mt-3 space-y-2">
                {(data.loading ? Array.from({ length: 4 }) : data.agents.sessions)
                  .slice(0, 5)
                  .map((session, index) => {
                    if (data.loading) {
                      return (
                        <div key={`loading-${index}`} className="h-8 rounded-lg bg-emerald-500/10 animate-pulse" />
                      );
                    }
                    const statusColor =
                      session.status === "active" ? "bg-emerald-400" : "bg-zinc-500";
                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-lg border border-emerald-400/10 bg-emerald-500/5 px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="text-emerald-100">{session.name}</p>
                          <p className="text-emerald-100/60">{session.currentTask}</p>
                        </div>
                        <span className="flex items-center gap-2 text-emerald-200/70">
                          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                          {session.status}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-100">Recent Completions</h3>
              <div className="mt-3 space-y-2 text-xs">
                {(data.loading ? Array.from({ length: 3 }) : data.agents.recentCompletions)
                  .slice(0, 3)
                  .map((completion, index) => {
                    if (data.loading) {
                      return (
                        <div key={`completion-${index}`} className="h-8 rounded-lg bg-emerald-500/10 animate-pulse" />
                      );
                    }
                    return (
                      <div
                        key={completion.id}
                        className="flex flex-col gap-1 rounded-lg border border-emerald-400/10 bg-emerald-500/5 px-3 py-2"
                      >
                        <p className="text-emerald-100">{completion.title}</p>
                        <p className="text-emerald-100/60">
                          {completion.agent} • {completion.completedAt}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-100">Current Focus</h3>
              <div className="mt-3 space-y-2 text-xs">
                {(data.loading ? Array.from({ length: 3 }) : activeSessions)
                  .slice(0, 3)
                  .map((session, index) => {
                    if (data.loading) {
                      return (
                        <div key={`focus-${index}`} className="h-8 rounded-lg bg-emerald-500/10 animate-pulse" />
                      );
                    }
                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-lg border border-emerald-400/10 bg-emerald-500/5 px-3 py-2"
                      >
                        <p className="text-emerald-100">{session.currentTask}</p>
                        <span className="text-emerald-200/70">{session.progress}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Cards - Always side by side */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onNavigate(channel.id)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 md:p-5 text-left hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
          >
            <div className="flex flex-col items-center md:items-start md:flex-row md:justify-between mb-2 md:mb-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center text-lg md:text-2xl`}>
                {channel.icon}
              </div>
            </div>
            <h3 className="text-xs md:text-lg font-semibold text-center md:text-left mb-1 md:mb-2 group-hover:text-indigo-400 transition-colors">
              {channel.title}
            </h3>
            <ul className="hidden md:block space-y-1">
              {channel.items.slice(0, 2).map((item, i) => (
                <li key={i} className="text-sm text-zinc-500 truncate">
                  • {typeof item === "string" ? item : String(item || "")}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Status Footer */}
      <div className="text-center text-xs text-zinc-600 pt-2">
        Agent telemetry stream • Last updated: {data.agents.updatedAt ?? "just now"}
      </div>
    </div>
  );
}
