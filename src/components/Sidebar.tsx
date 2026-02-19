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
    console.log('[Sidebar] handleNavigate called with:', view);
    console.log('[Sidebar] onNavigate function:', typeof onNavigate);
    onNavigate(view);
    console.log('[Sidebar] onNavigate completed, calling onClose');
    onClose();
    console.log('[Sidebar] onClose completed');
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = item.id && activeView === item.id;

    const content = (
      <>
        <span className="w-5 h-5 flex items-center justify-center text-[15px] flex-shrink-0">{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="nav-badge">{item.badge}</span>
        )}
      </>
    );

    const className = `nav-item w-full ${isActive ? "active" : ""}`;

    if (item.href) {
      if (item.external) {
        return (
          <a href={item.href} target="_blank" rel="noreferrer" className={className}>
            {content}
          </a>
        );
      }
      // Use onPointerUp for Arc browser compatibility
      return (
        <Link 
          href={item.href} 
          className={className} 
          onPointerUp={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{ pointerEvents: 'auto' }}
        >
          {content}
        </Link>
      );
    }

    return (
      <button 
        type="button"
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[Sidebar] Button PointerUp (navigating):', item.id);
          if (item.id) handleNavigate(item.id);
        }}
        className={className}
        style={{ pointerEvents: 'auto' }}
      >
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
      {/* Sidebar - no overlay, just slides in/out */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 lg:inset-auto z-[200] lg:z-[100]
          w-[240px] bg-[var(--surface-1)] border-r border-[var(--border)]
          flex flex-col flex-shrink-0 h-screen
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          shadow-2xl lg:shadow-none
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo / Brand */}
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="md" />
            <div>
              <h1 className="font-semibold text-[15px] text-[var(--text-primary)] leading-tight">
                {settings?.appName || "Kora"}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Mission Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            <span className="text-[12px] text-[var(--text-muted)]">Connected</span>
          </div>
        </div>

        <div className="h-px bg-[var(--border)] mx-4" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5" style={{ pointerEvents: 'auto' }}>
          {/* Channels */}
          <div>
            <h2 className="section-label px-2.5 mb-1.5">Channels</h2>
            <div className="space-y-0.5">
              {channelItems.map((item) => (
                <NavButton key={item.id || item.href} item={item} />
              ))}
            </div>
          </div>

          {/* Kora */}
          <div>
            <h2 className="section-label px-2.5 mb-1.5">Kora</h2>
            <div className="space-y-0.5">
              {automationItems.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Apps */}
          <div>
            <button
              onClick={() => setAppsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-2.5 mb-1.5 section-label hover:text-[var(--text-tertiary)] transition-colors"
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
                    className="nav-item group"
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-[15px] flex-shrink-0">{app.emoji}</span>
                    <span className="flex-1 text-left text-[13px] truncate">{app.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Settings */}
        <div className="px-3 py-3 border-t border-[var(--border)]">
          <button
            onClick={() => setSettingsOpen(true)}
            className="nav-item w-full"
          >
            <span className="w-5 h-5 flex items-center justify-center text-[15px] flex-shrink-0">⚙️</span>
            <span className="flex-1 text-left">Settings</span>
          </button>
        </div>
      </aside>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
