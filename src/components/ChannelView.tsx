"use client";

import { useMemo, useState } from "react";
import EmailTabs from "@/components/EmailTabs";
import { FocusedItem } from "@/lib/types";
import { CustomChannel } from "@/lib/channelStorage";

interface ChannelViewProps {
  channel: "email" | "tasks" | "chat" | "custom";
  title: string;
  isChat?: boolean;
  focusedItem?: FocusedItem | null;
  onFocusItem?: (item: FocusedItem) => void;
  customChannel?: CustomChannel | null;
}

interface ChannelItem {
  id: string;
  title: string;
  preview?: string;
  timestamp: string;
  type?: "incoming" | "outgoing" | "system";
  read?: boolean;
  source: "email" | "tasks" | "chat";
  metadata?: Record<string, unknown>;
}

interface EmailAccount {
  id: string;
  email: string;
  name: string;
  provider: "gmail" | "outlook" | "other";
  unreadCount: number;
}

const emailAccounts: EmailAccount[] = [
  { id: "acct-1", email: "michael@shluv.com", name: "Shluv", provider: "gmail", unreadCount: 3 },
  { id: "acct-2", email: "personal@gmail.com", name: "Personal", provider: "gmail", unreadCount: 2 },
];

const emailItems: ChannelItem[] = [
  {
    id: "email-1",
    title: "Brand deal inquiry from Nike",
    preview: "brand@nike.com • They're interested in a TikTok campaign",
    timestamp: "10:30 AM",
    read: false,
    source: "email",
    metadata: { accountId: "acct-1", sender: "brand@nike.com" },
  },
  {
    id: "email-2",
    title: "Contract update from Sony",
    preview: "legal@sony.com • Final terms ready for review",
    timestamp: "9:15 AM",
    read: false,
    source: "email",
    metadata: { accountId: "acct-1", sender: "legal@sony.com" },
  },
  {
    id: "email-3",
    title: "Weekly analytics report",
    preview: "analytics@tiktok.com • Views up 23% this week",
    timestamp: "8:00 AM",
    read: false,
    source: "email",
    metadata: { accountId: "acct-2", sender: "analytics@tiktok.com" },
  },
  {
    id: "email-4",
    title: "WinterWhale team update",
    preview: "ops@winterwhale.com • Asia campaign launched successfully",
    timestamp: "Yesterday",
    read: true,
    source: "email",
    metadata: { accountId: "acct-2", sender: "ops@winterwhale.com" },
  },
];

const taskItems: ChannelItem[] = [
  {
    id: "task-1",
    title: "🔴 Anthony's edit needs review - Due in 2 hours",
    timestamp: "Just now",
    read: false,
    source: "tasks",
    metadata: { priority: "high" },
  },
  {
    id: "task-2",
    title: "🟡 Content due for @shluv TikTok - Dance tutorial",
    timestamp: "1 hour ago",
    read: false,
    source: "tasks",
    metadata: { priority: "medium" },
  },
  {
    id: "task-3",
    title: "🟡 Kreatrix bug #142 - UI glitch on mobile reported",
    timestamp: "2 hours ago",
    read: false,
    source: "tasks",
    metadata: { priority: "medium" },
  },
  {
    id: "task-4",
    title: "✅ Morning briefing sent to Telegram",
    timestamp: "8:00 AM",
    read: true,
    source: "tasks",
    metadata: { priority: "low" },
  },
  {
    id: "task-5",
    title: "🟢 Editor task ping automation completed",
    timestamp: "Yesterday",
    read: true,
    source: "tasks",
    metadata: { priority: "low" },
  },
];

const chatItems: ChannelItem[] = [
  {
    id: "chat-1",
    title: "Hey Michael! The Kora Mission Control is now live. What would you like to work on?",
    timestamp: "Just now",
    type: "incoming",
    source: "chat",
  },
  {
    id: "chat-2",
    title: "I've set up all the channel views. You can now see Email and Tasks separately!",
    timestamp: "Just now",
    type: "incoming",
    source: "chat",
  },
];

