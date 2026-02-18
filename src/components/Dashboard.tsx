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

interface DailyCost {
  date: string;
  cost: number;
  tokens: number;
}

interface UsageBreakdown {
  name: string;
  cost: number;
  tokens: number;
  percentage: number;
}

interface UsageResponse {
  totalCost: number;
  totalTokens: number;
  conversations: number;
  activity: number;
  dailyCosts: DailyCost[];
  byAgent: UsageBreakdown[];
  byModel: UsageBreakdown[];
}

interface DashboardData {
  agents: AgentStatusResponse;
  usage: UsageResponse;
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
    usage: {
      totalCost: 0,
      totalTokens: 0,
      conversations: 0,
      activity: 0,
      dailyCosts: [],
      byAgent: [],
      byModel: [],
    },
    loading: true,
    error: null,
  });

  const [timeFilter, setTimeFilter] = useState("This Week");
  const [metricFilter, setMetricFilter] = useState<
    "Cost" | "Tokens" | "Conversations" | "Activity"
  >("Cost");

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [agentRes, usageRes] = await Promise.all([
          fetch("/api/agents/status"),
          fetch("/api/usage"),
        ]);
        const agentData = await agentRes.json();
        const usageData = await usageRes.json();

        setData({
          agents: agentData,
          usage: usageData,
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US").format(value);

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
  const isAwake = activeSessions.length > 0;

  const chartData = useMemo(() => {
    return data.usage.dailyCosts.map((entry) => {
      let value = entry.cost;
      if (metricFilter === "Tokens") value = entry.tokens;
      if (metricFilter === "Conversations") value = Math.max(1, Math.round(entry.tokens / 900));
      if (metricFilter === "Activity") value = Math.max(1, Math.round(entry.tokens / 140));
      return {
        dateLabel: new Date(entry.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value,
      };
    });
  }, [data.usage.dailyCosts, metricFilter]);

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map((entry) => entry.value));
  }, [chartData]);

  const helperPositions = [
    { top: "62%", left: "18%" },
    { top: "64%", left: "74%" },
    { top: "46%", left: "16%" },
    { top: "44%", left: "78%" },
  ];

  const timeFilters = ["Today", "This Week", "This Month", "This Year"];
  const metricTabs: Array<"Cost" | "Tokens" | "Conversations" | "Activity"> = [
    "Cost",
    "Tokens",
    "Conversations",
    "Activity",
  ];

  return (
    <>
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
              <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-none border-2 border-emerald-300/40 bg-[#0b1b1a] p-4 shadow-[0_0_0_2px_rgba(6,24,23,0.95),0_0_0_4px_rgba(16,185,129,0.25)]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,185,129,0.06)_1px,transparent_1px),linear-gradient(rgba(16,185,129,0.06)_1px,transparent_1px)] bg-[size:12px_12px] opacity-70" />
                <div className="absolute inset-x-4 top-4 h-2 border-2 border-emerald-300/50 bg-emerald-900/60" />

                <div className="absolute right-6 top-8 h-14 w-14 border-2 border-cyan-300/70 bg-cyan-500/20 shadow-[0_0_0_2px_rgba(8,38,40,0.9)]">
                  <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-cyan-300/60" />
                  <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-cyan-300/60" />
                  <div className="absolute inset-1 bg-gradient-to-b from-cyan-300/30 to-transparent" />
                </div>

                <div className="absolute left-6 bottom-14 h-8 w-24 border-2 border-amber-300/60 bg-amber-700/60 shadow-[0_0_0_2px_rgba(34,22,8,0.9)]" />
                <div className="absolute left-8 bottom-[88px] h-6 w-6 border-2 border-emerald-300/50 bg-emerald-700/60 shadow-[0_0_0_2px_rgba(8,24,16,0.9)]" />
                <div className="absolute left-9 bottom-[72px] h-4 w-4 bg-emerald-300/70" />

                <div className="absolute inset-x-0 bottom-0 h-20 border-t-2 border-emerald-300/30 bg-gradient-to-t from-emerald-950/80 via-emerald-900/40 to-transparent" />
                <div className="absolute left-1/2 top-[44%] flex -translate-x-1/2 flex-col items-center">
                  <div
                    className={`relative h-14 w-14 border-2 border-emerald-200/80 bg-emerald-300/80 shadow-[0_0_0_2px_rgba(6,24,23,0.95)] ${
                      isAwake ? "animate-[kora-bob_1.2s_steps(2,end)_infinite]" : "animate-[kora-snooze_1.8s_steps(2,end)_infinite]"
                    }`}
                  >
                    <div className="absolute left-3 top-4 h-2 w-2 bg-emerald-950" />
                    <div className="absolute right-3 top-4 h-2 w-2 bg-emerald-950" />
                    <div className="absolute left-1/2 bottom-3 h-1 w-6 -translate-x-1/2 bg-emerald-900/70" />
                  </div>
                  <div className="mt-2 rounded-sm border-2 border-emerald-300/60 bg-emerald-950/80 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-200">
                    Kora
                  </div>
                </div>

                {data.loading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.2em] text-emerald-200/80">
                    Loading...
                  </div>
                ) : (
                  <div className="absolute left-1/2 top-[26%] -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-200/80">
                    {activeSessions.length > 0 ? "Awake" : "Sleeping"}
                  </div>
                )}

                {!data.loading &&
                  activeSessions.slice(0, 4).map((session, index) => {
                    const position = helperPositions[index % helperPositions.length];
                    return (
                      <div
                        key={session.id}
                        className="absolute"
                        style={{ top: position.top, left: position.left }}
                      >
                        <div className="flex flex-col items-center">
                          <div className="h-5 w-5 border-2 border-cyan-200/70 bg-cyan-300/70 shadow-[0_0_0_2px_rgba(8,26,30,0.9)] animate-[helper-hop_1.4s_steps(2,end)_infinite]" />
                          <span className="mt-1 text-[9px] font-mono text-cyan-100/70">
                            {session.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {!data.loading && !isAwake && (
                  <div className="absolute left-[58%] top-[34%] text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-200/70 animate-[zzz-float_1.6s_steps(2,end)_infinite]">
                    zzz
                  </div>
                )}
              </div>

              <div className="space-y-3 font-mono">
                <div className="rounded-none border-2 border-emerald-400/30 bg-emerald-950/70 p-3 shadow-[0_0_0_2px_rgba(6,24,23,0.95)]">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">Active</p>
                  <p className="text-3xl font-semibold text-emerald-100">
                    {data.loading ? "—" : data.agents.activeCount}
                  </p>
                  <p className="text-xs text-emerald-100/70">
                    {data.loading ? "Telemetry syncing" : `${activeSessions.length} running sessions`}
                  </p>
                </div>
                <div className="rounded-none border-2 border-emerald-400/20 bg-emerald-950/50 p-3 shadow-[0_0_0_2px_rgba(6,24,23,0.9)]">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">Idle</p>
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
                {data.loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={`loading-${index}`} className="h-8 rounded-lg bg-emerald-500/10 animate-pulse" />
                  ))
                ) : (
                  data.agents.sessions.slice(0, 5).map((session) => {
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
                  })
                )}
              </div>
            </div>

            <div className="rounded-none border-2 border-emerald-400/25 bg-zinc-950/70 p-4 font-mono shadow-[0_0_0_2px_rgba(6,24,23,0.9)]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-100">
                Recent Completions
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {data.loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`completion-${index}`} className="h-8 rounded-lg bg-emerald-500/10 animate-pulse" />
                  ))
                ) : (
                  data.agents.recentCompletions.slice(0, 3).map((completion) => (
                    <div
                      key={completion.id}
                      className="flex flex-col gap-1 rounded-none border-2 border-emerald-400/15 bg-emerald-950/60 px-3 py-2"
                    >
                      <p className="text-emerald-100">{completion.title}</p>
                      <p className="text-emerald-100/60">
                        {completion.agent} • {completion.completedAt}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-none border-2 border-emerald-400/25 bg-zinc-950/70 p-4 font-mono shadow-[0_0_0_2px_rgba(6,24,23,0.9)]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-100">
                Current Focus
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {data.loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`focus-${index}`} className="h-8 rounded-lg bg-emerald-500/10 animate-pulse" />
                  ))
                ) : (
                  activeSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-none border-2 border-emerald-400/15 bg-emerald-950/60 px-3 py-2"
                    >
                      <p className="text-emerald-100">{session.currentTask}</p>
                      <span className="text-emerald-200/70">{session.progress}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage & Costs */}
      <div className="rounded-2xl border border-cyan-900/40 bg-zinc-950/80 p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg md:text-2xl font-semibold text-cyan-100">
              Usage &amp; Costs
            </h2>
            <p className="text-sm text-zinc-500">
              Track spend, tokens, and activity across the agent mesh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {timeFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  timeFilter === filter
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Total Cost", value: formatCurrency(data.usage.totalCost) },
            { label: "Total Tokens", value: formatNumber(data.usage.totalTokens) },
            { label: "Conversations", value: formatNumber(data.usage.conversations) },
            { label: "Activity", value: formatNumber(data.usage.activity) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-cyan-900/40 bg-zinc-900/70 p-3"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/60">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">
                {data.loading ? "—" : stat.value}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {data.loading ? "Syncing metrics" : "Across selected window"}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-cyan-900/40 bg-zinc-900/60 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-cyan-100">Cost Over Time</h3>
              <p className="text-xs text-zinc-500">
                Daily trend for the selected metric.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {metricTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMetricFilter(tab)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    metricFilter === tab
                      ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            {data.loading ? (
              <div className="h-48 md:h-56 grid grid-cols-7 gap-2 items-end">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="w-full h-20 rounded-md bg-cyan-500/10 animate-pulse" />
                ))}
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-zinc-500">
                No usage data available.
              </div>
            ) : (
              <div className="h-48 md:h-56 flex items-end gap-2">
                {chartData.map((entry, index) => {
                  const height = maxChartValue
                    ? Math.max(8, (entry.value / maxChartValue) * 100)
                    : 0;
                  return (
                    <div key={`${entry.dateLabel}-${index}`} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-cyan-400/80 to-blue-500/80"
                        style={{ height: `${height}%` }}
                      />
                      <span className="mt-2 text-[10px] text-zinc-500">{entry.dateLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { title: "By Agent", rows: data.usage.byAgent },
            { title: "By Model", rows: data.usage.byModel },
          ].map((table) => (
            <div
              key={table.title}
              className="rounded-2xl border border-cyan-900/40 bg-zinc-900/60 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-cyan-100">{table.title}</h3>
                <span className="text-xs text-zinc-500">Cost share</span>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_70px_70px] gap-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>Name</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Tokens</span>
              </div>
              <div className="mt-3 space-y-3">
                {data.loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`loading-${table.title}-${index}`}
                      className="h-12 rounded-lg bg-cyan-500/10 animate-pulse"
                    />
                  ))
                ) : (
                  table.rows.map((row) => (
                    <div
                      key={`${table.title}-${row.name}`}
                      className="grid grid-cols-[minmax(0,1fr)_70px_70px] gap-3 items-center text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-zinc-100">{row.name}</p>
                          <span className="text-[10px] text-cyan-200/70">
                            {row.percentage}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400/80 to-blue-500/80"
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right text-zinc-200">
                        {formatCurrency(row.cost)}
                      </div>
                      <div className="text-right text-zinc-500">
                        {formatNumber(row.tokens)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
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
      <style jsx>{`
        @keyframes kora-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes kora-snooze {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(2px);
          }
        }
        @keyframes helper-hop {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        @keyframes zzz-float {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
