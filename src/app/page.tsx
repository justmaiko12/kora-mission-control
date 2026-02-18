"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChannelView from "@/components/ChannelView";
import MemoryBrowser from "@/components/MemoryBrowser";
import KoraTasks from "@/components/KoraTasks";
import Integrations from "@/components/Integrations";
import InlineChat, { ChatContext } from "@/components/InlineChat";
import EmailView from "@/components/EmailView";
import DealsView from "@/components/DealsView";
import Dashboard from "@/components/Dashboard";
import Avatar from "@/components/Avatar";
import { FocusedItem } from "@/lib/types";
import { CustomChannel, listCustomChannels, onCustomChannelsUpdated } from "@/lib/channelStorage";
import ErrorBoundary from "@/components/ErrorBoundary";

export type ViewType =
  | "dashboard"
  | "email"
  | "tasks"
  | "chat"
  | "custom"
  | "memory"
  | "kora-tasks"
  | "integrations"
  | "payables"
  | "business";

const viewOptions: ViewType[] = [
  "dashboard",
  "email",
  "tasks",
  "chat",
  "custom",
  "memory",
  "kora-tasks",
  "integrations",
  "payables",
  "business",
];

const viewTitles: Record<ViewType, string> = {
  dashboard: "Dashboard",
  email: "Email",
  tasks: "Tasks",
  chat: "Chat",
  custom: "Channel",
  memory: "Memory",
  "kora-tasks": "My Tasks",
  integrations: "Integrations",
  payables: "Payables",
  business: "Deals",
};

// Map views to their chat context (email and deals share context)
const viewToChatContext: Record<ViewType, ChatContext> = {
  dashboard: "dashboard",
  email: "email",
  tasks: "tasks",
  chat: "general",
  custom: "general",
  memory: "memory",
  "kora-tasks": "tasks",
  integrations: "integrations",
  payables: "payables",
  business: "email", // Deals uses same chat as email (deals come from emails)
};