const matchesFilter = (item: ChannelItem, filter: CustomChannel["filter"]) => {
  const text = `${item.title} ${item.preview ?? ""}`.toLowerCase();
  const value = filter.value.toLowerCase();
  if (!filter.sources.includes(item.source)) {
    return false;
  }

  switch (filter.type) {
    case "keyword":
      return text.includes(value);
    case "sender":
      return `${item.metadata?.sender ?? ""}`.toLowerCase().includes(value);
    case "label":
      return Array.isArray(item.metadata?.labels)
        ? (item.metadata?.labels as string[]).some((label) => label.toLowerCase().includes(value))
        : false;
    case "custom":
      return text.includes(value);
    default:
      return false;
  }
};

export default function ChannelView({
  channel,
  title,
  isChat = false,
  focusedItem,
  onFocusItem,
  customChannel,
}: ChannelViewProps) {
  const [input, setInput] = useState("");
  const [activeAccount, setActiveAccount] = useState(emailAccounts[0]?.id ?? "");

  const messages = useMemo(() => {
    if (channel === "email") {
      return emailItems.filter((item) => item.metadata?.accountId === activeAccount);
    }
    if (channel === "tasks") {
      return taskItems;
    }
    if (channel === "custom") {
      if (!customChannel) return [];
      const combined = [...emailItems, ...taskItems];
      return combined.filter((item) => matchesFilter(item, customChannel.filter));
    }
    if (channel === "chat") {
      return chatItems;
    }
    return [];
  }, [activeAccount, channel, customChannel]);

  const handleSend = () => {
    if (!input.trim()) return;
    // TODO: Integrate with OpenClaw
    console.log("Sending:", input);
    setInput("");
  };

  const handleFocusItem = (item: ChannelItem) => {
    if (!onFocusItem) return;
    const itemType = item.source === "email" ? "email" : item.source === "tasks" ? "task" : "notification";
    onFocusItem({
      type: itemType,
      id: item.id,
      title: item.title,
      preview: item.preview ?? "",
      metadata: { ...item.metadata, source: item.source, timestamp: item.timestamp },
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1>
          <p className="text-xs md:text-sm text-zinc-500">
            {messages.filter((m) => !m.read).length} unread
          </p>
        </div>
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          <button className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            <span className="hidden sm:inline">Mark all </span>Read
          </button>
          <button className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            Filter
          </button>
        </div>
      </div>

      {channel === "email" && (
        <EmailTabs accounts={emailAccounts} activeAccount={activeAccount} onChange={setActiveAccount} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3">
        {channel === "custom" && !customChannel && (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
            No custom channel selected yet. Create one in chat to see filtered items here.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            role={onFocusItem ? "button" : undefined}
            tabIndex={onFocusItem ? 0 : -1}
            onClick={() => onFocusItem && handleFocusItem(message)}
            onKeyDown={(event) => {
              if (!onFocusItem) return;
              if (event.key === "Enter") {
                handleFocusItem(message);
              }
            }}
            className={`p-4 rounded-xl border transition-all focus:outline-none ${
              message.read
                ? "bg-zinc-900/30 border-zinc-800/50 opacity-60"
                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            } ${message.type === "outgoing" ? "ml-12" : ""} ${
              focusedItem?.id === message.id ? "ring-2 ring-indigo-500/70" : ""
            } ${onFocusItem ? "cursor-pointer hover:shadow-md" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className={`flex-1 ${message.read ? "text-zinc-400" : "text-zinc-200"}`}>
                {message.title}
              </p>
              {!message.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
              )}
            </div>
            {message.preview && (
              <p className="text-xs text-zinc-500 mt-2">
                {message.preview}
              </p>
            )}
            <p className="text-xs text-zinc-600 mt-2">{message.timestamp}</p>
          </div>
        ))}
      </div>

      {/* Input (for chat channels) */}
      {isChat && (
        <div className="p-3 md:p-4 border-t border-zinc-800">
          <div className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Kora..."
              className="flex-1 px-3 md:px-4 py-2 md:py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={handleSend}
              className="px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium text-sm transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
