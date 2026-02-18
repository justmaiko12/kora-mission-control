"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ContextBadge from "@/components/ContextBadge";
import Avatar from "@/components/Avatar";
import { FocusedItem } from "@/lib/types";
import { ChannelSuggestion, createCustomChannel } from "@/lib/channelStorage";
import { getSettings, onSettingsChange, AppSettings } from "@/lib/settings";

// Chat context types - each view can have its own chat
export type ChatContext = "dashboard" | "email" | "deals" | "tasks" | "memory" | "integrations" | "payables" | "general";

interface PreviewAction {
  emails: Array<{ id: string; subject: string; from: string }>;
  command: unknown;
  account: string;
  actionType: string;
  query: string;
}

interface InlineChatProps {
  focusedItem: FocusedItem | null;
  onClearFocus: () => void;
  chatContext?: ChatContext; // Which view's chat this is
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onPreviewEmails?: (emailIds: string[]) => void; // Highlight emails in list
  onRefreshEmails?: () => void; // Trigger email list refresh
  activeEmailAccount?: string; // Current email account tab
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

export default function InlineChat({ 
  focusedItem, 
  onClearFocus, 
  chatContext = "general",
  isCollapsed = false,
  onToggleCollapse,
  isFullscreen = false,
  onToggleFullscreen,
  onPreviewEmails,
  onRefreshEmails,
  activeEmailAccount,
}: InlineChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pendingAction, setPendingAction] = useState<PreviewAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevContextRef = useRef<ChatContext>(chatContext);

  // Initialize messages for this context - only run when context changes
  useEffect(() => {
    // Save current messages to store before switching
    if (prevContextRef.current !== chatContext) {
      // Save previous context messages
      const currentMessages = messageStore[prevContextRef.current];
      if (currentMessages && currentMessages.length > 0) {
        // Already saved via the other effect
      }
      prevContextRef.current = chatContext;
    }

    // Load messages for new context
    const storedMessages = messageStore[chatContext];
    if (storedMessages && storedMessages.length > 0) {
      setMessages([...storedMessages]); // Create new array to avoid reference issues
    } else {
      // Initialize with welcome message
      const welcomeMsg = {
        id: `welcome-${chatContext}`,
        content: welcomeMessages[chatContext],
        sender: "kora" as const,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
      messageStore[chatContext] = [welcomeMsg];
    }
  }, [chatContext]); // Only depend on chatContext, not messages

  // Save messages to store when they change (separate effect)
  useEffect(() => {
    if (messages.length > 0 && messages[0]?.id !== `welcome-${chatContext}` || messages.length > 1) {
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
            metadata: focusedItem.metadata,
          } : null,
          chatContext,
          activeAccount: activeEmailAccount, // Pass current email account tab
        }),
      });

      const data = await res.json();
      const result = data.result;
      
      // Ensure response is always a string
      const safeResponse = (val: unknown): string => {
        if (val === null || val === undefined) return "";
        if (typeof val === "string") return val;
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      };
      
      // Check if this is a preview response
      if (result?.previewOnly && result?.emails?.length > 0) {
        // Highlight the emails
        if (onPreviewEmails) {
          onPreviewEmails(result.emails.map((e: { id: string }) => e.id));
        }
        
        // Store pending action for confirm/cancel
        setPendingAction({
          emails: result.emails,
          command: result.command,
          account: result.account,
          actionType: result.actionType,
          query: result.query,
        });
        
        const koraMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Found ${result.emails.length} emails matching "${result.query}":\n\n${result.emails.slice(0, 5).map((e: { subject: string }) => `• ${e.subject}`).join("\n")}${result.emails.length > 5 ? `\n...and ${result.emails.length - 5} more` : ""}\n\n⚠️ Confirm to ${result.actionType} these emails?`,
          sender: "kora",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, koraMessage]);
      } else {
        // Regular response or completed action - ensure string
        const response = safeResponse(data.response) || safeResponse(data.error) || "Done!";
        
        // If action was executed, refresh the email list
        if (result?.refresh && onRefreshEmails) {
          onRefreshEmails();
        }
        
        const koraMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response,
          sender: "kora",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, koraMessage]);
      }
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
  }, [input, isLoading, focusedItem, chatContext, onPreviewEmails, onRefreshEmails]);

  // Handle confirm action
  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/openclaw/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: pendingAction.command,
          account: pendingAction.account,
        }),
      });
      
      const data = await res.json();
      
      // Clear preview highlights
      if (onPreviewEmails) {
        onPreviewEmails([]);
      }
      
      // Refresh email list
      if (onRefreshEmails) {
        onRefreshEmails();
      }
      
      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || `✅ ${pendingAction.actionType}d ${pendingAction.emails.length} emails`,
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
      setPendingAction(null);
    } catch (err) {
      console.error("Confirm error:", err);
      const koraMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Failed to execute action. Please try again.",
        sender: "kora",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, koraMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [pendingAction, onPreviewEmails, onRefreshEmails]);

  // Handle cancel action
  const handleCancel = useCallback(() => {
    // Clear preview highlights
    if (onPreviewEmails) {
      onPreviewEmails([]);
    }
    
    const koraMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "Cancelled. No emails were affected.",
      sender: "kora",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, koraMessage]);
    setPendingAction(null);
  }, [onPreviewEmails]);

  // Collapsed view - just the header bar
  if (isCollapsed) {
    return (
      <div className="bg-zinc-950 border-t border-zinc-800">
        <div className="px-4 py-2 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Avatar size="sm" />
            <div>
              <h3 className="font-medium text-sm">{chatTitles[chatContext]}</h3>
              <p className="text-[10px] text-green-500">● Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {focusedItem && (
              <ContextBadge item={focusedItem} onClear={onClearFocus} compact />
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Expand chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-zinc-950 ${isFullscreen ? "fixed inset-0 z-50" : "h-full"}`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Avatar size="sm" />
          <div>
            <h3 className="font-medium text-sm">{chatTitles[chatContext]}</h3>
            <p className="text-[10px] text-green-500">
              ● Online
              {chatContext === "email" && activeEmailAccount && (
                <span className="text-zinc-500 ml-1">· {activeEmailAccount.split("@")[0]}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {focusedItem && (
            <ContextBadge item={focusedItem} onClear={onClearFocus} compact />
          )}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
          {onToggleCollapse && !isFullscreen && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title="Collapse chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
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
                  Re: {typeof message.context.title === "string" ? message.context.title : String(message.context.title || "")}
                </p>
              )}
              {typeof message.content === "string" ? message.content : String(message.content || "")}
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

      {/* Input or Confirm/Cancel */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
        {pendingAction ? (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
            >
              {isLoading ? "Processing..." : `Yes, ${pendingAction.actionType} ${pendingAction.emails.length} emails`}
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