function HomeContent() {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [focusedItem, setFocusedItem] = useState<FocusedItem | null>(null);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [activeCustomChannelId, setActiveCustomChannelId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [previewEmailIds, setPreviewEmailIds] = useState<string[]>([]);
  const [emailRefreshTrigger, setEmailRefreshTrigger] = useState(0);
  const [activeEmailAccount, setActiveEmailAccount] = useState<string>("");
  const searchParams = useSearchParams();
  
  // Callbacks for chat to control email view
  const handlePreviewEmails = useCallback((ids: string[]) => {
    setPreviewEmailIds(ids);
  }, []);
  
  const handleRefreshEmails = useCallback(() => {
    setEmailRefreshTrigger(prev => prev + 1);
    setPreviewEmailIds([]); // Clear preview after refresh
  }, []);
  
  const handleActiveAccountChange = useCallback((account: string) => {
    setActiveEmailAccount(account);
  }, []);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const channelParam = searchParams.get("channelId");
    if (viewParam && viewOptions.includes(viewParam as ViewType)) {
      setActiveView(viewParam as ViewType);
    }
    if (channelParam) {
      setActiveCustomChannelId(channelParam);
    }
  }, [searchParams]);

  const refreshCustomChannels = useCallback(async () => {
    const channels = await listCustomChannels();
    setCustomChannels(channels);
    if (channels.length && !activeCustomChannelId) {
      setActiveCustomChannelId(channels[0].id);
    }
  }, [activeCustomChannelId]);

  useEffect(() => {
    refreshCustomChannels();
    const unsubscribe = onCustomChannelsUpdated((channels) => {
      setCustomChannels(channels);
      if (channels.length && !activeCustomChannelId) {
        setActiveCustomChannelId(channels[0].id);
      }
    });
    return unsubscribe;
  }, [activeCustomChannelId, refreshCustomChannels]);

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveView} />;
      case "email":
        return (
          <ErrorBoundary name="EmailView">
            <EmailView
              focusedItem={focusedItem}
              onFocusItem={setFocusedItem}
              previewEmailIds={previewEmailIds}
              refreshTrigger={emailRefreshTrigger}
              onActiveAccountChange={handleActiveAccountChange}
            />
          </ErrorBoundary>
        );
      case "tasks":
        return (
          <ChannelView
            channel="tasks"
            title="✅ Tasks"
            focusedItem={focusedItem}
            onFocusItem={setFocusedItem}
          />
        );
      case "chat":
        return (
          <ChannelView
            channel="chat"
            title="💬 Main Chat"
            isChat
            focusedItem={focusedItem}
            onFocusItem={setFocusedItem}
          />
        );
      case "custom": {
        const activeChannel = customChannels.find((channel) => channel.id === activeCustomChannelId);
        return (
          <ChannelView
            channel="custom"
            title={activeChannel ? `${activeChannel.emoji} ${activeChannel.name}` : "✨ Custom Channel"}
            customChannel={activeChannel ?? null}
            focusedItem={focusedItem}
            onFocusItem={setFocusedItem}
          />
        );
      }
      case "memory":
        return <MemoryBrowser />;
      case "kora-tasks":
        return <KoraTasks />;
      case "integrations":
        return <Integrations />;
      case "business":
        return <DealsView />;
      default:
        return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== "custom") {
            setActiveCustomChannelId(null);
          }
        }}
        customChannels={customChannels}
        activeCustomChannelId={activeCustomChannelId}
        onSelectCustomChannel={(channelId) => {
          setActiveCustomChannelId(channelId);
          setActiveView("custom");
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 p-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Avatar size="sm" />
            <span className="font-semibold">{viewTitles[activeView]}</span>
          </div>
        </header>

        {/* Top: Current View - shrink when mobile chat is open */}
        <main className={`overflow-auto min-h-0 ${mobileChatOpen ? "flex-1 h-[50%]" : "flex-1"}`}>
          {renderView()}
        </main>

        {/* Mobile Chat - bottom half when open */}
        {mobileChatOpen && !chatFullscreen && (
          <div className="md:hidden h-[50%] border-t border-zinc-800">
            <InlineChat
              focusedItem={focusedItem}
              onClearFocus={() => setFocusedItem(null)}
              chatContext={viewToChatContext[activeView]}
              isCollapsed={false}
              onToggleCollapse={() => setMobileChatOpen(false)}
              isFullscreen={false}
              onToggleFullscreen={() => setChatFullscreen(true)}
              onPreviewEmails={activeView === "email" ? handlePreviewEmails : undefined}
              onRefreshEmails={activeView === "email" ? handleRefreshEmails : undefined}
              activeEmailAccount={activeView === "email" ? activeEmailAccount : undefined}
            />
          </div>
        )}

        {/* Desktop: Persistent Chat - always visible */}
        {!chatFullscreen && (
          <div className={`hidden md:block border-t border-zinc-800 transition-all ${chatCollapsed ? "h-auto" : "h-[40%] min-h-[250px] max-h-[350px]"}`}>
            <InlineChat
              focusedItem={focusedItem}
              onClearFocus={() => setFocusedItem(null)}
              chatContext={viewToChatContext[activeView]}
              isCollapsed={chatCollapsed}
              onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
              isFullscreen={false}
              onToggleFullscreen={() => setChatFullscreen(true)}
              onPreviewEmails={activeView === "email" ? handlePreviewEmails : undefined}
              onRefreshEmails={activeView === "email" ? handleRefreshEmails : undefined}
              activeEmailAccount={activeView === "email" ? activeEmailAccount : undefined}
            />
          </div>
        )}

        {/* Fullscreen Chat Overlay */}
        {chatFullscreen && (
          <div className="fixed inset-0 z-50">
            <InlineChat
              focusedItem={focusedItem}
              onClearFocus={() => setFocusedItem(null)}
              chatContext={viewToChatContext[activeView]}
              isCollapsed={false}
              onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
              isFullscreen={true}
              onToggleFullscreen={() => setChatFullscreen(false)}
              onPreviewEmails={activeView === "email" ? handlePreviewEmails : undefined}
              onRefreshEmails={activeView === "email" ? handleRefreshEmails : undefined}
              activeEmailAccount={activeView === "email" ? activeEmailAccount : undefined}
            />
          </div>
        )}
      </div>

      {/* Mobile Chat FAB - hidden when chat is open */}
      {!mobileChatOpen && !chatFullscreen && (
        <button
          className="md:hidden fixed bottom-4 right-4 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-2xl z-30"
          onClick={() => setMobileChatOpen(true)}
        >
          💬
        </button>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
