"use client";

import { ViewType } from "@/app/page";

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

interface ChannelCard {
  id: ViewType;
  icon: string;
  title: string;
  count: number;
  color: string;
  items: string[];
}

const channels: ChannelCard[] = [
  {
    id: "email",
    icon: "📧",
    title: "Email",
    count: 3,
    color: "from-blue-500 to-cyan-500",
    items: ["Brand deal inquiry from Nike", "Contract update from Sony", "Weekly analytics report"],
  },
  {
    id: "tasks",
    icon: "✅",
    title: "Tasks",
    count: 5,
    color: "from-green-500 to-emerald-500",
    items: ["Anthony's edit needs review", "Content due for TikTok", "Kreatrix bug #142"],
  },
  {
    id: "chat",
    icon: "💬",
    title: "Chat",
    count: 1,
    color: "from-indigo-500 to-violet-500",
    items: ["Continue conversation..."],
  },
];

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Good afternoon, Michael 👋</h1>
          <p className="text-zinc-500 text-sm md:text-base mt-1">Here's what needs your attention</p>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Unread</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">11</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Due Today</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">3</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Active</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">5</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Kora</p>
          <p className="text-base md:text-lg font-bold mt-1 text-green-500">● Online</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onNavigate(channel.id)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 text-left hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
          >
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center text-xl md:text-2xl`}>
                {channel.icon}
              </div>
              {channel.count > 0 && (
                <span className="px-2 py-0.5 text-xs md:text-sm font-semibold rounded-full bg-indigo-600 text-white">
                  {channel.count}
                </span>
              )}
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2 group-hover:text-indigo-400 transition-colors">
              {channel.title}
            </h3>
            <ul className="space-y-1">
              {channel.items.slice(0, 2).map((item, i) => (
                <li key={i} className="text-xs md:text-sm text-zinc-500 truncate">
                  • {item}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
        <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Recent Activity</h2>
        <div className="space-y-2 md:space-y-3">
          {[
            { time: "2m ago", text: "Heartbeat sent", type: "system" },
            { time: "15m ago", text: "Morning briefing compiled", type: "automation" },
            { time: "1h ago", text: "Editor task ping ran", type: "automation" },
            { time: "2h ago", text: "New email from brand@nike.com", type: "email" },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
              <span className="text-zinc-600 w-14 md:w-16 flex-shrink-0">{activity.time}</span>
              <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs flex-shrink-0 ${
                activity.type === "system" ? "bg-zinc-800 text-zinc-400" :
                activity.type === "automation" ? "bg-indigo-900/50 text-indigo-400" :
                "bg-blue-900/50 text-blue-400"
              }`}>
                {activity.type}
              </span>
              <span className="text-zinc-300 truncate">{activity.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
