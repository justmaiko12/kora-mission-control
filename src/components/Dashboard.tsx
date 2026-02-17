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
    id: "business",
    icon: "💼",
    title: "Business",
    count: 2,
    color: "from-purple-500 to-pink-500",
    items: ["WinterWhale deal update", "New sponsorship opportunity"],
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Good afternoon, Michael 👋</h1>
          <p className="text-zinc-500 mt-1">Here's what needs your attention</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Today</p>
          <p className="text-lg font-semibold">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Unread Items</p>
          <p className="text-3xl font-bold mt-1">11</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Tasks Due Today</p>
          <p className="text-3xl font-bold mt-1">3</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Automations Active</p>
          <p className="text-3xl font-bold mt-1">5</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Kora Status</p>
          <p className="text-lg font-bold mt-1 text-green-500">● Online</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-2 gap-4">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onNavigate(channel.id)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center text-2xl`}>
                {channel.icon}
              </div>
              {channel.count > 0 && (
                <span className="px-2.5 py-1 text-sm font-semibold rounded-full bg-indigo-600 text-white">
                  {channel.count} new
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-400 transition-colors">
              {channel.title}
            </h3>
            <ul className="space-y-1">
              {channel.items.slice(0, 3).map((item, i) => (
                <li key={i} className="text-sm text-zinc-500 truncate">
                  • {item}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { time: "2 min ago", text: "Heartbeat sent to Kora platform", type: "system" },
            { time: "15 min ago", text: "Morning briefing compiled", type: "automation" },
            { time: "1 hour ago", text: "Editor task ping automation ran", type: "automation" },
            { time: "2 hours ago", text: "New email from brand@nike.com", type: "email" },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="text-zinc-600 w-20">{activity.time}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                activity.type === "system" ? "bg-zinc-800 text-zinc-400" :
                activity.type === "automation" ? "bg-indigo-900/50 text-indigo-400" :
                "bg-blue-900/50 text-blue-400"
              }`}>
                {activity.type}
              </span>
              <span className="text-zinc-300">{activity.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}