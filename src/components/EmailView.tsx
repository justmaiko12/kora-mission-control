"use client";

import { useState } from "react";
import { useEmails, EmailThread } from "@/lib/useEmails";
import EmailTabs from "@/components/EmailTabs";
import { FocusedItem } from "@/lib/types";

interface EmailViewProps {
  focusedItem?: FocusedItem | null;
  onFocusItem?: (item: FocusedItem) => void;
}

export default function EmailView({ focusedItem, onFocusItem }: EmailViewProps) {
  const { accounts, emails, loading, error, activeAccount, setActiveAccount, refresh } =
    useEmails();
  const [markingDeal, setMarkingDeal] = useState<string | null>(null);

  const handleFocusItem = (email: EmailThread) => {
    if (!onFocusItem) return;
    onFocusItem({
      type: "email",
      id: email.id,
      title: email.subject,
      preview: `${email.from} • ${email.snippet || ""}`,
      metadata: {
        from: email.from,
        date: email.date,
        labels: email.labels,
        messageCount: email.messageCount,
        account: activeAccount,
      },
    });
  };

  const handleMarkAsDeal = async (e: React.MouseEvent, email: EmailThread) => {
    e.stopPropagation(); // Don't trigger focus
    setMarkingDeal(email.id);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: {
            id: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date,
            account: activeAccount,
            labels: email.labels,
            messageCount: email.messageCount,
          },
          type: "deal", // or "request"
        }),
      });
      if (!res.ok) throw new Error("Failed to create deal");
      // Could show a toast here
    } catch (err) {
      console.error("Failed to mark as deal:", err);
    } finally {
      setMarkingDeal(null);
    }
  };

  const handleMarkAsRequest = async (e: React.MouseEvent, email: EmailThread) => {
    e.stopPropagation();
    setMarkingDeal(email.id);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: {
            id: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date,
            account: activeAccount,
            labels: email.labels,
            messageCount: email.messageCount,
          },
          type: "request",
        }),
      });
      if (!res.ok) throw new Error("Failed to create request");
    } catch (err) {
      console.error("Failed to mark as request:", err);
    } finally {
      setMarkingDeal(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr.replace(" ", "T"));
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffHours < 48) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const unreadCount = emails.filter((e) => !e.read).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">📧 Email</h1>
          <p className="text-sm text-zinc-500">
            {loading ? "Loading..." : `${unreadCount} unread`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "⏳" : "🔄"} Refresh
        </button>
      </div>

      {/* Account Tabs - Shows actual email addresses */}
      {accounts.length > 0 && (
        <EmailTabs
          accounts={accounts}
          activeAccount={activeAccount}
          onChange={setActiveAccount}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="p-4">
          <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && emails.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-500 animate-pulse">Loading emails...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && emails.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-500">No actionable emails</div>
        </div>
      )}

      {/* Emails List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {emails.map((email) => (
          <div
            key={email.id}
            role={onFocusItem ? "button" : undefined}
            tabIndex={onFocusItem ? 0 : -1}
            onClick={() => onFocusItem && handleFocusItem(email)}
            onKeyDown={(event) => {
              if (!onFocusItem) return;
              if (event.key === "Enter") {
                handleFocusItem(email);
              }
            }}
            className={`p-4 rounded-xl border transition-all focus:outline-none group ${
              email.read
                ? "bg-zinc-900/30 border-zinc-800/50 opacity-70"
                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            } ${focusedItem?.id === email.id ? "ring-2 ring-indigo-500/70" : ""} ${
              onFocusItem ? "cursor-pointer hover:shadow-md" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate ${
                    email.read ? "text-zinc-400" : "text-zinc-200 font-medium"
                  }`}
                >
                  {email.subject || "(no subject)"}
                </p>
                <p className="text-xs text-zinc-500 mt-1 truncate">{email.from}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!email.read && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
                <span className="text-xs text-zinc-600">{formatDate(email.date)}</span>
              </div>
            </div>
            
            {email.snippet && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{email.snippet}</p>
            )}
            
            {/* Quick Actions - Show on hover */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/50">
              <div className="flex items-center gap-1">
                {email.messageCount > 1 && (
                  <span className="text-xs text-zinc-600 mr-2">
                    {email.messageCount} messages
                  </span>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleMarkAsDeal(e, email)}
                  disabled={markingDeal === email.id}
                  className="px-2 py-1 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded transition-colors disabled:opacity-50"
                  title="Add to Brand Deals pipeline"
                >
                  💰 Deal
                </button>
                <button
                  onClick={(e) => handleMarkAsRequest(e, email)}
                  disabled={markingDeal === email.id}
                  className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded transition-colors disabled:opacity-50"
                  title="Add to Requests pipeline"
                >
                  📋 Request
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
