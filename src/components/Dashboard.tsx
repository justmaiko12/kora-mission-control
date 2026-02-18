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
      color: "from-sky-500 to-cyan-500",
      stat: stats.unreadEmails,
      statLabel: "unread",
    },
    {
      id: "business" as ViewType,
      icon: "💼",
      title: "Deals",
      color: "from-green-500 to-emerald-500",
      stat: stats.activeDeals,
      statLabel: "active",
    },
    {
      id: "kora-tasks" as ViewType,
      icon: "📋",
      title: "Tasks",
      color: "from-amber-500 to-orange-500",
      stat: stats.pendingTasks,
      statLabel: "pending",
    },
    {
      id: "kora-activity" as ViewType,
      icon: "🤖",
      title: "Kora",
      color: "from-emerald-500 to-teal-500",
      stat: stats.koraStatus === "active" ? "●" : "○",
      statLabel: stats.koraStatus,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{getGreeting()}, Michael 👋</h1>
          <p className="text-zinc-500 text-sm md:text-base mt-1">
            {loading ? "Loading..." : "Here's your overview"}
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

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onNavigate(channel.id)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 text-left hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center text-2xl mb-3`}>
              {channel.icon}
            </div>
            <h3 className="text-lg font-semibold mb-1 group-hover:text-indigo-400 transition-colors">
              {channel.title}
            </h3>
            <p className="text-zinc-500 text-sm">
              <span className={`font-bold ${typeof channel.stat === "number" && channel.stat > 0 ? "text-white" : ""}`}>
                {channel.stat}
              </span>{" "}
              {channel.statLabel}
            </p>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate("email")}
            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-2xl">📬</span>
            <div>
              <p className="font-medium text-sm">Check Email</p>
              <p className="text-xs text-zinc-500">Review inbox</p>
            </div>
          </button>
          <button
            onClick={() => onNavigate("business")}
            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-medium text-sm">Deal Pipeline</p>
              <p className="text-xs text-zinc-500">Manage deals</p>
            </div>
          </button>
          <button
            onClick={() => onNavigate("kora-activity")}
            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-sm">Kora Activity</p>
              <p className="text-xs text-zinc-500">Usage & agents</p>
            </div>
          </button>
          <button
            onClick={() => onNavigate("memory")}
            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-2xl">🧠</span>
            <div>
              <p className="font-medium text-sm">Memory</p>
              <p className="text-xs text-zinc-500">Browse files</p>
            </div>
          </button>
        </div>
      </div>

      {/* Status Footer */}
      <div className="text-center text-xs text-zinc-600 pt-2">
        Mission Control • Kora is {stats.koraStatus}
      </div>
    </div>
  );
}
