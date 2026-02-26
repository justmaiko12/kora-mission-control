"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  type?: "recording" | "posting";
  platform?: string;
}

interface BriefingModule {
  items: BriefingItem[];
  lastUpdated: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface NewsChatState {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
}

interface BriefingData {
  aiNews: BriefingModule;
  kpopNews: BriefingModule;
  teamTasks: BriefingModule;
  content: BriefingModule;
  preferences: {
    aiNews?: { liked: string[]; disliked: string[]; notes: string };
    kpopNews?: { liked: string[]; disliked: string[]; notes: string };
  };
}

type ModuleKey = "aiNews" | "kpopNews" | "teamTasks" | "content";

// NewsItemChat — topic-aware chat panel rendered below a news item
function NewsItemChat({
  item,
  chatState,
  onSend,
  onInputChange,
}: {
  item: BriefingItem;
  chatState: NewsChatState;
  onSend: (message: string) => void;
  onInputChange: (value: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && chatState.input.trim() && !chatState.loading) {
      onSend(chatState.input);
    }
  };

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--accent)]/20">
      {/* Source / article link */}
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          🔗 {item.source || "Read full article"} ↗
        </a>
      ) : item.source ? (
        <p className="text-xs text-[var(--text-muted)] mb-3">📰 {item.source}</p>
      ) : null}

      {/* Conversation messages */}
      {chatState.messages.length > 0 && (
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto pr-1">
          {chatState.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-[var(--accent)]/15 text-[var(--text-primary)] ml-6"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] mr-6 border border-[var(--border-subtle)]"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="text-[10px] text-[var(--text-muted)] mb-1">🤖 Kora</p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}
          {chatState.loading && (
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] mr-6">
              <p className="text-xs text-[var(--text-muted)] animate-pulse">🤖 Thinking...</p>
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={chatState.input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            chatState.messages.length === 0
              ? "Ask about this story..."
              : "Ask a follow-up..."
          }
          disabled={chatState.loading}
          className="flex-1 px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--accent)] min-h-[44px] disabled:opacity-60 transition-colors"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (chatState.input.trim() && !chatState.loading) {
              onSend(chatState.input);
            }
          }}
          disabled={chatState.loading || !chatState.input.trim()}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white rounded-lg text-sm min-h-[44px] min-w-[60px] transition-colors font-medium"
        >
          {chatState.loading ? "···" : "Ask"}
        </button>
      </div>
    </div>
  );
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
  const [expandedModule, setExpandedModule] = useState<ModuleKey | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});

  // News item chat state — keyed by item ID
  const [newsChatOpen, setNewsChatOpen] = useState<Record<string, boolean>>({});
  const [newsChatStates, setNewsChatStates] = useState<Record<string, NewsChatState>>({});
  // Ref so async handlers always see latest chat state (avoids stale closure)
  const newsChatStatesRef = useRef(newsChatStates);
  newsChatStatesRef.current = newsChatStates;

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch("/api/briefing");
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
        setNoteText({
          aiNews: data.preferences?.aiNews?.notes || "",
          kpopNews: data.preferences?.kpopNews?.notes || "",
        });
      }
    } catch (err) {
      console.error("Briefing fetch error:", err);
    }
  }, []);

  /** Toggle a news item's chat panel open/closed */
  const toggleNewsChat = useCallback((itemId: string) => {
    setNewsChatOpen((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    // Lazily initialise chat state the first time
    setNewsChatStates((prev) => {
      if (!prev[itemId]) {
        return { ...prev, [itemId]: { messages: [], input: "", loading: false } };
      }
      return prev;
    });
  }, []);

  /** Update the input field for a specific chat */
  const handleChatInputChange = useCallback((itemId: string, value: string) => {
    setNewsChatStates((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? { messages: [], input: "", loading: false }),
        input: value,
      },
    }));
  }, []);

  /** Send a message for a specific news item chat */
  const handleNewsChatSend = useCallback(
    async (itemId: string, item: BriefingItem, message: string) => {
      // Read current state via ref to avoid stale closure
      const current = newsChatStatesRef.current[itemId] ?? {
        messages: [],
        input: "",
        loading: false,
      };
      const conversationHistory = current.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Optimistic: clear input, set loading
      setNewsChatStates((prev) => ({
        ...prev,
        [itemId]: {
          ...(prev[itemId] ?? { messages: [], input: "", loading: false }),
          loading: true,
          input: "",
        },
      }));

      try {
        const res = await fetch("/api/news/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            newsContext: {
              title: item.title,
              summary: item.summary,
              source: item.source,
              sourceUrl: item.url,
            },
            conversationHistory,
          }),
        });

        const data = await res.json();
        const answer =
          data.answer ?? "Sorry, I couldn't get a response. Please try again.";

        setNewsChatStates((prev) => {
          const c = prev[itemId] ?? { messages: [], input: "", loading: false };
          return {
            ...prev,
            [itemId]: {
              messages: [
                ...c.messages,
                { role: "user" as const, content: message },
                { role: "assistant" as const, content: answer },
              ],
              input: "",
              loading: false,
            },
          };
        });
      } catch {
        setNewsChatStates((prev) => {
          const c = prev[itemId] ?? { messages: [], input: "", loading: false };
          return {
            ...prev,
            [itemId]: {
              messages: [
                ...c.messages,
                { role: "user" as const, content: message },
                {
                  role: "assistant" as const,
                  content: "Sorry, something went wrong. Please try again.",
                },
              ],
              input: "",
              loading: false,
            },
          };
        });
      }
    },
    []
  );

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

  const submitFeedback = async (module: string, itemTitle: string, feedback: "like" | "dislike") => {
    try {
      await fetch("/api/briefing/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, itemTitle, feedback }),
      });
      fetchBriefing();
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

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

  // Group tasks by assignee
  const groupTasksByPerson = (items: BriefingItem[]) => {
    const grouped: Record<string, BriefingItem[]> = {};
    items.forEach((item) => {
      const person = item.assignee || "Unassigned";
      if (!grouped[person]) grouped[person] = [];
      grouped[person].push(item);
    });
    return grouped;
  };

  // Split content into recording and posting
  const splitContent = (items: BriefingItem[]) => {
    return {
      recording: items.filter((i) => i.type === "recording" || i.title.toLowerCase().includes("record")),
      posting: items.filter((i) => i.type === "posting" || i.title.toLowerCase().includes("post")),
    };
  };

  // News Module Card (AI News & K-pop News with preferences)
  const NewsModuleCard = ({
    moduleKey,
    title,
    icon,
    items,
    lastUpdated,
    preferences,
  }: {
    moduleKey: "aiNews" | "kpopNews";
    title: string;
    icon: string;
    items: BriefingItem[];
    lastUpdated: string | null;
    preferences?: { liked?: string[]; disliked?: string[]; notes?: string };
  }) => {
    const hasItems = items && items.length > 0;

    return (
      <div
        onClick={() => setExpandedModule(moduleKey)}
        className="surface-card p-4 md:p-5 flex flex-col cursor-pointer hover:border-[var(--accent)] transition-all group"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">{formatTime(lastUpdated)}</span>
            <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-hidden">
          {!hasItems ? (
            <p className="text-sm text-[var(--text-muted)] italic">No items yet. Updates at 5am PST.</p>
          ) : (
            items.slice(0, 3).map((item) => (
              <div key={item.id} className="p-2 rounded-lg bg-[var(--surface-2)]/50">
                <p className="text-sm font-medium text-[var(--text-secondary)] line-clamp-1">{item.title}</p>
                {item.source && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.source}</p>
                )}
              </div>
            ))
          )}
          {items.length > 3 && (
            <p className="text-xs text-[var(--text-muted)] text-center">+{items.length - 3} more</p>
          )}
        </div>
      </div>
    );
  };

  // Team Tasks Card (grouped by person, no preferences)
  const TeamTasksCard = ({ items, lastUpdated }: { items: BriefingItem[]; lastUpdated: string | null }) => {
    const grouped = groupTasksByPerson(items);
    const people = Object.keys(grouped);

    return (
      <div
        onClick={() => setExpandedModule("teamTasks")}
        className="surface-card p-4 md:p-5 flex flex-col cursor-pointer hover:border-[var(--accent)] transition-all group"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Team Tasks</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">{formatTime(lastUpdated)}</span>
            <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-hidden">
          {people.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic">No tasks due today.</p>
          ) : (
            people.slice(0, 3).map((person) => (
              <div key={person} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-sm font-medium text-[var(--accent)]">
                  {person.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{person}</p>
                  <p className="text-xs text-[var(--text-muted)]">{grouped[person].length} task{grouped[person].length !== 1 ? "s" : ""} due</p>
                </div>
              </div>
            ))
          )}
          {people.length > 3 && (
            <p className="text-xs text-[var(--text-muted)] text-center">+{people.length - 3} more people</p>
          )}
        </div>
      </div>
    );
  };

  // Content Schedule Card (recording vs posting, no preferences)
  const ContentScheduleCard = ({ items, lastUpdated }: { items: BriefingItem[]; lastUpdated: string | null }) => {
    const { recording, posting } = splitContent(items);

    return (
      <div
        onClick={() => setExpandedModule("content")}
        className="surface-card p-4 md:p-5 flex flex-col cursor-pointer hover:border-[var(--accent)] transition-all group"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Content Today</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">{formatTime(lastUpdated)}</span>
            <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-3">
          {/* Recording */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-amber-400">🎥</span>
              <span className="text-xs font-medium text-amber-400">Recording</span>
            </div>
            {recording.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Nothing scheduled</p>
            ) : (
              <p className="text-lg font-bold text-[var(--text-primary)]">{recording.length}</p>
            )}
          </div>

          {/* Posting */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-emerald-400">📤</span>
              <span className="text-xs font-medium text-emerald-400">Posting</span>
            </div>
            {posting.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Nothing scheduled</p>
            ) : (
              <p className="text-lg font-bold text-[var(--text-primary)]">{posting.length}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Expanded Modal
  const ExpandedModal = () => {
    if (!expandedModule || !briefing) return null;

    const moduleConfig = {
      aiNews: { title: "AI News", icon: "🤖", items: briefing.aiNews.items, lastUpdated: briefing.aiNews.lastUpdated },
      kpopNews: { title: "K-pop News", icon: "🎤", items: briefing.kpopNews.items, lastUpdated: briefing.kpopNews.lastUpdated },
      teamTasks: { title: "Team Tasks", icon: "✅", items: briefing.teamTasks.items, lastUpdated: briefing.teamTasks.lastUpdated },
      content: { title: "Content Today", icon: "🎬", items: briefing.content.items, lastUpdated: briefing.content.lastUpdated },
    };

    const config = moduleConfig[expandedModule];
    const hasPreferences = expandedModule === "aiNews" || expandedModule === "kpopNews";
    const preferences = hasPreferences ? briefing.preferences?.[expandedModule] : undefined;
    const isNotesExpanded = expandedNotes === expandedModule;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setExpandedModule(null);
            setExpandedNotes(null);
          }
        }}
      >
        <div className="w-full max-w-2xl max-h-[85vh] bg-[var(--surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{config.title}</h2>
                <p className="text-xs text-[var(--text-muted)]">Updated {formatTime(config.lastUpdated)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setExpandedModule(null);
                setExpandedNotes(null);
              }}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {expandedModule === "teamTasks" ? (
              // Team Tasks - Grouped by person
              <div className="space-y-4">
                {Object.entries(groupTasksByPerson(config.items)).map(([person, tasks]) => (
                  <div key={person} className="surface-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-lg font-medium text-[var(--accent)]">
                        {person.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{person}</p>
                        <p className="text-xs text-[var(--text-muted)]">{tasks.length} task{tasks.length !== 1 ? "s" : ""} due</p>
                      </div>
                    </div>
                    <div className="space-y-2 ml-13">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
                          <span className="text-[var(--text-muted)]">•</span>
                          <div className="flex-1">
                            <p className="text-sm text-[var(--text-secondary)]">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-xs text-[var(--text-muted)]">Due: {task.dueDate}</p>
                            )}
                          </div>
                          {task.status && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              task.status === "overdue" ? "bg-red-500/20 text-red-400" :
                              task.status === "due" ? "bg-amber-500/20 text-amber-400" :
                              "bg-zinc-500/20 text-zinc-400"
                            }`}>
                              {task.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {config.items.length === 0 && (
                  <p className="text-center text-[var(--text-muted)] py-8">No tasks due today 🎉</p>
                )}
              </div>
            ) : expandedModule === "content" ? (
              // Content Schedule - Recording vs Posting
              <div className="space-y-4">
                {/* Recording Section */}
                <div className="surface-card p-4 border-l-4 border-amber-500">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🎥</span>
                    <h3 className="font-semibold text-[var(--text-primary)]">Recording Today</h3>
                  </div>
                  {splitContent(config.items).recording.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] italic">Nothing scheduled for recording</p>
                  ) : (
                    <div className="space-y-2">
                      {splitContent(config.items).recording.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                            {item.platform && (
                              <p className="text-xs text-[var(--text-muted)]">{item.platform}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Posting Section */}
                <div className="surface-card p-4 border-l-4 border-emerald-500">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📤</span>
                    <h3 className="font-semibold text-[var(--text-primary)]">Posting Today</h3>
                  </div>
                  {splitContent(config.items).posting.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] italic">Nothing scheduled for posting</p>
                  ) : (
                    <div className="space-y-2">
                      {splitContent(config.items).posting.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                            {item.platform && (
                              <p className="text-xs text-[var(--text-muted)]">{item.platform}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // News modules (AI News & K-pop News) - with feedback + contextual chat
              <div className="space-y-1">
                {config.items.length === 0 ? (
                  <p className="text-center text-[var(--text-muted)] py-8">No news yet. Updates at 5am PST.</p>
                ) : (
                  config.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-transparent hover:border-[var(--border-subtle)] transition-colors overflow-hidden"
                    >
                      {/* Item row — click anywhere to toggle chat */}
                      <div
                        className="group flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                        onClick={() => toggleNewsChat(item.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-secondary)]">
                            {item.title}
                          </p>
                          {item.summary && (
                            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                              {item.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {item.source && (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {item.source}
                              </span>
                            )}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[var(--accent)] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Read ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Right-side controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Feedback buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                submitFeedback(expandedModule, item.title, "like");
                              }}
                              className={`p-1.5 rounded hover:bg-emerald-500/20 ${
                                preferences?.liked?.includes(item.title)
                                  ? "text-emerald-400"
                                  : "text-[var(--text-muted)]"
                              }`}
                              title="More like this"
                            >
                              👍
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                submitFeedback(expandedModule, item.title, "dislike");
                              }}
                              className={`p-1.5 rounded hover:bg-red-500/20 ${
                                preferences?.disliked?.includes(item.title)
                                  ? "text-red-400"
                                  : "text-[var(--text-muted)]"
                              }`}
                              title="Less like this"
                            >
                              👎
                            </button>
                          </div>
                          {/* Chat toggle indicator */}
                          <span
                            className={`text-xs transition-colors ml-1 ${
                              newsChatOpen[item.id]
                                ? "text-[var(--accent)]"
                                : "text-[var(--text-muted)] opacity-0 group-hover:opacity-100"
                            }`}
                            title={newsChatOpen[item.id] ? "Close chat" : "Chat about this"}
                          >
                            {newsChatOpen[item.id] ? "▲" : "💬"}
                          </span>
                        </div>
                      </div>

                      {/* Chat panel — lazy-rendered when toggled */}
                      {newsChatOpen[item.id] && (
                        <NewsItemChat
                          item={item}
                          chatState={
                            newsChatStates[item.id] ?? {
                              messages: [],
                              input: "",
                              loading: false,
                            }
                          }
                          onSend={(msg) => handleNewsChatSend(item.id, item, msg)}
                          onInputChange={(val) => handleChatInputChange(item.id, val)}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer - Preferences (news modules only) */}
          {hasPreferences && (
            <div className="border-t border-[var(--border-subtle)] p-4">
              <button
                onClick={() => setExpandedNotes(isNotesExpanded ? null : expandedModule)}
                className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <span>📝</span>
                <span>{preferences?.notes ? "Edit preferences" : "Add preferences"}</span>
              </button>

              {isNotesExpanded && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={noteText[expandedModule] || ""}
                    onChange={(e) => setNoteText((prev) => ({ ...prev, [expandedModule]: e.target.value }))}
                    placeholder="Tell me what topics you want to see more/less of..."
                    className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg resize-none focus:outline-none focus:border-[var(--accent)]"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setExpandedNotes(null)}
                      className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveNotes(expandedModule)}
                      className="px-3 py-1.5 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
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
        <NewsModuleCard
          moduleKey="aiNews"
          title="AI News"
          icon="🤖"
          items={briefing?.aiNews?.items || []}
          lastUpdated={briefing?.aiNews?.lastUpdated || null}
          preferences={briefing?.preferences?.aiNews}
        />
        <NewsModuleCard
          moduleKey="kpopNews"
          title="K-pop News"
          icon="🎤"
          items={briefing?.kpopNews?.items || []}
          lastUpdated={briefing?.kpopNews?.lastUpdated || null}
          preferences={briefing?.preferences?.kpopNews}
        />
        <TeamTasksCard
          items={briefing?.teamTasks?.items || []}
          lastUpdated={briefing?.teamTasks?.lastUpdated || null}
        />
        <ContentScheduleCard
          items={briefing?.content?.items || []}
          lastUpdated={briefing?.content?.lastUpdated || null}
        />
      </div>

      {/* Quick hint */}
      <p className="text-center text-[10px] text-[var(--text-muted)]">
        Click any card to expand • Click a news item to chat about it 💬 • Refreshes daily at 5am PST
      </p>

      {/* Expanded Modal */}
      <ExpandedModal />
    </div>
  );
}
