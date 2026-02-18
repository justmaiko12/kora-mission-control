"use client";

import { useState, useEffect } from "react";
import { useEmails, EmailThread } from "@/lib/useEmails";
import EmailTabs from "@/components/EmailTabs";
import EmailDetail from "@/components/EmailDetail";
import { FocusedItem } from "@/lib/types";
import { safeString } from "@/lib/safeRender";
import ErrorBoundary from "@/components/ErrorBoundary";

interface EmailViewProps {
  focusedItem?: FocusedItem | null;
  onFocusItem?: (item: FocusedItem) => void;
  previewEmailIds?: string[]; // Emails to highlight (pending action)
  refreshTrigger?: number; // Increment to force refresh
  onActiveAccountChange?: (account: string) => void; // Report active account to parent
  onVisibleEmailsChange?: (emails: Array<{ from: string; subject: string; id: string }>) => void;
}

export default function EmailView({ focusedItem, onFocusItem, previewEmailIds = [], refreshTrigger = 0, onActiveAccountChange, onVisibleEmailsChange }: EmailViewProps) {
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
  
  // Filter state (MUST be before any conditional returns!)
  const [filter, setFilter] = useState<"all" | "unread" | "needs-response">("all");
  
  // Similar emails prompt state
  const [similarPrompt, setSimilarPrompt] = useState<{
    domain: string;
    emails: EmailThread[];
  } | null>(null);

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

  // Bulk delete selected emails (OPTIMISTIC)
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    // Capture IDs to process
    const idsToDelete = new Set(selectedIds);
    
    // OPTIMISTIC: Hide from UI immediately
    setIgnoredIds(prev => new Set([...prev, ...idsToDelete]));
    setSelectedIds(new Set());
    setSelectionMode(false);
    
    // Fire all API calls in parallel (don't await)
    for (const id of idsToDelete) {
      const email = emails.find(e => e.id === id);
      fetch("/api/emails/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          account: activeAccount, 
          action: "trash",
          email: email ? { from: email.from, subject: email.subject, labels: email.labels } : null,
        }),
      }).catch(err => console.error(`Failed to delete ${id}:`, err));
    }
  };

  // Bulk archive selected emails (OPTIMISTIC)
  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    
    // Capture IDs to process
    const idsToArchive = new Set(selectedIds);
    
    // OPTIMISTIC: Hide from UI immediately
    setIgnoredIds(prev => new Set([...prev, ...idsToArchive]));
    setSelectedIds(new Set());
    setSelectionMode(false);
    
    // Fire all API calls in parallel (don't await)
    for (const id of idsToArchive) {
      const email = emails.find(e => e.id === id);
      fetch("/api/emails/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          account: activeAccount, 
          action: "archive",
          email: email ? { from: email.from, subject: email.subject, labels: email.labels } : null,
        }),
      }).catch(err => console.error(`Failed to archive ${id}:`, err));
    }
  };

  const handleSelectEmail = (email: EmailThread) => {
    console.log("[EmailView] handleSelectEmail called with:", email);
    setSelectedEmail(email);
    // TEMPORARILY DISABLED to debug error
    // Also set as focused item for chat context
    // if (onFocusItem) {
    //   onFocusItem({
    //     type: "email",
    //     id: safeString(email.id),
    //     title: safeString(email.subject) || "(no subject)",
    //     preview: `${safeString(email.from)} • ${safeString(email.snippet)}`,
    //     metadata: {
    //       from: safeString(email.from),
    //       date: safeString(email.date),
    //       labels: email.labels,
    //       messageCount: email.messageCount,
    //       account: activeAccount,
    //     },
    //   });
    // }
  };

  const handleMarkAsDeal = async (e: React.MouseEvent, email: EmailThread) => {
    e.stopPropagation();
    
    // OPTIMISTIC: Hide from inbox immediately
    setIgnoredIds((prev) => new Set([...prev, email.id]));
    setSelectedEmail(null);
    
    // Fire API in background (don't await)
    fetch("/api/deals", {
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
    }).catch(err => {
      console.error("Failed to mark as deal:", err);
      // Rollback on error
      setIgnoredIds((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    });
  };

  const handleMarkAsRequest = async (e: React.MouseEvent, email: EmailThread) => {
    e.stopPropagation();
    
    // OPTIMISTIC: Hide from inbox immediately
    setIgnoredIds((prev) => new Set([...prev, email.id]));
    setSelectedEmail(null);
    
    // Fire API in background (don't await)
    fetch("/api/deals", {
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
    }).catch(err => {
      console.error("Failed to mark as request:", err);
      // Rollback on error
      setIgnoredIds((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    });
  };

  // Extract domain from email address
  const extractDomain = (from: string): string | null => {
    const match = from.match(/@([a-zA-Z0-9.-]+)/);
    return match ? match[1].toLowerCase() : null;
  };
  
  // Find similar emails (same sender domain)
  const findSimilarEmails = (email: EmailThread, currentIgnored: Set<string>): EmailThread[] => {
    const domain = extractDomain(email.from);
    if (!domain) return [];
    
    // Skip common domains that aren't useful to batch
    const skipDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
    if (skipDomains.includes(domain)) return [];
    
    return emails.filter(e => 
      e.id !== email.id && 
      !currentIgnored.has(e.id) &&
      extractDomain(e.from) === domain
    );
  };

  const handleIgnore = async (email: EmailThread) => {
    // OPTIMISTIC: Hide from UI immediately
    const newIgnored = new Set([...ignoredIds, email.id]);
    setIgnoredIds(newIgnored);
    setSelectedEmail(null);
    
    // Check for similar emails to offer batch archive
    const similar = findSimilarEmails(email, newIgnored);
    if (similar.length > 0) {
      const domain = extractDomain(email.from);
      setSimilarPrompt({ domain: domain || "this sender", emails: similar });
    }
    
    // Fire API in background (don't await)
    fetch("/api/emails/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: email.id,
        account: activeAccount,
        email: { from: email.from, subject: email.subject, labels: email.labels },
      }),
    }).catch(err => {
      console.error("Failed to archive email:", err);
      // Rollback on error
      setIgnoredIds((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    });
  };
  
  // Archive all similar emails
  const handleArchiveSimilar = () => {
    if (!similarPrompt) return;
    
    const idsToArchive = similarPrompt.emails.map(e => e.id);
    
    // OPTIMISTIC: Hide all immediately
    setIgnoredIds(prev => new Set([...prev, ...idsToArchive]));
    setSimilarPrompt(null);
    
    // Fire all API calls in parallel
    for (const email of similarPrompt.emails) {
      fetch("/api/emails/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: email.id,
          account: activeAccount,
          email: { from: email.from, subject: email.subject, labels: email.labels },
        }),
      }).catch(err => console.error(`Failed to archive ${email.id}:`, err));
    }
  };
  
  // Dismiss similar prompt
  const dismissSimilarPrompt = () => {
    setSimilarPrompt(null);
  };
  
  // Mark as Done (read, no action needed - different from archive/ignore)
  const handleDone = (email: EmailThread) => {
    // OPTIMISTIC: Hide from UI immediately
    setIgnoredIds((prev) => new Set([...prev, email.id]));
    setSelectedEmail(null);
    
    // Fire API in background - uses "done" action for learning
    fetch("/api/emails/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: email.id,
        account: activeAccount,
        action: "done", // Different from archive for learning
        email: { from: email.from, subject: email.subject, labels: email.labels },
      }),
    }).catch(err => {
      console.error("Failed to mark as done:", err);
      // Rollback on error
      setIgnoredIds((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    });
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

  // Report visible emails to parent for command context
  useEffect(() => {
    if (onVisibleEmailsChange) {
      onVisibleEmailsChange(
        visibleEmails.slice(0, 30).map(e => ({
          from: e.from,
          subject: e.subject,
          id: e.id,
        }))
      );
    }
  }, [visibleEmails, onVisibleEmailsChange]);

  // Show detail view when email is selected
  if (selectedEmail) {
    return (
      <ErrorBoundary name="EmailDetailView">
        <EmailDetail
          email={selectedEmail}
          account={activeAccount}
          onClose={() => setSelectedEmail(null)}
          onIgnore={() => handleIgnore(selectedEmail)}
          onDone={() => handleDone(selectedEmail)}
          onMarkAsDeal={(e) => handleMarkAsDeal(e, selectedEmail)}
          onMarkAsRequest={(e) => handleMarkAsRequest(e, selectedEmail)}
          isMarking={markingDeal === selectedEmail.id}
        />
      </ErrorBoundary>
    );
  }

  // Get sender initial for avatar
  const getSenderInitial = (from: string) => {
    const name = from.split("<")[0].trim();
    return name.charAt(0).toUpperCase();
  };

  // Get avatar color based on sender
  const getAvatarColor = (from: string) => {
    const colors = [
      "bg-rose-600", "bg-orange-600", "bg-amber-600", "bg-emerald-600", 
      "bg-teal-600", "bg-cyan-600", "bg-blue-600", "bg-indigo-600", 
      "bg-violet-600", "bg-purple-600", "bg-pink-600"
    ];
    const hash = from.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const needsResponseCount = visibleEmails.filter(e => e.needsResponse).length;
  
  const filteredEmails = filter === "unread" 
    ? visibleEmails.filter(e => !e.read)
    : filter === "needs-response"
    ? visibleEmails.filter(e => e.needsResponse)
    : visibleEmails;

  // Default: full email list view
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header with Search */}
      <div className="p-4 space-y-3">
        {/* Account Tabs */}
        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <div className="flex-1">
              <ErrorBoundary name="EmailTabs-Main">
                <EmailTabs
                  accounts={accounts}
                  activeAccount={activeAccount}
                  onChange={setActiveAccount}
                />
              </ErrorBoundary>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedIds(new Set());
              }}
              className={`p-2 rounded-lg transition-colors ${
                selectionMode 
                  ? "bg-indigo-600 text-white" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title="Select mode"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </button>
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter("needs-response")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filter === "needs-response"
                ? "bg-amber-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Needs Response
            {needsResponseCount > 0 && (
              <span className="text-xs text-zinc-300">{needsResponseCount}</span>
            )}
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filter === "unread"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Unread
            {unreadCount > 0 && (
              <span className="text-xs text-zinc-400">{unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              filter === "all"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && (
        <div className="px-4 py-2 bg-zinc-900/80 border-y border-zinc-800 flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {filteredEmails.every(e => selectedIds.has(e.id)) ? "Deselect All" : "Select All"}
          </button>
          <span className="text-sm text-zinc-400">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkArchive}
                disabled={bulkProcessing}
                className="px-4 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Archive
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
                className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
            title="Cancel selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-900/20 text-red-400 text-sm rounded-lg">
          {safeString(error)}
        </div>
      )}

      {/* Preview Banner */}
      {previewEmailIds.length > 0 && (
        <div className="mx-4 mb-2 px-4 py-2 bg-amber-900/30 border border-amber-700/50 text-amber-300 text-sm rounded-lg flex items-center gap-2">
          <span className="animate-pulse">⚠️</span>
          <span>{previewEmailIds.length} emails selected for action</span>
        </div>
      )}

      {/* Similar Emails Prompt */}
      {similarPrompt && (
        <div className="mx-4 mb-2 px-4 py-3 bg-indigo-900/40 border border-indigo-600/50 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">
                🧹 {similarPrompt.emails.length} more from @{similarPrompt.domain}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                {similarPrompt.emails.slice(0, 2).map(e => e.subject).join(", ")}
                {similarPrompt.emails.length > 2 && "..."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleArchiveSimilar}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Archive All
              </button>
              <button
                onClick={dismissSimilarPrompt}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
      {!loading && filteredEmails.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500">
          <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p>{filter === "unread" ? "No unread emails" : filter === "needs-response" ? "All caught up! 🎉" : "No emails"}</p>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto px-2">
        {filteredEmails.map((email) => {
          const emailId = safeString(email.id);
          const isPreview = previewEmailIds.includes(emailId);
          const isSelected = selectedIds.has(emailId);
          const fromStr = safeString(email.from);
          const senderName = fromStr.split("<")[0].trim();
          const emailSubject = safeString(email.subject) || "(no subject)";
          const emailDate = formatDate(safeString(email.date));
          const isRead = Boolean(email.read);
          const isFocused = false; // DISABLED: safeString(focusedItem?.id) === emailId;
          
          return (
            <div
              key={emailId}
              onClick={() => selectionMode ? toggleSelect(emailId) : handleSelectEmail(email)}
              className={`group flex items-center gap-3 px-3 py-3 mx-1 my-0.5 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? "bg-indigo-600/20"
                  : isPreview 
                  ? "bg-amber-900/20" 
                  : "hover:bg-zinc-800/50"
              } ${isFocused ? "bg-zinc-800" : ""}`}
            >
              {/* Checkbox or Avatar */}
              {selectionMode ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(emailId)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                />
              ) : (
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(fromStr)} flex items-center justify-center text-white font-semibold`}>
                    {getSenderInitial(fromStr)}
                  </div>
                  {!isRead && (
                    <span className="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-950" />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`font-medium truncate ${isRead ? "text-zinc-400" : "text-white"}`}>
                      {senderName}
                    </p>
                    {/* Importance indicator */}
                    {email.importanceScore !== undefined && email.importanceScore >= 70 && (
                      <span className="text-amber-400 flex-shrink-0" title={`Importance: ${email.importanceScore}`}>⭐</span>
                    )}
                    {email.importanceScore !== undefined && email.importanceScore < 30 && (
                      <span className="text-zinc-600 flex-shrink-0 text-xs" title={`Likely noise (${email.importanceScore})`}>📉</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {emailDate}
                  </span>
                </div>
                <p className={`text-sm truncate ${isRead ? "text-zinc-500" : "text-zinc-300"}`}>
                  {emailSubject}
                </p>
              </div>

              {/* Quick Actions (visible on hover) */}
              {!selectionMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIgnore(email);
                    }}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    title="Archive (train as noise)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleMarkAsDeal(e, email)}
                    className="p-2 hover:bg-green-600/30 rounded-lg transition-colors text-zinc-400 hover:text-green-400"
                    title="Mark as Deal (train as important)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
