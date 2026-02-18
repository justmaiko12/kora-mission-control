"use client";

import { useState, useEffect } from "react";
import { useEmails, EmailThread } from "@/lib/useEmails";
import EmailTabs from "@/components/EmailTabs";
import EmailDetail from "@/components/EmailDetail";
import { FocusedItem } from "@/lib/types";

interface EmailViewProps {
  focusedItem?: FocusedItem | null;
  onFocusItem?: (item: FocusedItem) => void;
  previewEmailIds?: string[]; // Emails to highlight (pending action)
  refreshTrigger?: number; // Increment to force refresh
  onActiveAccountChange?: (account: string) => void; // Report active account to parent
}

export default function EmailView({ focusedItem, onFocusItem, previewEmailIds = [], refreshTrigger = 0, onActiveAccountChange }: EmailViewProps) {
  const { accounts, emails, loading, error, activeAccount, setActiveAccount, refresh } =
    useEmails();
  
  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log("[EmailView] Refresh triggered");
      refresh(true); // Force refresh
    }
  }, [refreshTrigger, refresh]);
  
  // Report active account changes to parent
  useEffect(() => {
    if (activeAccount && onActiveAccountChange) {
      onActiveAccountChange(activeAccount);
    }
  }, [activeAccount, onActiveAccountChange]);
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [markingDeal, setMarkingDeal] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  
  // Checkbox selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Toggle individual email selection
  const toggleSelect = (emailId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  // Select/deselect all visible emails
  const toggleSelectAll = () => {
    const visibleIds = visibleEmails.map(e => e.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  // Bulk delete selected emails
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    
    try {
      for (const id of selectedIds) {
        await fetch("/api/emails/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, account: activeAccount, action: "trash" }),
        });
      }
      // Hide from UI
      setIgnoredIds(prev => new Set([...prev, ...selectedIds]));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk archive selected emails
  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    
    try {
      for (const id of selectedIds) {
        await fetch("/api/emails/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, account: activeAccount, action: "archive" }),
        });
      }
      setIgnoredIds(prev => new Set([...prev, ...selectedIds]));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      console.error("Bulk archive error:", err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSelectEmail = (email: EmailThread) => {
    setSelectedEmail(email);
    // Also set as focused item for chat context
    if (onFocusItem) {
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
    }
  };

  const handleMarkAsDeal = async (e: React.MouseEvent, email: EmailThread) => {
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
          type: "deal",
        }),
      });
      if (!res.ok) throw new Error("Failed to create deal");
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

  const handleIgnore = async (email: EmailThread) => {
    setMarkingDeal(email.id);
    try {
      // Archive the email via API
      await fetch("/api/emails/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: email.id,
          account: activeAccount,
        }),
      });
      // Hide from UI immediately
      setIgnoredIds((prev) => new Set([...prev, email.id]));
      setSelectedEmail(null);
    } catch (err) {
      console.error("Failed to ignore email:", err);
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

  // Filter out ignored emails
  const visibleEmails = emails.filter((e) => !ignoredIds.has(e.id));
  const unreadCount = visibleEmails.filter((e) => !e.read).length;

  // If an email is selected, show split view (desktop) or detail only (mobile)
  if (selectedEmail) {
    return (
      <div className="h-full flex">
        {/* Email List (narrower) - hidden on mobile */}
        <div className="hidden md:flex w-80 flex-shrink-0 border-r border-zinc-800 flex-col">
          {/* Header */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">📧 Email</h1>
              <p className="text-xs text-zinc-500">
                {loading ? "Loading..." : `${unreadCount} unread`}
              </p>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "⏳" : "🔄"}
            </button>
          </div>

          {/* Account Tabs */}
          {accounts.length > 0 && (
            <EmailTabs
              accounts={accounts}
              activeAccount={activeAccount}
              onChange={(acc) => {
                setActiveAccount(acc);
                setSelectedEmail(null);
              }}
            />
          )}

          {/* Compact Email List */}
          <div className="flex-1 overflow-y-auto">
            {visibleEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={`p-3 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? "bg-indigo-600/20 border-l-2 border-l-indigo-500"
                    : "hover:bg-zinc-800/50"
                } ${email.read ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!email.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${email.read ? "text-zinc-400" : "font-medium"}`}>
                      {email.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{email.from}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0">
                    {formatDate(email.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Detail */}
        <div className="flex-1 flex flex-col min-w-0">
          <EmailDetail
            email={selectedEmail}
            account={activeAccount}
            onClose={() => setSelectedEmail(null)}
            onMarkAsDeal={(e) => handleMarkAsDeal(e, selectedEmail)}
            onMarkAsRequest={(e) => handleMarkAsRequest(e, selectedEmail)}
            onIgnore={() => handleIgnore(selectedEmail)}
            isMarking={markingDeal === selectedEmail.id}
          />
        </div>
      </div>
    );
  }

  // Default: full email list view
  return (
    <div className="h-full flex flex-col">
      {/* Account Tabs + Actions */}
      <div className="flex items-center border-b border-zinc-800">
        {accounts.length > 0 && (
          <div className="flex-1">
            <EmailTabs
              accounts={accounts}
              activeAccount={activeAccount}
              onChange={setActiveAccount}
            />
          </div>
        )}
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedIds(new Set());
            }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectionMode 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
            title="Toggle selection mode"
          >
            ☑️
          </button>
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? "⏳" : "🔄"}
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && (
        <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
          >
            {visibleEmails.every(e => selectedIds.has(e.id)) ? "Deselect All" : "Select All"}
          </button>
          <span className="text-xs text-zinc-500">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkArchive}
                disabled={bulkProcessing}
                className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? "..." : "Archive"}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? "..." : "Delete"}
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
            className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-3 py-2 bg-red-900/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && emails.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && emails.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-500 text-sm">No emails</div>
        </div>
      )}

      {/* Preview Banner */}
      {previewEmailIds.length > 0 && (
        <div className="px-3 py-2 bg-amber-900/30 border-b border-amber-700/50 text-amber-300 text-xs flex items-center gap-2">
          <span className="animate-pulse">⚠️</span>
          <span>{previewEmailIds.length} emails selected for action - confirm in chat below</span>
        </div>
      )}

      {/* Compact Emails List */}
      <div className="flex-1 overflow-y-auto">
        {visibleEmails.map((email) => {
          const isPreview = previewEmailIds.includes(email.id);
          const isSelected = selectedIds.has(email.id);
          return (
            <div
              key={email.id}
              onClick={() => selectionMode ? toggleSelect(email.id) : handleSelectEmail(email)}
              className={`px-3 py-2 border-b border-zinc-800/50 cursor-pointer transition-all ${
                isSelected
                  ? "bg-indigo-600/20 border-l-2 border-l-indigo-500"
                  : isPreview 
                  ? "bg-amber-900/30 border-l-2 border-l-amber-500 animate-pulse" 
                  : email.read 
                  ? "opacity-60" 
                  : "hover:bg-zinc-800/50"
              } ${focusedItem?.id === email.id ? "bg-indigo-600/20" : ""}`}
            >
              <div className="flex items-center gap-2">
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(email.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                  />
                ) : isPreview ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                ) : !email.read ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                ) : null}
                <p className={`flex-1 text-sm truncate ${isPreview ? "text-amber-300 font-medium" : email.read ? "text-zinc-400" : "font-medium"}`}>
                  {email.subject || "(no subject)"}
                </p>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {formatDate(email.date)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5 pl-3.5">
                {email.from.split("<")[0].trim()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
