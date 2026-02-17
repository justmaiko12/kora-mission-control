"use client";

import { ViewType } from "@/app/page";

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

interface NavItem {
  id: ViewType;
  icon: string;
  label: string;
  badge?: number;
}

const channelItems: NavItem[] = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "email", icon: "📧", label: "Email", badge: 3 },
  { id: "tasks", icon: "✅", label: "Tasks", badge: 5 },
  { id: "business", icon: "💼", label: "Business", badge: 2 },
  { id: "chat", icon: "💬", label: "Chat" },
];

const koraItems: NavItem[] = [
  { id: "memory", icon: "🧠", label: "Memory" },
  { id: "kora-tasks", icon: "📋", label: "My Tasks", badge: 3 },
  { id: "integrations", icon: "🔌", label: "Integrations" },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const NavButton = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => onNavigate(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
        activeView === item.id
          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
          : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <span className="text-xl">{item.icon}</span>
      <span className="flex-1 font-medium">{item.label}</span>
      {item.badge && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-600 text-white">
          {item.badge}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">
            🦞
          </div>
          <div>
            <h1 className="font-bold text-lg">Kora</h1>
            <p className="text-xs text-zinc-500">Mission Control</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-zinc-400">Connected</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Channels Section */}
        <div>
          <h2 className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Channels
          </h2>
          <div className="space-y-1">
            {channelItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Kora Section */}
        <div>
          <h2 className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Kora
          </h2>
          <div className="space-y-1">
            {koraItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* User/Settings */}
      <div className="p-4 border-t border-zinc-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all">
          <span className="text-xl">⚙️</span>
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}