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
      gradient: "from-sky-500/20 to-cyan-500/20",
      iconBg: "bg-sky-500/10 border-sky-500/20",
      stat: stats.unreadEmails,
      statLabel: "unread",
      accent: "text-sky-400",
    },
    {
      id: "business" as ViewType,
      icon: "💼",
      title: "Deals",
      gradient: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      stat: stats.activeDeals,
      statLabel: "active",
      accent: "text-emerald-400",
    },
    {
      id: "kora-tasks" as ViewType,
      icon: "📋",
      title: "Tasks",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      stat: stats.pendingTasks,
      statLabel: "pending",
      accent: "text-amber-400",
    },
    {
      id: "automations" as ViewType,
      icon: "⚡",
      title: "Automations",
      gradient: "from-violet-500/20 to-purple-500/20",
      iconBg: "bg-violet-500/10 border-violet-500/20",
      stat: stats.koraStatus === "active" ? "●" : "○",
      statLabel: stats.koraStatus === "active" ? "running" : "idle",
      accent: "text-violet-400",
    },
  ];

  const quickActions = [
    {
      id: "email" as ViewType,
      icon: "📬",
      title: "Check Email",
      desc: "Review inbox",
    },
    {
      id: "business" as ViewType,
      icon: "💰",
      title: "Deal Pipeline",
      desc: "Manage deals",
    },
    {
      id: "kora-activity" as ViewType,
      icon: "📊",
      title: "Kora Activity",
      desc: "Usage & agents",
    },
    {
      id: "memory" as ViewType,
      icon: "🧠",
      title: "Memory",
      desc: "Browse files",
    },
  ];

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-white">
            {getGreeting()}, Michael
          </h1>
          <p className="text-[#6c6c7a] text-sm mt-1">
            {loading ? (
              <span className="inline-block w-32 h-4 rounded bg-white/[0.04] shimmer" />
            ) : (
              "Here's your overview"
            )}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] text-[#4a4a57] uppercase tracking-wider font-medium">Today</p>
          <p className="text-[15px] font-medium text-[#9b9ba7] mt-0.5">
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
            className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#111113] p-4 md:p-5 text-left transition-all duration-200 hover:border-white/[0.1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:-translate-y-0.5"
          >
            {/* Subtle gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${channel.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="relative">
              <div className={`w-10 h-10 rounded-lg ${channel.iconBg} border flex items-center justify-center text-lg mb-3 transition-transform duration-200 group-hover:scale-105`}>
                {channel.icon}
              </div>
              <h3 className="text-[13px] font-medium text-[#9b9ba7] group-hover:text-white transition-colors duration-200">
                {channel.title}
              </h3>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className={`text-xl font-semibold ${
                  typeof channel.stat === "number" && channel.stat > 0 
                    ? "text-white" 
                    : "text-[#6c6c7a]"
                }`}>
                  {loading ? "—" : channel.stat}
                </span>
                <span className="text-[12px] text-[#6c6c7a]">
                  {channel.statLabel}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111113] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <h2 className="text-[15px] font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04]">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="group flex items-center gap-3 p-4 bg-[#111113] hover:bg-white/[0.03] transition-colors duration-150 text-left"
            >
              <span className="text-xl group-hover:scale-110 transition-transform duration-200">{action.icon}</span>
              <div>
                <p className="text-[13px] font-medium text-[#ededef] group-hover:text-white">{action.title}</p>
                <p className="text-[12px] text-[#6c6c7a]">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <div className={`w-1.5 h-1.5 rounded-full ${stats.koraStatus === "active" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "bg-[#4a4a57]"}`} />
        <span className="text-[12px] text-[#4a4a57] font-medium">
          Kora is {stats.koraStatus}
        </span>
      </div>
    </div>
  );
}
