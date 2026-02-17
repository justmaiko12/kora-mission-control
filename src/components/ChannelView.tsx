"use client";

import { useState } from "react";

interface ChannelViewProps {
  channel: string;
  title: string;
  isChat?: boolean;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  type: "incoming" | "outgoing" | "system";
  read?: boolean;
}

const mockMessages: Record<string, Message[]> = {
  email: [
    { id: "1", content: "Brand deal inquiry from Nike - They're interested in a TikTok campaign", timestamp: "10:30 AM", type: "incoming", read: false },
    { id: "2", content: "Contract update from Sony - Final terms ready for review", timestamp: "9:15 AM", type: "incoming", read: false },
    { id: "3", content: "Weekly analytics report - Views up 23% this week", timestamp: "8:00 AM", type: "system", read: false },
    { id: "4", content: "WinterWhale team update - Asia campaign launched successfully", timestamp: "Yesterday", type: "incoming", read: true },
  ],
  tasks: [
    { id: "1", content: "🔴 Anthony's edit needs review - Due in 2 hours", timestamp: "Just now", type: "system", read: false },
    { id: "2", content: "🟡 Content due for @shluv TikTok - Dance tutorial", timestamp: "1 hour ago", type: "system", read: false },
    { id: "3", content: "🟡 Kreatrix bug #142 - UI glitch on mobile reported", timestamp: "2 hours ago", type: "system", read: false },
    { id: "4", content: "✅ Morning briefing sent to Telegram", timestamp: "8:00 AM", type: "system", read: true },
    { id: "5", content: "🟢 Editor task ping automation completed", timestamp: "Yesterday", type: "system", read: true },
  ],
  business: [
    { id: "1", content: "💰 WinterWhale deal - Joan confirms $50K sponsorship from Chinese brand", timestamp: "2 hours ago", type: "incoming", read: false },
    { id: "2", content: "📋 New sponsorship opportunity - Gaming headset company reaching out", timestamp: "Yesterday", type: "incoming", read: false },
    { id: "3", content: "Contract signed with RedBull for March campaign", timestamp: "2 days ago", type: "system", read: true },
  ],
  chat: [
    { id: "1", content: "Hey Michael! The Kora Mission Control is now live. What would you like to work on?", timestamp: "Just now", type: "incoming" },
    { id: "2", content: "I've set up all the channel views. You can now see Email, Tasks, and Business separately!", timestamp: "Just now", type: "incoming" },
  ],
};

export default function ChannelView({ channel, title, isChat = false }: ChannelViewProps) {
  const [input, setInput] = useState("");
  const messages = mockMessages[channel] || [];

  const handleSend = () => {
    if (!input.trim()) return;
    // TODO: Integrate with OpenClaw
    console.log("Sending:", input);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-zinc-500">
            {messages.filter(m => !m.read).length} unread items
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            Mark all read
          </button>
          <button className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            Filter
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-xl border transition-all ${
              message.read
                ? "bg-zinc-900/30 border-zinc-800/50 opacity-60"
                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            } ${message.type === "outgoing" ? "ml-12" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className={`flex-1 ${message.read ? "text-zinc-400" : "text-zinc-200"}`}>
                {message.content}
              </p>
              {!message.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-2">{message.timestamp}</p>
          </div>
        ))}
      </div>

      {/* Input (for chat channels) */}
      {isChat && (
        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message to Kora..."
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={handleSend}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}