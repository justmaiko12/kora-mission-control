"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ViewType } from "@/app/page";
import { CustomChannel, createCustomChannel } from "@/lib/channelStorage";
import { getSettings, onSettingsChange, syncSettingsFromAPI, AppSettings } from "@/lib/settings";
import Avatar from "./Avatar";
import SettingsModal from "./SettingsModal";

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  customChannels: CustomChannel[];
  activeCustomChannelId: string | null;
  onSelectCustomChannel: (channelId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id?: ViewType;
  icon: string;
  label: string;
  badge?: number;
  href?: string;
  external?: boolean;
}

interface BadgeCounts {
  email: number;
  deals: number;
  tasks: number;
}

const appLinks = [
  { name: "Kreatrix AI", url: "https://kreatrix.vercel.app", emoji: "🎨" },
  { name: "Flow-State Calendar", url: "https://flow-state-calendar.vercel.app", emoji: "📅" },
  { name: "Internal Invoicer", url: "https://internal-promo-invoicer.vercel.app", emoji: "💰" },
  { name: "SnapTasks", url: "https://snaptasks.vercel.app", emoji: "📸" },
  { name: "Dance Trainer", url: "https://dance-trainer.vercel.app", emoji: "💃" },
  { name: "Saigon BonBon", url: "https://saigon-bonbon.vercel.app", emoji: "🍜" },
];

export default function Sidebar({
  activeView,
  onNavigate,
  customChannels,
  activeCustomChannelId,
  onSelectCustomChannel,
  isOpen,
  onClose,
}: SidebarProps) {
  const [appsOpen, setAppsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [badges, setBadges] = useState<BadgeCounts>({ email: 0, deals: 0, tasks: 0 });

  useEffect(() => {
    // Load from localStorage first (fast)
    setSettings(getSettings());
    // Then sync from API (for cross-device persistence)
    syncSettingsFromAPI().then(setSettings);
    return onSettingsChange(setSettings);
  }, []);

  // Fetch real badge counts
  useEffect(() => {
    async function fetchBadges() {
      try {
        // Fetch email counts
        const emailRes = await fetch("/api/emails");
        const emailData = await emailRes.json();
        const unreadEmails = emailData.emails?.filter((e: { read: boolean }) => !e.read).length || 0;

        // Fetch deal counts
        const dealsRes = await fetch("/api/deals?view=pipeline");
        const dealsData = await dealsRes.json();
        const newLeads = dealsData.deals?.new_lead?.length || 0;

        // Fetch task counts
        const tasksRes = await fetch("/api/tasks");
        const tasksData = await tasksRes.json();
        const activeTasks = tasksData.tasks?.filter((t: { status: string }) => t.status !== "completed").length || 0;

        setBadges({
          email: unreadEmails,
          deals: newLeads,
          tasks: activeTasks,
        });
      } catch (err) {
        console.error("Failed to fetch badge counts:", err);
      }
    }

    fetchBadges();
    // Refresh every 60 seconds
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, []);

  const channelItems: NavItem[] = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "email", icon: "📧", label: "Email", badge: badges.email || undefined },
    { id: "business", icon: "💼", label: "Deals", badge: badges.deals || undefined },
    { id: "payables", icon: "💸", label: "Payables", href: "/payables" },
  ];

  const koraItems: NavItem[] = [
    { id: "kora-activity", icon: "📊", label: "Activity" },
    { id: "memory", icon: "🧠", label: "Memory" },
    { id: "kora-tasks", icon: "📋", label: "My Tasks", badge: badges.tasks || undefined },
    { id: "integrations", icon: "🔌", label: "Integrations" },
  ];

  const handleNavigate = (view: ViewType) => {
    onNavigate(view);
    onClose(); // Close sidebar on mobile after navigation
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = item.id && activeView === item.id;
    const classes = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
      isActive
        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
        : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
    }`;

    const content = (
      <>
        <span className="text-xl">{item.icon}</span>
        <span className="flex-1 font-medium">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-600 text-white">
            {item.badge}
          </span>
        )}
      </>
    );

    if (item.href) {
      if (item.external) {
        return (
          <a href={item.href} target="_blank" rel="noreferrer" className={classes}>
            {content}
          </a>
        );
      }

      return (
        <Link href={item.href} className={classes} onClick={onClose}>
          {content}
        </Link>
      );
    }

    return (
      <button onClick={() => item.id && handleNavigate(item.id)} className={classes}>
        {content}
      </button>
    );
  };

  const handleCreateChannel = async () => {
    const name = window.prompt("Name your channel");
    if (!name) return;
    const newChannel = await createCustomChannel({
      name,
      emoji: "✨",
      filter: { type: "keyword", value: name, sources: ["email", "tasks"] },
    });
    onSelectCustomChannel(newChannel.id);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay - only captures clicks on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden lg:pointer-events-none"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-64 bg-zinc-900 lg:bg-zinc-900/50 border-r border-zinc-800 
        flex flex-col flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="md" />
            <div>
              <h1 className="font-bold text-lg">{settings?.appName || "Kora"}</h1>
              <p className="text-xs text-zinc-500">Mission Control</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
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
                <NavButton key={item.id || item.href} item={item} />
              ))}
            </div>
          </div>

          {/* Custom Channels Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Custom Channels</span>
              <button
                onClick={handleCreateChannel}
                className="text-base text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                +
              </button>
            </div>
            <div className="space-y-1">
              {customChannels.length === 0 && (
                <div className="px-3 py-2 text-xs text-zinc-600">Create a channel in chat.</div>
              )}
              {customChannels.map((channel) => {
                const isActive = activeView === "custom" && activeCustomChannelId === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      onSelectCustomChannel(channel.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                        : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-lg">{channel.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{channel.name}</span>
                  </button>
                );
              })}
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

          {/* Apps Section */}
          <div>
            <button
              onClick={() => setAppsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
            >
              <span>Apps</span>
              <span className={`text-base transition-transform ${appsOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {appsOpen && (
              <div className="space-y-1">
                {appLinks.map((app) => (
                  <a
                    key={app.name}
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                  >
                    <span className="text-lg">{app.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{app.name}</span>
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User/Settings */}
        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
