"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ViewType } from "@/app/page";
import { CustomChannel, listCustomChannels, onCustomChannelsUpdated } from "@/lib/channelStorage";

const statusFilterOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

type ExpensePayableStatus = "planned" | "approved" | "partial" | "paid" | "cancelled";

interface ExpensePayable {
  id: string;
  ownerCompanyId: string;
  submissionId?: string;
  title: string;
  vendorName: string;
  vendorEmail: string;
  invoiceDate?: string;
  dueDate: string;
  amount: number;
  currency: string;
  paymentMethod: "ach" | "wire" | "paypal" | "check" | "cash" | "other";
  paymentDetails?: string;
  notes?: string;
  status: ExpensePayableStatus;
  paidAmount?: number;
  paymentHistory?: PaymentRecord[];
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

interface PromoTask {
  id: string;
  title: string;
  clientName?: string;
  fee?: number;
  status: string;
  workStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
}

const pendingStatuses = new Set<ExpensePayableStatus>(["planned", "approved", "partial"]);

const statusBadgeStyles: Record<ExpensePayableStatus, string> = {
  planned: "border border-slate-700 bg-slate-900/40 text-slate-300",
  approved: "border border-blue-700 bg-blue-900/40 text-blue-300",
  partial: "border border-amber-700 bg-amber-900/40 text-amber-300",
  paid: "border border-emerald-700 bg-emerald-900/40 text-emerald-300",
  cancelled: "border border-zinc-700 bg-zinc-900/40 text-zinc-400",
};

const toDate = (value: string) => new Date(`${value}T00:00:00`);

const getOutstandingAmount = (payable: ExpensePayable) => {
  const paidAmount = payable.paidAmount ?? 0;
  return Math.max(0, payable.amount - paidAmount);
};

export default function PayablesPage() {
  const router = useRouter();
  const [payables, setPayables] = useState<ExpensePayable[]>([]);
  const [promoTasks, setPromoTasks] = useState<PromoTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [activeCustomChannelId, setActiveCustomChannelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"deals" | "expenses">("deals");

  useEffect(() => {
    let isMounted = true;

    const fetchPayables = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/payables");
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load payables");
        }
        if (isMounted) {
          setPayables(payload.payables ?? []);
          setPromoTasks(payload.promoTasks ?? []);
          setError(null);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load payables");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPayables();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshCustomChannels = useCallback(async () => {
    const channels = await listCustomChannels();
    setCustomChannels(channels);
    if (channels.length && !activeCustomChannelId) {
      setActiveCustomChannelId(channels[0].id);
    }
  }, [activeCustomChannelId]);

  useEffect(() => {
    refreshCustomChannels();
    const unsubscribe = onCustomChannelsUpdated((channels) => {
      setCustomChannels(channels);
      if (channels.length && !activeCustomChannelId) {
        setActiveCustomChannelId(channels[0].id);
      }
    });
    return unsubscribe;
  }, [activeCustomChannelId, refreshCustomChannels]);

  const handleNavigate = (view: ViewType) => {
    router.push(`/?view=${view}`);
  };

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const weekAhead = useMemo(() => {
    const date = new Date(today);
    date.setDate(today.getDate() + 7);
    return date;
  }, [today]);

  const summary = useMemo(() => {
    // Expense payables
    const pending = payables.filter((payable) => pendingStatuses.has(payable.status));
    const totalPending = pending.reduce((sum, payable) => sum + getOutstandingAmount(payable), 0);
    const dueThisWeek = pending.filter((payable) => {
      const dueDate = toDate(payable.dueDate);
      return dueDate >= today && dueDate < weekAhead;
    });
    const overdue = pending.filter((payable) => toDate(payable.dueDate) < today);

    // Promo tasks (deals) - unpaid or not invoiced
    const unpaidDeals = promoTasks.filter((t) => !t.paymentStatus || t.paymentStatus === "unpaid" || t.paymentStatus === "partial");
    const totalDealsAmount = unpaidDeals.reduce((sum, t) => sum + (t.fee || 0), 0);

    return {
      totalPending,
      dueThisWeekCount: dueThisWeek.length,
      dueThisWeekTotal: dueThisWeek.reduce((sum, payable) => sum + getOutstandingAmount(payable), 0),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((sum, payable) => sum + getOutstandingAmount(payable), 0),
      totalDeals: unpaidDeals.length,
      totalDealsAmount,
    };
  }, [payables, promoTasks, today, weekAhead]);

  const filteredPayables = useMemo(() => {
    return payables.filter((payable) => {
      if (statusFilter === "pending" && !["planned", "approved"].includes(payable.status)) {
        return false;
      }
      if (statusFilter === "partial" && payable.status !== "partial") {
        return false;
      }
      if (statusFilter === "paid" && payable.status !== "paid") {
        return false;
      }

      if (searchTerm && !payable.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      if (startDate) {
        const start = toDate(startDate);
        if (toDate(payable.dueDate) < start) {
          return false;
        }
      }

      if (endDate) {
        const end = toDate(endDate);
        if (toDate(payable.dueDate) > end) {
          return false;
        }
      }

      return true;
    });
  }, [payables, statusFilter, searchTerm, startDate, endDate]);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-800 rounded-lg"
        onClick={() => setSidebarOpen(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar
        activeView="payables"
        onNavigate={handleNavigate}
        customChannels={customChannels}
        activeCustomChannelId={activeCustomChannelId}
        onSelectCustomChannel={(channelId) => {
          setActiveCustomChannelId(channelId);
          router.push(`/?view=custom&channelId=${channelId}`);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payables Dashboard</h1>
            <p className="text-zinc-500 mt-1">Track upcoming invoices and payment obligations.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">Updated</p>
            <p className="text-lg font-semibold">
              {today.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-200 rounded-xl p-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-900/30 border border-green-800/60 rounded-xl p-4">
            <p className="text-sm text-green-300">💰 Deals Awaiting Payment</p>
            <p className="text-3xl font-bold mt-1 text-green-200">{summary.totalDeals}</p>
            <p className="text-xs text-green-300 mt-1">{formatCurrency(summary.totalDealsAmount, "USD")} pending</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-zinc-500">📋 Expenses Pending</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalPending, "USD")}</p>
            <p className="text-xs text-zinc-500 mt-1">Outstanding bills to pay</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-zinc-500">Due This Week</p>
            <p className="text-3xl font-bold mt-1">{summary.dueThisWeekCount}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {formatCurrency(summary.dueThisWeekTotal, "USD")} scheduled
            </p>
          </div>
          <div className="bg-red-950/30 border border-red-900/60 rounded-xl p-4">
            <p className="text-sm text-red-300">Overdue</p>
            <p className="text-3xl font-bold mt-1 text-red-200">{summary.overdueCount}</p>
            <p className="text-xs text-red-300 mt-1">{formatCurrency(summary.overdueTotal, "USD")} past due</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("deals")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "deals"
                ? "bg-green-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            💰 Brand Deals ({promoTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "expenses"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            📋 Expenses ({payables.length})
          </button>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500">Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500">Vendor Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search vendor name"
                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* Deals Table */}
        {activeTab === "deals" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">💰 Brand Deals</h2>
                <p className="text-sm text-zinc-500">{promoTasks.length} deals awaiting payment</p>
              </div>
              {isLoading && <span className="text-sm text-zinc-500">Loading...</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950/60 text-zinc-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Deal</th>
                    <th className="text-left px-5 py-3 font-medium">Client</th>
                    <th className="text-left px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Work Status</th>
                    <th className="text-left px-5 py-3 font-medium">Payment</th>
                    <th className="text-left px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoTasks.map((task) => (
                    <tr key={task.id} className="border-t border-zinc-800 hover:bg-white/5 transition">
                      <td className="px-5 py-4">
                        <div className="font-medium text-zinc-200">{task.title}</div>
                        {task.createdAt && (
                          <div className="text-xs text-zinc-500">
                            Added {new Date(task.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-zinc-300">{task.clientName || "—"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-green-400">
                          {task.fee ? formatCurrency(task.fee, "USD") : "TBD"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          task.workStatus === "completed" 
                            ? "bg-green-900/40 text-green-300 border border-green-700"
                            : task.workStatus === "in_progress"
                            ? "bg-blue-900/40 text-blue-300 border border-blue-700"
                            : "bg-zinc-900/40 text-zinc-400 border border-zinc-700"
                        }`}>
                          {task.workStatus || task.status || "pending"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          task.paymentStatus === "paid"
                            ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
                            : task.paymentStatus === "partial"
                            ? "bg-amber-900/40 text-amber-300 border border-amber-700"
                            : "bg-red-900/40 text-red-300 border border-red-700"
                        }`}>
                          {task.paymentStatus || "unpaid"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/30 transition text-xs font-semibold">
                          Create Invoice
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!isLoading && promoTasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                        No deals awaiting payment. All caught up! 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        {activeTab === "expenses" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">📋 Expenses</h2>
                <p className="text-sm text-zinc-500">{filteredPayables.length} records found</p>
              </div>
              {isLoading && <span className="text-sm text-zinc-500">Loading...</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950/60 text-zinc-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Vendor</th>
                    <th className="text-left px-5 py-3 font-medium">Description</th>
                    <th className="text-left px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Due Date</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayables.map((payable) => {
                    const dueDate = toDate(payable.dueDate);
                    const isOverdue = dueDate < today;

                    return (
                      <tr key={payable.id} className="border-t border-zinc-800 hover:bg-white/5 transition">
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-200">{payable.vendorName}</div>
                          <div className="text-xs text-zinc-500">{payable.vendorEmail}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-200">{payable.title}</div>
                          {payable.notes && <div className="text-xs text-zinc-500 line-clamp-1">{payable.notes}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-200">
                            {formatCurrency(getOutstandingAmount(payable), payable.currency)}
                          </div>
                          {payable.paidAmount && payable.paidAmount > 0 && (
                            <div className="text-xs text-zinc-500">
                              {formatCurrency(payable.paidAmount, payable.currency)} paid
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-medium ${isOverdue ? "text-red-300" : "text-zinc-300"}`}>
                            {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeStyles[payable.status]}`}>
                            {payable.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition text-xs font-semibold">
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!isLoading && filteredPayables.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                        No expenses match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
