"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChannelView from "@/components/ChannelView";
import MemoryBrowser from "@/components/MemoryBrowser";
import KoraTasks from "@/components/KoraTasks";
import Integrations from "@/components/Integrations";
import ChatPanel from "@/components/ChatPanel";
import EmailView from "@/components/EmailView";
import Dashboard from "@/components/Dashboard";
import { FocusedItem } from "@/lib/types";
import { CustomChannel, listCustomChannels, onCustomChannelsUpdated } from "@/lib/channelStorage";

export type ViewType =
  | "dashboard"
  | "email"
  | "tasks"
  | "chat"
  | "custom"
  | "memory"
  | "kora-tasks"
  | "integrations"
  | "payables";

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
];

function HomeContent() {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [focusedItem, setFocusedItem] = useState<FocusedItem | null>(null);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [activeCustomChannelId, setActiveCustomChannelId] = useState<string | null>(null);
  const searchParams = useSearchParams();

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
          <EmailView
            focusedItem={focusedItem}
            onFocusItem={setFocusedItem}
          />
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
      default:
        return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
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
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>

      {/* Floating Chat Button */}
      {activeView !== "chat" && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all z-50"
        >
          💬
        </button>
      )}

      {/* Floating Chat Panel */}
      {isChatOpen && activeView !== "chat" && (
        <ChatPanel
          onClose={() => setIsChatOpen(false)}
          focusedItem={focusedItem}
          onClearFocus={() => setFocusedItem(null)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
