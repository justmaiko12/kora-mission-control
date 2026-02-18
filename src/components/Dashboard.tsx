"use client";

import { useEffect, useState } from "react";
import { ViewType } from "@/app/page";

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

interface EmailSummary {
  account: string;
  unreadCount: number;
  recentSubjects: string[];
}

interface DealSummary {
  total: number;
  newLeads: number;
  recentDeals: string[];
}

interface DashboardData {
  emails: EmailSummary[];
  deals: DealSummary;
  totalUnread: number;
  loading: boolean;
  error: string | null;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData>({
    emails: [],
    deals: { total: 0, newLeads: 0, recentDeals: [] },
    totalUnread: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch emails from all accounts (dashboard mode)
        const emailsRes = await fetch("/api/emails?dashboard=true");
        const emailsData = await emailsRes.json();
        
        // Fetch deals pipeline
        const dealsRes = await fetch("/api/deals?view=pipeline");
        const dealsData = await dealsRes.json();

        // Process email data
        const emailSummaries: EmailSummary[] = [];
        let totalUnread = 0;

        if (emailsData.accounts && emailsData.emails) {
          for (const account of emailsData.accounts) {
            const accountEmails = emailsData.emails.filter(
              (e: { account: string }) => e.account === account
            );
            const unreadCount = accountEmails.filter((e: { read: boolean }) => !e.read).length;
            totalUnread += unreadCount;
            
            emailSummaries.push({
              account,
              unreadCount,
              recentSubjects: accountEmails.slice(0, 3).map((e: { subject: string }) => e.subject || "(no subject)"),
            });
          }
        }

        // Process deals data
        const dealSummary: DealSummary = {
          total: 0,
          newLeads: 0,
          recentDeals: [],
        };

        if (dealsData.deals) {
          const allDeals = Object.values(dealsData.deals).flat() as { subject: string }[];
          dealSummary.total = allDeals.length;
          dealSummary.newLeads = dealsData.deals.new_lead?.length || 0;
          dealSummary.recentDeals = allDeals.slice(0, 3).map((d) => d.subject || "Untitled deal");
        }

        setData({
          emails: emailSummaries,
          deals: dealSummary,
          totalUnread,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load dashboard data",
        }));
      }
    }

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Build channel cards from real data
  const channels = [
    {
      id: "email" as ViewType,
      icon: "📧",
      title: "Email",
      count: data.totalUnread,
      color: "from-blue-500 to-cyan-500",
      items: data.emails.flatMap((e) => e.recentSubjects).slice(0, 3),
    },
    {
      id: "business" as ViewType,
      icon: "💼",
      title: "Deals",
      count: data.deals.total,
      color: "from-green-500 to-emerald-500",
      items: data.deals.recentDeals.length > 0 
        ? data.deals.recentDeals 
        : ["No active deals"],
    },
    {
      id: "chat" as ViewType,
      icon: "💬",
      title: "Chat",
      count: 0,
      color: "from-indigo-500 to-violet-500",
      items: ["Talk to Kora..."],
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{getGreeting()}, Michael 👋</h1>
          <p className="text-zinc-500 text-sm md:text-base mt-1">
            {data.loading ? "Loading..." : "Here's what needs your attention"}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs md:text-sm text-zinc-500">Today</p>
          <p className="text-base md:text-lg font-semibold">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Error State */}
      {data.error && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-4 text-yellow-400 text-sm">
          {data.error} — showing cached data
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Unread Emails</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">
            {data.loading ? "—" : data.totalUnread}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Active Deals</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">
            {data.loading ? "—" : data.deals.total}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-500">Kora</p>
          <p className="text-base md:text-lg font-bold mt-1 text-green-500">● Online</p>
        </div>
      </div>

      {/* Channel Cards - Always side by side */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onNavigate(channel.id)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 md:p-5 text-left hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
          >
            <div className="flex flex-col items-center md:items-start md:flex-row md:justify-between mb-2 md:mb-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center text-lg md:text-2xl`}>
                {channel.icon}
              </div>
              {channel.count > 0 && (
                <span className="mt-1 md:mt-0 px-1.5 py-0.5 text-[10px] md:text-sm font-semibold rounded-full bg-indigo-600 text-white">
                  {channel.count}
                </span>
              )}
            </div>
            <h3 className="text-xs md:text-lg font-semibold text-center md:text-left mb-1 md:mb-2 group-hover:text-indigo-400 transition-colors">
              {channel.title}
            </h3>
            <ul className="hidden md:block space-y-1">
              {data.loading ? (
                <li className="text-sm text-zinc-500 animate-pulse">Loading...</li>
              ) : (
                channel.items.slice(0, 2).map((item, i) => (
                  <li key={i} className="text-sm text-zinc-500 truncate">
                    • {typeof item === "string" ? item : String(item || "")}
                  </li>
                ))
              )}
            </ul>
          </button>
        ))}
      </div>

      {/* Email Accounts Summary */}
      {data.emails.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">📧 Email Accounts</h2>
          <div className="space-y-2">
            {data.emails.map((email, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50">
                <span className="text-sm text-zinc-300">{typeof email.account === "string" ? email.account : String(email.account || "")}</span>
                <span className={`text-sm ${email.unreadCount > 0 ? "text-indigo-400 font-medium" : "text-zinc-500"}`}>
                  {email.unreadCount} unread
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="text-center text-xs text-zinc-600 pt-2">
        Data from Gmail + Deals Pipeline • Last updated: just now
      </div>
    </div>
  );
}
