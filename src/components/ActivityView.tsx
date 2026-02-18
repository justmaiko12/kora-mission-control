"use client";

import { useEffect, useMemo, useState } from "react";

interface AgentSession {
  id: string;
  name: string;
  status: "active" | "idle" | "paused";
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

interface ActivityData {
  agents: AgentStatusResponse;
  usage: UsageResponse;
  loading: boolean;
  error: string | null;
}

export default function ActivityView() {
  const [data, setData] = useState<ActivityData>({
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
  const [metricFilter, setMetricFilter] = useState<"Cost" | "Tokens" | "Conversations" | "Activity">("Cost");

  useEffect(() => {
    async function fetchData() {
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
        console.error("Activity fetch error:", err);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load data",
        }));
      }
    }

    fetchData();
    const interval = setInterval(async () => {
      try {
        const agentRes = await fetch("/api/agents/status");
        const agentData = await agentRes.json();
        setData((prev) => ({ ...prev, agents: agentData }));
      } catch (err) {
        console.error("Agent status poll error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US").format(value);

  const activeSessions = useMemo(
    () => data.agents.sessions.filter((s) => s.status === "active"),
    [data.agents.sessions]
  );

  const idleSessions = useMemo(
    () => data.agents.sessions.filter((s) => s.status !== "active"),
    [data.agents.sessions]
  );

  const isAwake = activeSessions.length > 0;

  const helperPositions = [
    { top: "62%", left: "18%" },
    { top: "64%", left: "74%" },
    { top: "46%", left: "16%" },
    { top: "44%", left: "78%" },
  ];

  const chartData = useMemo(() => {
    return data.usage.dailyCosts.map((entry) => {
      let value = entry.cost;
      if (metricFilter === "Tokens") value = entry.tokens;
      if (metricFilter === "Conversations") value = Math.max(1, Math.round(entry.tokens / 900));
      if (metricFilter === "Activity") value = Math.max(1, Math.round(entry.tokens / 140));
      return {
        date: entry.date,
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
    return Math.max(...chartData.map((e) => e.value));
  }, [chartData]);

  const timeFilters = ["Today", "This Week", "This Month", "This Year"];
  const metricTabs: Array<"Cost" | "Tokens" | "Conversations" | "Activity"> = [
    "Cost", "Tokens", "Conversations", "Activity"
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Kora Activity</h1>
        <span className="text-xs text-zinc-500">
          Updated: {data.agents.updatedAt ?? "just now"}
        </span>
      </div>

      {/* Agent Activity Hero - 8-bit Pixel Home */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/80 via-zinc-950 to-zinc-900/70 p-4 md:p-6">
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg md:text-2xl font-semibold text-emerald-100">Agent Status</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${isAwake ? "animate-ping bg-emerald-300 opacity-60" : "bg-zinc-500"}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${isAwake ? "bg-emerald-300" : "bg-zinc-500"}`} />
                </span>
                {isAwake ? "Active" : "Idle"}
              </span>
            </div>
            <p className="mt-2 text-sm text-emerald-100/70">
              Monitoring agents and sessions across the Kora mesh.
            </p>

            {/* 8-bit Pixel Home */}
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-none border-2 border-emerald-300/40 bg-[#0b1b1a] p-4 shadow-[0_0_0_2px_rgba(6,24,23,0.95),0_0_0_4px_rgba(16,185,129,0.25)]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,185,129,0.06)_1px,transparent_1px),linear-gradient(rgba(16,185,129,0.06)_1px,transparent_1px)] bg-[size:12px_12px] opacity-70" />
                <div className="absolute inset-x-4 top-4 h-2 border-2 border-emerald-300/50 bg-emerald-900/60" />

                <div className="absolute right-6 top-8 h-14 w-14 border-2 border-cyan-300/70 bg-cyan-500/20 shadow-[0_0_0_2px_rgba(8,38,40,0.9)]">
                  <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-cyan-300/60" />
                  <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-cyan-300/60" />
                </div>

                <div className="absolute left-6 bottom-14 h-8 w-24 border-2 border-amber-300/60 bg-amber-700/60" />
                <div className="absolute left-8 bottom-[88px] h-6 w-6 border-2 border-emerald-300/50 bg-emerald-700/60" />
                <div className="absolute left-9 bottom-[72px] h-4 w-4 bg-emerald-300/70" />

                <div className="absolute inset-x-0 bottom-0 h-20 border-t-2 border-emerald-300/30 bg-gradient-to-t from-emerald-950/80 via-emerald-900/40 to-transparent" />

                {/* Kora sprite */}
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

                {!data.loading && (
                  <div className="absolute left-1/2 top-[26%] -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-200/80">
                    {isAwake ? "Awake" : "Sleeping"}
                  </div>
                )}

                {/* Helper sprites */}
                {!data.loading &&
                  activeSessions.slice(0, 4).map((session, index) => {
                    const pos = helperPositions[index % helperPositions.length];
                    return (
                      <div key={session.id} className="absolute" style={{ top: pos.top, left: pos.left }}>
                        <div className="flex flex-col items-center">
                          <div className="h-5 w-5 border-2 border-cyan-200/70 bg-cyan-300/70 shadow-[0_0_0_2px_rgba(8,26,30,0.9)] animate-[helper-hop_1.4s_steps(2,end)_infinite]" />
                          <span className="mt-1 text-[9px] font-mono text-cyan-100/70">{session.name}</span>
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

              {/* Stats sidebar */}
              <div className="space-y-3 font-mono">
                <div className="rounded-none border-2 border-emerald-400/30 bg-emerald-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">Active</p>
                  <p className="text-2xl font-semibold text-emerald-100">
                    {data.loading ? "—" : activeSessions.length}
                  </p>
                </div>
                <div className="rounded-none border-2 border-emerald-400/30 bg-emerald-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">Idle</p>
                  <p className="text-2xl font-semibold text-emerald-100">
                    {data.loading ? "—" : idleSessions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="font-semibold mb-3">Sessions</h3>
        <div className="space-y-2">
          {data.loading ? (
            <div className="text-zinc-500 text-sm">Loading...</div>
          ) : data.agents.sessions.length === 0 ? (
            <div className="text-zinc-500 text-sm">No sessions</div>
          ) : (
            data.agents.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50"
              >
                <div className={`w-2 h-2 rounded-full ${
                  session.status === "active" ? "bg-emerald-400" :
                  session.status === "idle" ? "bg-amber-400" : "bg-zinc-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{session.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{session.currentTask}</p>
                </div>
                <span className="text-xs text-zinc-500 capitalize">{session.type}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage & Costs */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold">Usage & Costs</h3>
          <div className="flex gap-2">
            {timeFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  timeFilter === filter
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total Cost</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(data.usage.totalCost)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Tokens</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(data.usage.totalTokens)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Conversations</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(data.usage.conversations)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Activity</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(data.usage.activity)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            {metricTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setMetricFilter(tab)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  metricFilter === tab
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="h-32 flex items-end gap-1">
            {chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                No data yet
              </div>
            ) : (
              chartData.map((entry, i) => (
                <div key={entry.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all"
                    style={{
                      height: maxChartValue > 0 ? `${(entry.value / maxChartValue) * 100}%` : "0%",
                      minHeight: entry.value > 0 ? "4px" : "0px",
                    }}
                  />
                  <span className="text-[10px] text-zinc-500">{entry.dateLabel}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Model Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">By Model</h4>
          <div className="space-y-2">
            {data.usage.byModel.map((model) => (
              <div key={model.name} className="flex items-center gap-3">
                <span className="text-sm text-zinc-400 w-32 truncate">{model.name}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${model.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-16 text-right">
                  {formatCurrency(model.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes kora-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes kora-snooze {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        @keyframes helper-hop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes zzz-float {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
