"use client";

import { useEffect, useState, useCallback } from "react";
import { ViewType } from "@/app/page";

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

interface QuickStats {
  unreadEmails: number;
  activeDeals: number;
  pendingTasks: number;
  koraStatus: "active" | "idle";
}

interface BriefingItem {
  id: string;
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  date?: string;
  // For tasks/content
  assignee?: string;
  status?: string;
  dueDate?: string;
}

interface BriefingModule {
  items: BriefingItem[];
  lastUpdated: string | null;
}

interface BriefingData {
  aiNews: BriefingModule;
  kpopNews: BriefingModule;
  teamTasks: BriefingModule;
  content: BriefingModule;
  preferences: {
    aiNews?: { liked: string[]; disliked: string[]; notes: string };
    kpopNews?: { liked: string[]; disliked: string[]; notes: string };
    teamTasks?: { notes: string };
    content?: { notes: string };
  };
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<QuickStats>({
    unreadEmails: 0,
    activeDeals: 0,
    pendingTasks: 0,
    koraStatus: "idle",
  });
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch("/api/briefing");
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
        // Initialize note text from preferences
        setNoteText({
          aiNews: data.preferences?.aiNews?.notes || "",
          kpopNews: data.preferences?.kpopNews?.notes || "",
          teamTasks: data.preferences?.teamTasks?.notes || "",
          content: data.preferences?.content?.notes || "",
        });
      }
    } catch (err) {
      console.error("Briefing fetch error:", err);
    }
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [emailRes, dealsRes, tasksRes, agentRes] = await Promise.all([
          fetch("/api/emails"),
          fetch("/api/deals?view=pipeline"),
          fetch("/api/tasks"),
          fetch("/api/agents/status"),
        ]);

        const emailData = await emailRes.json();
        const dealsData = await dealsRes.json();
        const tasksData = await tasksRes.json();
        const agentData = await agentRes.json();

        const unreadEmails = emailData.emails?.filter((e: { read: boolean }) => !e.read).length || 0;
        const activeDeals = Object.values(dealsData.deals || {}).flat().length;
        const pendingTasks = tasksData.tasks?.filter((t: { status: string }) => t.status !== "completed").length || 0;
        const koraStatus = agentData.activeCount > 0 ? "active" : "idle";

        setStats({ unreadEmails, activeDeals, pendingTasks, koraStatus });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    fetchBriefing();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchBriefing]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Submit feedback for an item
  const submitFeedback = async (module: string, itemTitle: string, feedback: "like" | "dislike") => {
    try {
      await fetch("/api/briefing/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, itemTitle, feedback }),
      });
      // Refresh briefing to get updated preferences
      fetchBriefing();
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

  // Save notes for a module
  const saveNotes = async (module: string) => {
    try {
      await fetch("/api/briefing/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, feedback: "note", notes: noteText[module] }),
      });
      setExpandedNotes(null);
    } catch (err) {
      console.error("Notes save error:", err);
    }
  };

  // Format relative time
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "Not yet updated";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const channels = [
    { id: "email" as ViewType, icon: "📧", title: "Email", stat: stats.unreadEmails, statLabel: "unread" },
    { id: "business" as ViewType, icon: "💼", title: "Deals", stat: stats.activeDeals, statLabel: "active" },
    { id: "kora-tasks" as ViewType, icon: "📋", title: "Tasks", stat: stats.pendingTasks, statLabel: "pending" },
    { id: "kora-activity" as ViewType, icon: "📊", title: "Activity", stat: stats.koraStatus === "active" ? "●" : "○", statLabel: stats.koraStatus },
  ];

  // Briefing module component
  const BriefingModule = ({ 
    moduleKey, 
    title, 
    icon, 
    items, 
    lastUpdated, 
    preferences 
  }: { 
    moduleKey: string;
    title: string; 
    icon: string; 
    items: BriefingItem[];
    lastUpdated: string | null;
    preferences?: { liked?: string[]; disliked?: string[]; notes?: string };
  }) => {
    const hasItems = items && items.length > 0;
    const isExpanded = expandedNotes === moduleKey;

    return (
      <div className="surface-card p-4 md:p-5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{formatTime(lastUpdated)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2 mb-3 overflow-y-auto max-h-[200px]">
          {!hasItems ? (
            <p className="text-sm text-[var(--text-muted)] italic">No items yet. Updates at 5am PST.</p>
          ) : (
            items.slice(0, 5).map((item) => (
              <div key={item.id} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                <div className="flex-1 min-w-0">
                  {item.url ? (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] line-clamp-2"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-[var(--text-secondary)] line-clamp-2">{item.title}</p>
                  )}
                  {item.summary && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{item.summary}</p>
                  )}
                  {item.assignee && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {item.assignee} {item.dueDate && `• Due ${item.dueDate}`}
                    </p>
                  )}
                </div>
                {/* Feedback buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => submitFeedback(moduleKey, item.title, "like")}
                    className={`p-1 rounded hover:bg-emerald-500/20 text-xs ${preferences?.liked?.includes(item.title) ? "text-emerald-400" : "text-[var(--text-muted)]"}`}
                    title="More like this"
                  >
                    👍
                  </button>
                  <button 
                    onClick={() => submitFeedback(moduleKey, item.title, "dislike")}
                    className={`p-1 rounded hover:bg-red-500/20 text-xs ${preferences?.disliked?.includes(item.title) ? "text-red-400" : "text-[var(--text-muted)]"}`}
                    title="Less like this"
                  >
                    👎
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notes Section */}
        <div className="border-t border-[var(--border-subtle)] pt-2">
          <button
            onClick={() => setExpandedNotes(isExpanded ? null : moduleKey)}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <span>📝</span>
            <span>{preferences?.notes ? "Edit preferences" : "Add preferences"}</span>
          </button>
          
          {isExpanded && (
            <div className="mt-2 space-y-2">
              <textarea
                value={noteText[moduleKey] || ""}
                onChange={(e) => setNoteText(prev => ({ ...prev, [moduleKey]: e.target.value }))}
                placeholder="Tell me what you want to see more/less of..."
                className="w-full px-2 py-1.5 text-xs bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg resize-none focus:outline-none focus:border-[var(--accent)]"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setExpandedNotes(null)}
                  className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveNotes(moduleKey)}
                  className="px-2 py-1 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {getGreeting()}, Michael
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className={`w-2 h-2 rounded-full ${stats.koraStatus === "active" ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
          Kora {stats.koraStatus}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onNavigate(ch.id)}
            className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all text-center"
          >
            <span className="text-lg">{ch.icon}</span>
            <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{loading ? "—" : ch.stat}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{ch.statLabel}</p>
          </button>
        ))}
      </div>

      {/* Briefing Modules - 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BriefingModule
          moduleKey="aiNews"
          title="AI News"
          icon="🤖"
          items={briefing?.aiNews?.items || []}
          lastUpdated={briefing?.aiNews?.lastUpdated || null}
          preferences={briefing?.preferences?.aiNews}
        />
        <BriefingModule
          moduleKey="kpopNews"
          title="K-pop News"
          icon="🎤"
          items={briefing?.kpopNews?.items || []}
          lastUpdated={briefing?.kpopNews?.lastUpdated || null}
          preferences={briefing?.preferences?.kpopNews}
        />
        <BriefingModule
          moduleKey="teamTasks"
          title="Team Tasks"
          icon="✅"
          items={briefing?.teamTasks?.items || []}
          lastUpdated={briefing?.teamTasks?.lastUpdated || null}
          preferences={briefing?.preferences?.teamTasks}
        />
        <BriefingModule
          moduleKey="content"
          title="Content Schedule"
          icon="🎬"
          items={briefing?.content?.items || []}
          lastUpdated={briefing?.content?.lastUpdated || null}
          preferences={briefing?.preferences?.content}
        />
      </div>

      {/* Quick hint */}
      <p className="text-center text-[10px] text-[var(--text-muted)]">
        News refreshes daily at 5am PST • 👍👎 to improve recommendations
      </p>
    </div>
  );
}
