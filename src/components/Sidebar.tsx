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
    setSettings(getSettings());
    syncSettingsFromAPI().then(setSettings);
    return onSettingsChange(setSettings);
  }, []);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const emailRes = await fetch("/api/emails");
        const emailData = await emailRes.json();
        const unreadEmails = emailData.emails?.filter((e: { read: boolean }) => !e.read).length || 0;

        const dealsRes = await fetch("/api/deals?view=pipeline");
        const dealsData = await dealsRes.json();
        const newLeads = dealsData.deals?.new_lead?.length || 0;

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
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, []);

  const channelItems: NavItem[] = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "email", icon: "📧", label: "Email", badge: badges.email || undefined },
    { id: "business", icon: "💼", label: "Deals", badge: badges.deals || undefined },
    { id: "payables", icon: "💸", label: "Payables", href: "/payables" },
  ];

  const automationItems: NavItem[] = [
    { id: "automations", icon: "⚡", label: "Automations" },
    { id: "kora-activity", icon: "📊", label: "Activity" },
    { id: "memory", icon: "🧠", label: "Memory" },
    { id: "kora-tasks", icon: "📋", label: "My Tasks", badge: badges.tasks || undefined },
  ];

  const handleNavigate = (view: ViewType) => {
    onNavigate(view);
    onClose();
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = item.id && activeView === item.id;
    const classes = `group w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-left transition-all duration-150 ${
      isActive
        ? "bg-white/[0.08] text-white"
        : "text-[#9b9ba7] hover:bg-white/[0.04] hover:text-[#ededef]"
    }`;

    const content = (
      <>
        <span className="text-[15px] w-5 text-center flex-shrink-0">{item.icon}</span>
        <span className="flex-1 text-[13px] font-medium">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-semibold rounded-full bg-indigo-500/90 text-white">
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
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden lg:pointer-events-none"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-[240px] flex flex-col flex-shrink-0
        bg-[#111113] lg:bg-[#111113]/80
        border-r border-white/[0.06]
        transform transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo area */}
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar size="md" />
            <div>
              <h1 className="font-semibold text-[14px] text-white leading-tight">{settings?.appName || "Kora"}</h1>
              <p className="text-[11px] text-[#6c6c7a] leading-tight">Mission Control</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-[#6c6c7a] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            <span className="text-[11px] text-emerald-300/80 font-medium">Connected</span>
          </div>
        </div>

        <div className="h-px bg-white/[0.06] mx-3" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3 space-y-5">
          {/* Channels Section */}
          <div>
            <h2 className="px-2.5 mb-1.5 text-[11px] font-semibold text-[#4a4a57] uppercase tracking-[0.05em]">
              Channels
            </h2>
            <div className="space-y-0.5">
              {channelItems.map((item) => (
                <NavButton key={item.id || item.href} item={item} />
              ))}
            </div>
          </div>

          {/* Kora Section */}
          <div>
            <h2 className="px-2.5 mb-1.5 text-[11px] font-semibold text-[#4a4a57] uppercase tracking-[0.05em]">
              Kora
            </h2>
            <div className="space-y-0.5">
              {automationItems.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Apps Section */}
          <div>
            <button
              onClick={() => setAppsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-2.5 mb-1.5 text-[11px] font-semibold text-[#4a4a57] uppercase tracking-[0.05em] hover:text-[#6c6c7a] transition-colors"
            >
              <span>Apps</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${appsOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {appsOpen && (
              <div className="space-y-0.5 animate-fade-in">
                {appLinks.map((app) => (
                  <a
                    key={app.name}
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-left transition-all duration-150 text-[#9b9ba7] hover:bg-white/[0.04] hover:text-[#ededef]"
                  >
                    <span className="text-[15px] w-5 text-center flex-shrink-0">{app.emoji}</span>
                    <span className="flex-1 text-[13px] font-medium">{app.name}</span>
                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User/Settings */}
        <div className="p-3 border-t border-white/[0.06]">
          <button 
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[#9b9ba7] hover:bg-white/[0.04] hover:text-[#ededef] transition-all duration-150"
          >
            <span className="text-[15px] w-5 text-center">⚙️</span>
            <span className="text-[13px] font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
