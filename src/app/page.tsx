"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChannelView from "@/components/ChannelView";
import MemoryBrowser from "@/components/MemoryBrowser";
import KoraTasks from "@/components/KoraTasks";
import Integrations from "@/components/Integrations";
import ActivityFeed from "@/components/ActivityFeed";
import EmailView from "@/components/EmailView";
import DealsView from "@/components/DealsView";
import Dashboard from "@/components/Dashboard";
import ActivityView from "@/components/ActivityView";
import AutomationsView from "@/components/AutomationsView";
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
  | "kora-activity"
  | "automations"
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
  "kora-activity",
  "automations",
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
  "kora-activity": "Activity",
  automations: "Automations",
  integrations: "Integrations",
  payables: "Payables",
  business: "Deals",
};

// Map views to their activity context
const viewToActivityContext: Record<ViewType, string> = {
  dashboard: "general",
  email: "email",
  tasks: "tasks",
  chat: "general",
  custom: "general",
  memory: "general",
  "kora-tasks": "general",
  "kora-activity": "general",
  automations: "automations",
  integrations: "integrations",
  payables: "payables",
  business: "deals",
};

function HomeContent() {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [focusedItem, setFocusedItem] = useState<FocusedItem | null>(null);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [activeCustomChannelId, setActiveCustomChannelId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true); // Start minimized
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [previewEmailIds, setPreviewEmailIds] = useState<string[]>([]);
  const [emailRefreshTrigger, setEmailRefreshTrigger] = useState(0);
  const [activeEmailAccount, setActiveEmailAccount] = useState<string>("");
  const [visibleEmails, setVisibleEmails] = useState<Array<{ from: string; subject: string; id: string }>>([]);
  const [navigateToEmailId, setNavigateToEmailId] = useState<string | null>(null);
  const [navigateToEmailAccount, setNavigateToEmailAccount] = useState<string | null>(null);
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
  
  // Navigate to a specific email from another view (e.g., Deals)
  const handleNavigateToEmail = useCallback((emailId: string, account: string) => {
    setNavigateToEmailId(emailId);
    setNavigateToEmailAccount(account);
    setActiveView("email");
  }, []);
  
  const handleVisibleEmailsChange = useCallback((emails: Array<{ from: string; subject: string; id: string }>) => {
    setVisibleEmails(emails);
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
              onVisibleEmailsChange={handleVisibleEmailsChange}
              navigateToEmailId={navigateToEmailId}
              navigateToEmailAccount={navigateToEmailAccount}
              onNavigationComplete={() => {
                setNavigateToEmailId(null);
                setNavigateToEmailAccount(null);
              }}
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
      case "kora-activity":
        return <ActivityView />;
      case "automations":
        return <AutomationsView />;
      case "integrations":
        return <Integrations />;
      case "business":
        return <DealsView onNavigateToEmail={handleNavigateToEmail} />;
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
          console.log('[Page] onNavigate called with:', view, 'current activeView:', activeView);
          setActiveView(view);
          console.log('[Page] setActiveView called');
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-0">
        {/* Mobile Header - hidden on email view (email has its own header) */}
        {activeView !== "email" && (
          <header className="lg:hidden flex items-center gap-3 p-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors touch-manipulation"
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
        )}
        
        {/* Email View Mobile Header - just hamburger */}
        {activeView === "email" && (
          <header className="lg:hidden flex items-center gap-2 p-2 border-b border-zinc-800 bg-zinc-950 relative z-[150]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors touch-manipulation flex-shrink-0 relative z-[151]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>
        )}

        {/* Top: Current View - shrink when mobile chat is open */}
        <main className={`overflow-auto min-h-0 ${mobileChatOpen ? "flex-1 h-[50%]" : "flex-1"}`}>
          {renderView()}
        </main>

        {/* Mobile Activity Feed - bottom half when open (hide on Activity/Automations tabs) */}
        {mobileChatOpen && activeView !== "kora-activity" && activeView !== "automations" && (
          <div className="md:hidden h-[50%] border-t border-zinc-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <span className="font-semibold text-sm">Activity</span>
              <button
                onClick={() => setMobileChatOpen(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary name="MobileActivity">
                <ActivityFeed
                  context={viewToActivityContext[activeView]}
                  onCommand={() => handleRefreshEmails()}
                  emailAccount={activeView === "email" ? activeEmailAccount : undefined}
                  visibleEmails={activeView === "email" ? visibleEmails : undefined}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Desktop: Persistent Activity Feed (hide on Activity/Automations tabs) */}
        <div className={`hidden ${activeView === "kora-activity" || activeView === "automations" ? "" : "md:block"} border-t border-zinc-800 transition-all ${chatCollapsed ? "h-12" : "h-[35%] min-h-[200px] max-h-[300px]"}`}>
          {chatCollapsed ? (
            <button
              onClick={() => setChatCollapsed(false)}
              className="w-full h-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-colors"
            >
              <span>📋</span>
              <span className="text-sm">Activity & Commands</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-end px-4 py-1 border-b border-zinc-800/50">
                <button
                  onClick={() => setChatCollapsed(true)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
                  title="Collapse"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary name="DesktopActivity">
                  <ActivityFeed
                    context={viewToActivityContext[activeView]}
                    onCommand={() => handleRefreshEmails()}
                    emailAccount={activeView === "email" ? activeEmailAccount : undefined}
                    visibleEmails={activeView === "email" ? visibleEmails : undefined}
                  />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Activity FAB - hidden when panel is open or on Activity/Automations tabs */}
      {!mobileChatOpen && activeView !== "kora-activity" && activeView !== "automations" && (
        <button
          className="md:hidden fixed bottom-4 right-4 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-2xl z-30"
          onClick={() => setMobileChatOpen(true)}
        >
          📋
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
