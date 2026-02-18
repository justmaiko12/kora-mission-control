"use client";

import { useState } from "react";
import ContextBadge from "@/components/ContextBadge";
import { FocusedItem } from "@/lib/types";
import { ChannelSuggestion, createCustomChannel } from "@/lib/channelStorage";

interface ChatPanelProps {
  onClose: () => void;
  focusedItem: FocusedItem | null;
  onClearFocus: () => void;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "kora";
  timestamp: Date;
  context?: FocusedItem | null;
}

const emojiMap: Record<string, string> = {
  dance: "💃",
  invoice: "🧾",
  invoices: "🧾",
  brand: "✨",
  sponsorship: "🤝",
  analytics: "📈",
  contract: "📄",
};

const parseChannelCommand = (input: string): ChannelSuggestion | null => {
  const lower = input.toLowerCase();
  const createMatch = /(create|make|add)\s+(a\s+)?(channel|view)/.test(lower);
  const wantMatch = /(i want|i need).*(view|channel)/.test(lower);
  if (!createMatch && !wantMatch) return null;

  let topic = "";
  const forMatch = input.match(/(?:for|about|called|named)\s+(.+)/i);
  if (forMatch?.[1]) {
    topic = forMatch[1].replace(/[.?!]+$/, "").trim();
  }
  if (!topic) {
    topic = input.replace(/create|make|add|channel|view|for|about|called|named/gi, "").trim();
  }
  if (!topic) return null;

  const keyword = topic.split(" ").slice(0, 3).join(" ");
  const usesEmailOnly = /email|emails/.test(lower);
  const emojiKey = Object.keys(emojiMap).find((key) => keyword.toLowerCase().includes(key));
  return {
    name: topic.replace(/(^\w)/, (match) => match.toUpperCase()),
    emoji: emojiKey ? emojiMap[emojiKey] : "✨",
    filter: {
      type: "keyword",
      value: keyword,
      sources: usesEmailOnly ? ["email"] : ["email", "tasks"],
    },
  };
};

export default function ChatPanel({ onClose, focusedItem, onClearFocus }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hey Michael! How can I help you?",
      sender: "kora",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
      context: focusedItem,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const channelSuggestion = parseChannelCommand(userMessage.content);
    if (channelSuggestion) {
      await createCustomChannel(channelSuggestion);
      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'll create the "${channelSuggestion.name}" channel for you! ${channelSuggestion.emoji}`,
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
      setIsLoading(false);
      return;
    }

    // Call the chat API
    try {
      const res = await fetch("/api/openclaw/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: focusedItem ? {
            type: focusedItem.type,
            id: focusedItem.id,
            title: focusedItem.title,
          } : null,
        }),
      });

      const data = await res.json();
      const response = data.response || data.error || "I received your message!";

      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I had trouble processing that. Please try again!",
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            🦞
          </div>
          <div>
            <h3 className="font-semibold">Kora</h3>
            <p className="text-xs text-green-500">● Online</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {focusedItem && <ContextBadge item={focusedItem} onClear={onClearFocus} />}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                message.sender === "user"
                  ? "bg-indigo-600 text-white rounded-br-md"
                  : "bg-zinc-800 text-zinc-200 rounded-bl-md"
              }`}
            >
              {message.context && (
                <p className="text-[11px] uppercase tracking-wide opacity-70 mb-1">
                  Regarding {message.context.title}
                </p>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-200 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
