"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChannelView from "@/components/ChannelView";
import MemoryBrowser from "@/components/MemoryBrowser";
import KoraTasks from "@/components/KoraTasks";
import Integrations from "@/components/Integrations";
import ChatPanel from "@/components/ChatPanel";
import Dashboard from "@/components/Dashboard";

export type ViewType = "dashboard" | "email" | "tasks" | "business" | "chat" | "memory" | "kora-tasks" | "integrations";

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveView} />;
      case "email":
        return <ChannelView channel="email" title="📧 Email" />;
      case "tasks":
        return <ChannelView channel="tasks" title="✅ Tasks" />;
      case "business":
        return <ChannelView channel="business" title="💼 Business & Promos" />;
      case "chat":
        return <ChannelView channel="chat" title="💬 Main Chat" isChat />;
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
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

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
        <ChatPanel onClose={() => setIsChatOpen(false)} />
      )}
    </div>
  );
}