"use client";

import { useEffect, useState } from "react";
import { ViewType } from "@/app/page";

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

interface QuickStats {
  unreadEmails: number;
  activeDeals: number;
  pendingTasks: number;
  koraStatus: "active" | "idle";
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<QuickStats>({
    unreadEmails: 0,
    activeDeals: 0,
    pendingTasks: 0,
    koraStatus: "idle",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [emailRes, dealsRes, tasksRes, agentRes] = await Promise.all([
          fetch("/api/emails"),
          fetch("/api/deals?view=pipeline"),
          fetch("/api/tasks"),
          fetch("/api/agents/status"),
        ]);

        const emailData = await emailRes.json();
        const dealsData = await dealsRes.json();
        const tasksData = await tasksRes.json();
        const agentData = await agentRes.json();

        const unreadEmails = emailData.emails?.filter((e: { read: boolean }) => !e.read).length || 0;
        const activeDeals = Object.values(dealsData.deals || {}).flat().length;
        const pendingTasks = tasksData.tasks?.filter((t: { status: string }) => t.status !== "completed").length || 0;
        const koraStatus = agentData.activeCount > 0 ? "active" : "idle";

        setStats({ unreadEmails, activeDeals, pendingTasks, koraStatus });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
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
      gradient: "from-sky-500/20 to-cyan-500/10",
      accentColor: "text-sky-400",
      borderHover: "hover:border-sky-500/30",
      stat: stats.unreadEmails,
      statLabel: "unread",
    },
    {
      id: "business" as ViewType,
      icon: "💼",
      title: "Deals",
      gradient: "from-emerald-500/20 to-green-500/10",
      accentColor: "text-emerald-400",
      borderHover: "hover:border-emerald-500/30",
      stat: stats.activeDeals,
      statLabel: "active",
    },
    {
      id: "kora-tasks" as ViewType,
      icon: "📋",
      title: "Tasks",
      gradient: "from-amber-500/20 to-orange-500/10",
      accentColor: "text-amber-400",
      borderHover: "hover:border-amber-500/30",
      stat: stats.pendingTasks,
      statLabel: "pending",
    },
    {
      id: "automations" as ViewType,
      icon: "⚡",
      title: "Automations",
      gradient: "from-violet-500/20 to-purple-500/10",
      accentColor: "text-violet-400",
      borderHover: "hover:border-violet-500/30",
      stat: stats.koraStatus === "active" ? "●" : "○",
      statLabel: stats.koraStatus === "active" ? "running" : "idle",
    },
  ];

  const quickActions = [
    { view: "email" as ViewType, icon: "📬", title: "Check Email", subtitle: "Review inbox" },
    { view: "business" as ViewType, icon: "💰", title: "Deal Pipeline", subtitle: "Manage deals" },
    { view: "kora-activity" as ViewType, icon: "📊", title: "Kora Activity", subtitle: "Usage & agents" },
    { view: "memory" as ViewType, icon: "🧠", title: "Memory", subtitle: "Browse files" },
  ];

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {getGreeting()}, Michael
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5">
            {loading ? (
              <span className="inline-block w-32 h-4 rounded bg-[var(--surface-2)] shimmer" />
            ) : (
              "Here's your overview"
            )}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Today</p>
          <p className="text-[15px] font-semibold text-[var(--text-secondary)] mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onNavigate(channel.id)}
            className={`stat-card group p-4 md:p-5 text-left ${channel.borderHover}`}
          >
            <div className={`w-10 h-10 rounded-[var(--radius-sm)] bg-gradient-to-br ${channel.gradient} flex items-center justify-center text-xl mb-3 transition-transform group-hover:scale-105`}>
              {channel.icon}
            </div>
            <h3 className={`text-[15px] font-semibold text-[var(--text-secondary)] mb-0.5 transition-colors group-hover:${channel.accentColor}`}>
              {channel.title}
            </h3>
            <p className="text-[13px] text-[var(--text-muted)]">
              <span className={`font-semibold ${typeof channel.stat === "number" && channel.stat > 0 ? "text-[var(--text-primary)]" : ""}`}>
                {loading ? "—" : channel.stat}
              </span>{" "}
              {channel.statLabel}
            </p>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="surface-card p-5 md:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {quickActions.map((action) => (
            <button
              key={action.view}
              onClick={() => onNavigate(action.view)}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-transparent hover:border-[var(--border-hover)] transition-all text-left group"
            >
              <span className="text-xl transition-transform group-hover:scale-110">{action.icon}</span>
              <div className="min-w-0">
                <p className="font-medium text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                  {action.title}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{action.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)] pt-1">
        <span>Mission Control</span>
        <span className="text-[var(--border-hover)]">·</span>
        <span className="flex items-center gap-1.5">
          Kora is{" "}
          <span className={`inline-flex items-center gap-1 ${stats.koraStatus === "active" ? "text-emerald-400" : ""}`}>
            {stats.koraStatus === "active" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            )}
            {stats.koraStatus}
          </span>
        </span>
      </div>
    </div>
  );
}
