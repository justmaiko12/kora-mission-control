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
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 overflow-auto h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white">
          Kora Activity
        </h1>
        <span className="text-[11px] text-[#4a4a57] font-medium">
          Updated {data.agents.updatedAt ?? "just now"}
        </span>
      </div>

      {/* Agent Activity Hero - 8-bit Pixel Home (kept as-is, polished frame) */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/[0.15] bg-gradient-to-br from-emerald-950/60 via-[#0a0a0c] to-[#111113]">
        {/* Ambient glow effects */}
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-cyan-500/[0.06] blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 md:p-6 flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Agent Status</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/[0.25] bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-emerald-300/90">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${isAwake ? "animate-ping bg-emerald-300 opacity-60" : "bg-[#4a4a57]"}`} />
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isAwake ? "bg-emerald-300" : "bg-[#4a4a57]"}`} />
                </span>
                {isAwake ? "Active" : "Idle"}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-[#6c6c7a]">
              Monitoring agents and sessions across the Kora mesh.
            </p>

            {/* 8-bit Pixel Home */}
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
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
                  {/* Thought bubbles when active */}
                  {isAwake && (
                    <>
                      <div className="absolute -top-8 -right-4 animate-[thought-1_2s_ease-in-out_infinite]">
                        <div className="w-2 h-2 rounded-full bg-cyan-300/60" />
                      </div>
                      <div className="absolute -top-12 right-0 animate-[thought-2_2s_ease-in-out_infinite_0.3s]">
                        <div className="w-3 h-3 rounded-full bg-cyan-300/50" />
                      </div>
                      <div className="absolute -top-16 right-2 animate-[thought-3_2s_ease-in-out_infinite_0.6s]">
                        <div className="w-4 h-4 rounded-full bg-cyan-300/40" />
                      </div>
                    </>
                  )}
                  
                  {/* Processing sparkles when active */}
                  {isAwake && (
                    <>
                      <div className="absolute -left-6 top-2 text-[8px] text-yellow-300 animate-[sparkle_0.8s_steps(2,end)_infinite]">✦</div>
                      <div className="absolute -right-6 top-4 text-[8px] text-cyan-300 animate-[sparkle_0.8s_steps(2,end)_infinite_0.4s]">✦</div>
                      <div className="absolute -left-4 bottom-2 text-[6px] text-emerald-300 animate-[sparkle_0.8s_steps(2,end)_infinite_0.2s]">✦</div>
                    </>
                  )}
                  
                  <div
                    className={`relative h-14 w-14 border-2 border-emerald-200/80 bg-emerald-300/80 shadow-[0_0_0_2px_rgba(6,24,23,0.95)] ${
                      isAwake ? "animate-[kora-active_0.6s_steps(2,end)_infinite]" : "animate-[kora-snooze_1.8s_steps(2,end)_infinite]"
                    }`}
                  >
                    {/* Eyes - blink when active */}
                    <div className={`absolute left-3 top-4 h-2 w-2 bg-emerald-950 ${isAwake ? "animate-[blink_3s_steps(1)_infinite]" : ""}`} />
                    <div className={`absolute right-3 top-4 h-2 w-2 bg-emerald-950 ${isAwake ? "animate-[blink_3s_steps(1)_infinite]" : ""}`} />
                    {/* Mouth */}
                    <div className="absolute left-1/2 bottom-3 h-1 w-6 -translate-x-1/2 bg-emerald-900/70" />
                    
                    {/* Activity glow when working */}
                    {isAwake && (
                      <div className="absolute inset-0 border-2 border-cyan-300/50 animate-[glow-pulse_1s_ease-in-out_infinite]" />
                    )}
                  </div>
                  <div className="mt-2 rounded-sm border-2 border-emerald-300/60 bg-emerald-950/80 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-200">
                    Kora
                  </div>
                </div>

                {/* Status text with typing dots when active */}
                {!data.loading && (
                  <div className="absolute left-1/2 top-[24%] -translate-x-1/2 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-200/80">
                      {isAwake ? "Working" : "Sleeping"}
                    </div>
                    {isAwake && (
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-[typing_1.4s_ease-in-out_infinite]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-[typing_1.4s_ease-in-out_infinite_0.2s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-[typing_1.4s_ease-in-out_infinite_0.4s]" />
                      </div>
                    )}
                  </div>
                )}

                {/* Helper sprites (sub-agents) */}
                {!data.loading &&
                  activeSessions.slice(0, 4).map((session, index) => {
                    const pos = helperPositions[index % helperPositions.length];
                    const isSubAgent = session.type === "sub-agent" || session.name?.toLowerCase().includes("gemini") || session.name?.toLowerCase().includes("codex");
                    return (
                      <div key={session.id} className="absolute" style={{ top: pos.top, left: pos.left }}>
                        <div className="flex flex-col items-center">
                          {/* Processing indicator above helper */}
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-yellow-300 animate-[typing_1s_ease-in-out_infinite]" />
                            <div className="w-1 h-1 rounded-full bg-yellow-300 animate-[typing_1s_ease-in-out_infinite_0.2s]" />
                            <div className="w-1 h-1 rounded-full bg-yellow-300 animate-[typing_1s_ease-in-out_infinite_0.4s]" />
                          </div>
                          {/* Helper sprite with glow */}
                          <div className={`relative h-5 w-5 border-2 ${isSubAgent ? "border-yellow-200/70 bg-yellow-300/70" : "border-cyan-200/70 bg-cyan-300/70"} shadow-[0_0_0_2px_rgba(8,26,30,0.9)] animate-[helper-work_0.5s_steps(2,end)_infinite]`}>
                            {/* Activity glow */}
                            <div className={`absolute inset-0 ${isSubAgent ? "bg-yellow-300/30" : "bg-cyan-300/30"} animate-[glow-pulse_0.8s_ease-in-out_infinite]`} />
                          </div>
                          <span className={`mt-1 text-[9px] font-mono ${isSubAgent ? "text-yellow-100/80" : "text-cyan-100/70"} truncate max-w-[60px]`}>{session.name}</span>
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
                <div className="rounded-lg border border-emerald-400/[0.15] bg-emerald-950/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/50 font-semibold">Active</p>
                  <p className="text-2xl font-semibold text-emerald-100 mt-0.5">
                    {data.loading ? "—" : activeSessions.length}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-400/[0.15] bg-emerald-950/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/50 font-semibold">Idle</p>
                  <p className="text-2xl font-semibold text-emerald-100 mt-0.5">
                    {data.loading ? "—" : idleSessions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111113] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-white">Sessions</h3>
          <span className="text-[11px] text-[#4a4a57] font-medium">
            {data.agents.sessions.length} total
          </span>
        </div>
        <div className="p-2">
          {data.loading ? (
            <div className="px-3 py-8 text-center">
              <div className="inline-block w-5 h-5 border-2 border-white/[0.1] border-t-indigo-400 rounded-full animate-spin" />
            </div>
          ) : data.agents.sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] text-[#4a4a57]">
              No active sessions
            </div>
          ) : (
            <div className="space-y-0.5">
              {data.agents.sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                    session.type === "sub-agent" 
                      ? "bg-cyan-500/[0.04] border border-cyan-500/[0.1]" 
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    session.status === "active" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" :
                    session.status === "idle" ? "bg-amber-400" : "bg-[#4a4a57]"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-[#ededef] truncate">{session.name}</p>
                      {session.type === "sub-agent" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/[0.1] text-cyan-300/80 uppercase tracking-wider font-semibold border border-cyan-500/[0.15]">
                          Sub
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6c6c7a] truncate mt-0.5">{session.currentTask}</p>
                  </div>
                  <span className="text-[11px] text-[#4a4a57] capitalize flex-shrink-0">
                    {session.type === "sub-agent" ? "" : session.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage & Costs */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111113] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-white">Usage & Costs</h3>
          <div className="flex gap-1">
            {timeFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-all duration-150 ${
                  timeFilter === filter
                    ? "bg-white/[0.08] text-white"
                    : "text-[#6c6c7a] hover:text-[#9b9ba7] hover:bg-white/[0.03]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Cost", value: formatCurrency(data.usage.totalCost) },
              { label: "Tokens", value: formatNumber(data.usage.totalTokens) },
              { label: "Conversations", value: formatNumber(data.usage.conversations) },
              { label: "Activity", value: formatNumber(data.usage.activity) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3.5">
                <p className="text-[11px] text-[#4a4a57] uppercase tracking-wider font-medium">{item.label}</p>
                <p className="text-xl font-semibold text-white mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="mb-6">
            <div className="flex gap-1 mb-4">
              {metricTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMetricFilter(tab)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-all duration-150 ${
                    metricFilter === tab
                      ? "bg-indigo-500/[0.15] text-indigo-300 border border-indigo-500/[0.2]"
                      : "text-[#6c6c7a] hover:text-[#9b9ba7] hover:bg-white/[0.03]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="h-32 flex items-end gap-[3px]">
              {chartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[#4a4a57] text-[13px]">
                  No data yet
                </div>
              ) : (
                chartData.map((entry) => (
                  <div key={entry.date} className="group flex-1 flex flex-col items-center gap-1.5 relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      <div className="bg-[#222328] text-white text-[10px] font-medium px-2 py-1 rounded-md shadow-lg border border-white/[0.06] whitespace-nowrap">
                        {metricFilter === "Cost" ? formatCurrency(entry.value) : formatNumber(entry.value)}
                      </div>
                    </div>
                    <div
                      className="w-full rounded-sm bg-gradient-to-t from-indigo-600/80 to-indigo-400/80 group-hover:from-indigo-500 group-hover:to-indigo-300 transition-all duration-200"
                      style={{
                        height: maxChartValue > 0 ? `${(entry.value / maxChartValue) * 100}%` : "0%",
                        minHeight: entry.value > 0 ? "3px" : "0px",
                      }}
                    />
                    <span className="text-[9px] text-[#4a4a57]">{entry.dateLabel}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Model Breakdown */}
          {data.usage.byModel.length > 0 && (
            <div>
              <h4 className="text-[13px] font-medium text-[#9b9ba7] mb-3">By Model</h4>
              <div className="space-y-2.5">
                {data.usage.byModel.map((model) => (
                  <div key={model.name} className="flex items-center gap-3">
                    <span className="text-[12px] text-[#6c6c7a] w-32 truncate font-medium">{model.name}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${model.percentage}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#4a4a57] w-16 text-right font-medium">
                      {formatCurrency(model.cost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Active Kora - more energetic bounce */
        @keyframes kora-active {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
        }
        /* Sleeping Kora - gentle breathing */
        @keyframes kora-snooze {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        /* Helper working animation */
        @keyframes helper-work {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-3deg); }
          75% { transform: translateY(-4px) rotate(3deg); }
        }
        /* Zzz floating */
        @keyframes zzz-float {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        /* Typing dots */
        @keyframes typing {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        /* Thought bubbles floating up */
        @keyframes thought-1 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-3px) scale(1.1); opacity: 0.8; }
        }
        @keyframes thought-2 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-4px) scale(1.1); opacity: 0.7; }
        }
        @keyframes thought-3 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-5px) scale(1.1); opacity: 0.6; }
        }
        /* Sparkle twinkle */
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        /* Glow pulse for active elements */
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        /* Eye blink */
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>
    </div>
  );
}
