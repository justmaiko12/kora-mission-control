"use client";

import { useState, useRef, useEffect } from "react";
import ContextBadge from "@/components/ContextBadge";
import { FocusedItem } from "@/lib/types";
import { ChannelSuggestion, createCustomChannel } from "@/lib/channelStorage";

interface InlineChatProps {
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

export default function InlineChat({ focusedItem, onClearFocus }: InlineChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hey! I'm here if you need anything. Click any email to focus on it, or just ask me questions.",
      sender: "kora",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        content: `Created "${channelSuggestion.name}" channel! ${channelSuggestion.emoji} Check the sidebar.`,
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
      setIsLoading(false);
      return;
    }

    // Simulate response (TODO: integrate with OpenClaw)
    setTimeout(() => {
      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: focusedItem
          ? `Got it — focusing on "${focusedItem.title}". What do you need?`
          : "I hear you! Full chat integration coming soon. 🦞",
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
            🦞
          </div>
          <div>
            <h3 className="font-medium text-sm">Kora</h3>
            <p className="text-[10px] text-green-500">● Online</p>
          </div>
        </div>
        {focusedItem && (
          <ContextBadge item={focusedItem} onClear={onClearFocus} compact />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                message.sender === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
              }`}
            >
              {message.context && (
                <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
                  Re: {message.context.title}
                </p>
              )}
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-200 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={focusedItem ? `Ask about "${focusedItem.title}"...` : "Type a message..."}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
