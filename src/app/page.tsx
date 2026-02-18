"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChannelView from "@/components/ChannelView";
import MemoryBrowser from "@/components/MemoryBrowser";
import KoraTasks from "@/components/KoraTasks";
import Integrations from "@/components/Integrations";
import InlineChat from "@/components/InlineChat";
import EmailView from "@/components/EmailView";
import DealsView from "@/components/DealsView";
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

function HomeContent() {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
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
        // Full-page chat mode (legacy, redirects focus to inline)
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

      {/* Main Content Area - Split Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top: Current View */}
        <main className="flex-1 overflow-auto min-h-0">
          {renderView()}
        </main>

        {/* Bottom: Persistent Chat */}
        <div className="h-[45%] min-h-[280px] max-h-[400px] border-t border-zinc-800">
          <InlineChat
            focusedItem={focusedItem}
            onClearFocus={() => setFocusedItem(null)}
          />
        </div>
      </div>
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
