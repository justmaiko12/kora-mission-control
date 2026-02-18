"use client";

import { useCallback, useEffect, useState } from "react";

interface Deal {
  id: string;
  account: string;
  subject: string;
  from: string;
  date: string;
  labels: string[];
  messageCount: number;
  unread?: boolean;
}

interface DealPipeline {
  new_lead: Deal[];
  negotiating: Deal[];
  contracted: Deal[];
  in_progress: Deal[];
  completed: Deal[];
  invoiced: Deal[];
  paid: Deal[];
}

interface RequestPipeline {
  new: Deal[];
  reviewing: Deal[];
  approved: Deal[];
  completed: Deal[];
}

interface PipelineData {
  deals: DealPipeline;
  requests: RequestPipeline;
}

const DEAL_STAGES = {
  new_lead: { label: "📧 New Lead", color: "bg-blue-500/20 border-blue-500/50" },
  negotiating: { label: "💬 Negotiating", color: "bg-yellow-500/20 border-yellow-500/50" },
  contracted: { label: "📝 Contracted", color: "bg-purple-500/20 border-purple-500/50" },
  in_progress: { label: "🎬 In Progress", color: "bg-orange-500/20 border-orange-500/50" },
  completed: { label: "✅ Completed", color: "bg-green-500/20 border-green-500/50" },
  invoiced: { label: "🧾 Invoiced", color: "bg-cyan-500/20 border-cyan-500/50" },
  paid: { label: "💰 Paid", color: "bg-emerald-500/20 border-emerald-500/50" },
};

const REQUEST_STAGES = {
  new: { label: "📩 New", color: "bg-slate-500/20 border-slate-500/50" },
  reviewing: { label: "👀 Reviewing", color: "bg-amber-500/20 border-amber-500/50" },
  approved: { label: "✅ Approved", color: "bg-teal-500/20 border-teal-500/50" },
  completed: { label: "✔️ Done", color: "bg-zinc-500/20 border-zinc-500/50" },
};

type TabType = "deals" | "requests";

export default function DealsView() {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("deals");

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deals?view=pipeline");
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      const data = await res.json();
      setPipelineData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const generateDraft = async (deal: Deal, instruction?: string) => {
    setDraftLoading(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          threadId: deal.id,
          account: deal.account,
          instruction: instruction || "follow up",
        }),
      });
      if (!res.ok) throw new Error("Failed to generate draft");
      const data = await res.json();
      setDraft(data.draft);
    } catch (err) {
      console.error("Draft failed:", err);
    } finally {
      setDraftLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr.replace(" ", "T"));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const extractSender = (from: string) => {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim() : from;
  };

  const totalDeals = pipelineData?.deals
    ? Object.values(pipelineData.deals).reduce((sum, items) => sum + items.length, 0)
    : 0;
  
  const totalRequests = pipelineData?.requests
    ? Object.values(pipelineData.requests).reduce((sum, items) => sum + items.length, 0)
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-xl font-bold">💼 Business</h1>
          <button
            onClick={fetchPipeline}
            disabled={loading}
            className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "⏳" : "🔄"} <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("deals")}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors ${
              activeTab === "deals"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            💰 <span className="hidden sm:inline">Brand </span>Deals {!loading && <span className="ml-1 opacity-70">({totalDeals})</span>}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors ${
              activeTab === "requests"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            📋 Requests {!loading && <span className="ml-1 opacity-70">({totalRequests})</span>}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4">
          <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto p-2 md:p-4">
        <div className="flex gap-2 md:gap-4 min-w-max h-full">
          {/* Deals Pipeline */}
          {activeTab === "deals" && pipelineData?.deals &&
            (Object.keys(DEAL_STAGES) as Array<keyof typeof DEAL_STAGES>).map((stage) => (
              <div
                key={stage}
                className="w-56 md:w-72 flex-shrink-0 flex flex-col bg-zinc-900/30 rounded-xl border border-zinc-800"
              >
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {DEAL_STAGES[stage].label}
                  </span>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                    {pipelineData.deals[stage]?.length || 0}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {pipelineData.deals[stage]?.map((deal) => (
                    <div
                      key={deal.id}
                      onClick={() => { setSelectedDeal(deal); setDraft(""); }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        DEAL_STAGES[stage].color
                      } ${selectedDeal?.id === deal.id ? "ring-2 ring-indigo-500" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">{deal.subject}</p>
                        {deal.unread && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 truncate">{extractSender(deal.from)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-500">{formatDate(deal.date)}</span>
                        {deal.messageCount > 1 && <span className="text-xs text-zinc-500">{deal.messageCount} msgs</span>}
                      </div>
                    </div>
                  ))}
                  {pipelineData.deals[stage]?.length === 0 && (
                    <div className="text-center text-zinc-500 text-xs py-4">No deals</div>
                  )}
                </div>
              </div>
            ))}

          {/* Requests Pipeline */}
          {activeTab === "requests" && pipelineData?.requests &&
            (Object.keys(REQUEST_STAGES) as Array<keyof typeof REQUEST_STAGES>).map((stage) => (
              <div
                key={stage}
                className="w-56 md:w-72 flex-shrink-0 flex flex-col bg-zinc-900/30 rounded-xl border border-zinc-800"
              >
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {REQUEST_STAGES[stage].label}
                  </span>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                    {pipelineData.requests[stage]?.length || 0}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {pipelineData.requests[stage]?.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => { setSelectedDeal(req); setDraft(""); }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        REQUEST_STAGES[stage].color
                      } ${selectedDeal?.id === req.id ? "ring-2 ring-indigo-500" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">{req.subject}</p>
                        {req.unread && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 truncate">{extractSender(req.from)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-500">{formatDate(req.date)}</span>
                        {req.messageCount > 1 && <span className="text-xs text-zinc-500">{req.messageCount} msgs</span>}
                      </div>
                    </div>
                  ))}
                  {pipelineData.requests[stage]?.length === 0 && (
                    <div className="text-center text-zinc-500 text-xs py-4">No requests</div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Selected Deal Panel */}
      {selectedDeal && (
        <div className="border-t border-zinc-800 p-3 md:p-4 bg-zinc-900/50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3 className="font-medium line-clamp-1 md:truncate text-sm md:text-base">{selectedDeal.subject}</h3>
                <button
                  onClick={() => setSelectedDeal(null)}
                  className="md:hidden p-1 text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 mt-1 truncate">
                {extractSender(selectedDeal.from)} • {selectedDeal.account}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button
                onClick={() => generateDraft(selectedDeal, "send rates")}
                disabled={draftLoading}
                className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                💰 Rates
              </button>
              <button
                onClick={() => generateDraft(selectedDeal, "follow up")}
                disabled={draftLoading}
                className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
              >
                ✏️ Reply
              </button>
              <button
                onClick={() => generateDraft(selectedDeal, "decline")}
                disabled={draftLoading}
                className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                ❌ Pass
              </button>
            </div>
          </div>

          {/* Draft Preview */}
          {(draftLoading || draft) && (
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
              {draftLoading ? (
                <p className="text-zinc-400 text-sm animate-pulse">
                  Generating draft...
                </p>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-2">📝 Draft Preview</p>
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {draft}
                  </pre>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                      ✅ Copy & Open Gmail
                    </button>
                    <button
                      onClick={() => setDraft("")}
                      className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
