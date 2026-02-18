"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ContextBadge from "@/components/ContextBadge";
import Avatar from "@/components/Avatar";
import { FocusedItem } from "@/lib/types";
import { ChannelSuggestion, createCustomChannel } from "@/lib/channelStorage";
import { getSettings, onSettingsChange, AppSettings } from "@/lib/settings";

// Chat context types - each view can have its own chat
export type ChatContext = "dashboard" | "email" | "deals" | "tasks" | "memory" | "integrations" | "payables" | "general";

interface InlineChatProps {
  focusedItem: FocusedItem | null;
  onClearFocus: () => void;
  chatContext?: ChatContext; // Which view's chat this is
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "kora";
  timestamp: Date;
  context?: FocusedItem | null;
}

// Context-specific welcome messages
const welcomeMessages: Record<ChatContext, string> = {
  dashboard: "Hey! This is your dashboard chat. Ask me about your day, priorities, or anything you need help with.",
  email: "Email assistant ready! Click any email to focus on it, then ask me to draft a reply, summarize, or help you respond.",
  deals: "Deals chat here. I can help you draft rate cards, follow up on leads, or manage your pipeline.",
  tasks: "Task chat active. Ask me to add tasks, update status, or help you prioritize what to work on.",
  memory: "Memory browser chat. Ask me about anything in my memory files or help you find specific information.",
  integrations: "Integrations chat. I can help you understand what's connected and troubleshoot any issues.",
  payables: "Payables chat. Ask me about pending invoices, payment status, or help you track what's due.",
  general: "Hey! I'm here if you need anything. What can I help you with?",
};

// Context-specific chat titles
const chatTitles: Record<ChatContext, string> = {
  dashboard: "Dashboard Chat",
  email: "Email Assistant",
  deals: "Deals Assistant",
  tasks: "Tasks Chat",
  memory: "Memory Chat",
  integrations: "Integrations",
  payables: "Payables Chat",
  general: "Chat",
};

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
    name: topic.charAt(0).toUpperCase() + topic.slice(1),
    emoji: emojiKey ? emojiMap[emojiKey] : "✨",
    filter: {
      type: "keyword",
      value: keyword,
      sources: usesEmailOnly ? ["email"] : ["email", "tasks"],
    },
  };
};

// Store messages per context in memory (could be localStorage for persistence)
const messageStore: Record<ChatContext, Message[]> = {
  dashboard: [],
  email: [],
  deals: [],
  tasks: [],
  memory: [],
  integrations: [],
  payables: [],
  general: [],
};

export default function InlineChat({ focusedItem, onClearFocus, chatContext = "general" }: InlineChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevContextRef = useRef<ChatContext>(chatContext);

  // Initialize messages for this context
  useEffect(() => {
    // Save current messages to store before switching
    if (prevContextRef.current !== chatContext && messages.length > 0) {
      messageStore[prevContextRef.current] = messages;
    }
    prevContextRef.current = chatContext;

    // Load messages for new context
    const storedMessages = messageStore[chatContext];
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    } else {
      // Initialize with welcome message
      setMessages([
        {
          id: `welcome-${chatContext}`,
          content: welcomeMessages[chatContext],
          sender: "kora",
          timestamp: new Date(),
        },
      ]);
    }
  }, [chatContext, messages]);

  // Save messages to store when they change
  useEffect(() => {
    if (messages.length > 0) {
      messageStore[chatContext] = messages;
    }
  }, [messages, chatContext]);

  // Load settings
  useEffect(() => {
    setSettings(getSettings());
    return onSettingsChange(setSettings);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
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
        content: `Done! I created a "${channelSuggestion.name}" channel ${channelSuggestion.emoji}. Check the sidebar!`,
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
      setIsLoading(false);
      return;
    }

    // Simulate context-aware response (TODO: integrate with OpenClaw)
    setTimeout(() => {
      let response = "";
      
      if (focusedItem) {
        response = `Got it — you're asking about "${focusedItem.title}". Full OpenClaw integration coming soon! 🦞`;
      } else {
        // Context-aware responses
        switch (chatContext) {
          case "email":
            response = "I can help you with emails! Click an email to focus on it, then ask me to draft a reply or summarize it.";
            break;
          case "deals":
            response = "Need help with a deal? Select one from the pipeline and I can help draft rates or follow-ups.";
            break;
          case "tasks":
            response = "I can help manage tasks! Try 'add task: [description]' or ask me to prioritize your list.";
            break;
          default:
            response = "I hear you! Full chat integration coming soon. 🦞";
        }
      }

      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
      setIsLoading(false);
    }, 800);
  }, [input, isLoading, focusedItem, chatContext]);

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Avatar size="sm" />
          <div>
            <h3 className="font-medium text-sm">{chatTitles[chatContext]}</h3>
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
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-400 px-3 py-2 rounded-xl rounded-bl-sm text-sm animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={focusedItem ? `Ask about "${focusedItem.title}"...` : `Message ${chatTitles[chatContext]}...`}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
