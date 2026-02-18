"use client";

import { useEffect, useState } from "react";
import { EmailThread } from "@/lib/useEmails";

interface EmailDetailProps {
  email: EmailThread;
  account: string;
  onClose: () => void;
  onMarkAsDeal: (e: React.MouseEvent) => void;
  onMarkAsRequest: (e: React.MouseEvent) => void;
  isMarking: boolean;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}

export default function EmailDetail({
  email,
  account,
  onClose,
  onMarkAsDeal,
  onMarkAsRequest,
  isMarking,
}: EmailDetailProps) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThread() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/emails/thread?id=${encodeURIComponent(email.id)}&account=${encodeURIComponent(account)}`
        );
        if (!res.ok) throw new Error("Failed to fetch thread");
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load email");
      } finally {
        setLoading(false);
      }
    }
    fetchThread();
  }, [email.id, account]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr.replace(" ", "T"));
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const extractName = (from: string) => {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim() : from;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
            >
              ← 
            </button>
            <h2 className="text-lg font-semibold truncate">{email.subject || "(no subject)"}</h2>
          </div>
          <p className="text-sm text-zinc-400">{extractName(email.from)}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {email.messageCount} message{email.messageCount !== 1 ? "s" : ""} in thread
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onMarkAsDeal}
            disabled={isMarking}
            className="px-3 py-1.5 text-sm bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            💰 Deal
          </button>
          <button
            onClick={onMarkAsRequest}
            disabled={isMarking}
            className="px-3 py-1.5 text-sm bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
          >
            📋 Request
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-zinc-500 animate-pulse">Loading email...</div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="text-zinc-500 text-center py-8">
            No messages found
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              {/* Message Header */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{extractName(msg.from)}</p>
                    <p className="text-xs text-zinc-500 truncate">to {msg.to}</p>
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatDate(msg.date)}
                  </span>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-4">
                {msg.bodyHtml ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none 
                      prose-p:my-2 prose-p:leading-relaxed
                      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                      prose-img:max-w-full prose-img:rounded-lg
                      prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400
                      [&_*]:text-sm"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.bodyHtml) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                    {msg.body}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reply Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Quick reply... (coming soon)"
            disabled
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />
          <button
            disabled
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

// Basic HTML sanitization (remove scripts, on* attributes)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
}
