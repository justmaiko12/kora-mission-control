"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ViewType } from "@/app/page";
import { CustomChannel, listCustomChannels, onCustomChannelsUpdated } from "@/lib/channelStorage";

type Tab = "inbox" | "expenses" | "paid";
type ExpenseStatus = "planned" | "approved" | "partial" | "paid" | "cancelled";
type PaymentMethod = "ach" | "wire" | "paypal" | "check" | "cash" | "other";

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

interface ExpenseTask {
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
  paymentMethod: PaymentMethod;
  paymentDetails?: string;
  notes?: string;
  status: ExpenseStatus;
  paidAmount?: number;
  paymentHistory?: PaymentRecord[];
  createdAt?: string;
  updatedAt?: string;
}

interface Submission {
  id: string;
  owner_company_id: string;
  submitter_name: string;
  submitter_email: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_details?: string;
  notes?: string;
  status: string;
  attachment_path?: string;
  submitted_at?: string;
}

const statusBadgeStyles: Record<ExpenseStatus, string> = {
  planned: "border border-slate-600 bg-slate-800/60 text-slate-300",
  approved: "border border-blue-600 bg-blue-900/40 text-blue-300",
  partial: "border border-amber-600 bg-amber-900/40 text-amber-300",
  paid: "border border-emerald-600 bg-emerald-900/40 text-emerald-300",
  cancelled: "border border-zinc-600 bg-zinc-800/40 text-zinc-400",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  ach: "ACH Transfer",
  wire: "Wire Transfer",
  paypal: "PayPal",
  check: "Check",
  cash: "Cash",
  other: "Other",
};

const toDate = (value: string) => new Date(`${value}T00:00:00`);
const formatCurrency = (amount: number, currency: string = "$") =>
  `${currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayablesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [tasks, setTasks] = useState<ExpenseTask[]>([]);
  const [paidTasks, setPaidTasks] = useState<ExpenseTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "past_due" | "due_this_week">("all");
  
  // Detail panels
  const [selectedTask, setSelectedTask] = useState<ExpenseTask | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");
  
  // New expense form
  const [newExpense, setNewExpense] = useState({
    title: "",
    vendorName: "",
    vendorEmail: "",
    amount: "",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    paymentMethod: "other" as PaymentMethod,
    paymentDetails: "",
    notes: "",
  });

  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [activeCustomChannelId, setActiveCustomChannelId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const today = useMemo(() => new Date(new Date().toDateString()), []);
  const weekAhead = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksRes, subsRes] = await Promise.all([
        fetch("/api/payables?includePaid=true"),
        fetch("/api/payables/submissions"),
      ]);
      
      const tasksData = await tasksRes.json();
      const subsData = await subsRes.json();
      
      if (tasksData.success) {
        setTasks(tasksData.payables || []);
        setPaidTasks(tasksData.paidPayables || []);
      }
      if (subsData.success) {
        setSubmissions(subsData.submissions || []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshCustomChannels = useCallback(async () => {
    const channels = await listCustomChannels();
    setCustomChannels(channels);
  }, []);

  useEffect(() => {
    refreshCustomChannels();
    const unsubscribe = onCustomChannelsUpdated(setCustomChannels);
    return unsubscribe;
  }, [refreshCustomChannels]);

  // Summary calculations
  const summary = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== "paid" && t.status !== "cancelled");
    const totalPending = pending.reduce((sum, t) => sum + Math.max(0, t.amount - (t.paidAmount || 0)), 0);
    const dueThisWeek = pending.filter((t) => {
      const due = toDate(t.dueDate);
      return due >= today && due < weekAhead;
    });
    const overdue = pending.filter((t) => toDate(t.dueDate) < today);

    return {
      totalPending,
      dueThisWeekCount: dueThisWeek.length,
      dueThisWeekTotal: dueThisWeek.reduce((sum, t) => sum + Math.max(0, t.amount - (t.paidAmount || 0)), 0),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((sum, t) => sum + Math.max(0, t.amount - (t.paidAmount || 0)), 0),
      inboxCount: submissions.length,
    };
  }, [tasks, submissions, today, weekAhead]);

  // Filtered lists
  const filteredTasks = useMemo(() => {
    let list = activeTab === "paid" ? paidTasks : tasks;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.vendorName.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.vendorEmail.toLowerCase().includes(q)
      );
    }
    
    if (quickFilter === "past_due" && activeTab !== "paid") {
      list = list.filter((t) => toDate(t.dueDate) < today && t.status !== "paid");
    } else if (quickFilter === "due_this_week" && activeTab !== "paid") {
      list = list.filter((t) => {
        const due = toDate(t.dueDate);
        return due >= today && due < weekAhead;
      });
    }
    
    return list;
  }, [tasks, paidTasks, activeTab, searchTerm, quickFilter, today, weekAhead]);

  // Handlers
  const handleNavigate = (view: ViewType) => {
    router.push(`/?view=${view}`);
  };

  const handleCreateExpense = async () => {
    if (!newExpense.title || !newExpense.vendorName || !newExpense.amount) {
      alert("Please fill in required fields");
      return;
    }
    
    const res = await fetch("/api/payables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newExpense.title,
        vendorName: newExpense.vendorName,
        vendorEmail: newExpense.vendorEmail,
        amount: parseFloat(newExpense.amount),
        dueDate: newExpense.dueDate,
        paymentMethod: newExpense.paymentMethod,
        paymentDetails: newExpense.paymentDetails,
        notes: newExpense.notes,
      }),
    });
    
    const data = await res.json();
    if (data.success) {
      setTasks((prev) => [data.task, ...prev]);
      setIsCreating(false);
      setNewExpense({
        title: "",
        vendorName: "",
        vendorEmail: "",
        amount: "",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        paymentMethod: "other",
        paymentDetails: "",
        notes: "",
      });
    } else {
      alert(data.error || "Failed to create expense");
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedTask || !paymentAmount) return;
    
    const amt = parseFloat(paymentAmount);
    if (amt <= 0) return;
    
    const history: PaymentRecord[] = [...(selectedTask.paymentHistory || [])];
    history.push({
      id: crypto.randomUUID(),
      amount: amt,
      date: paymentDate,
      note: paymentNote || undefined,
    });
    
    const totalPaid = history.reduce((sum, r) => sum + r.amount, 0);
    const newStatus: ExpenseStatus = totalPaid >= selectedTask.amount ? "paid" : totalPaid > 0 ? "partial" : selectedTask.status;
    
    const res = await fetch("/api/payables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedTask.id,
        paidAmount: totalPaid,
        paymentHistory: history,
        status: newStatus,
      }),
    });
    
    const data = await res.json();
    if (data.success) {
      const updatedTask = data.task;
      if (updatedTask.status === "paid") {
        setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
        setPaidTasks((prev) => [updatedTask, ...prev]);
      } else {
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      }
      setSelectedTask(updatedTask);
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNote("");
    }
  };

  const handleMarkAsPaid = async (task: ExpenseTask) => {
    const remaining = Math.max(0, task.amount - (task.paidAmount || 0));
    if (remaining <= 0) return;
    
    if (!confirm(`Mark as paid? This will record ${formatCurrency(remaining, task.currency)} as payment.`)) return;
    
    const history: PaymentRecord[] = [...(task.paymentHistory || [])];
    history.push({
      id: crypto.randomUUID(),
      amount: remaining,
      date: new Date().toISOString().split("T")[0],
      note: "Marked as paid",
    });
    
    const res = await fetch("/api/payables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        paidAmount: task.amount,
        paymentHistory: history,
        status: "paid",
      }),
    });
    
    const data = await res.json();
    if (data.success) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setPaidTasks((prev) => [data.task, ...prev]);
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
    }
  };

  const handleApproveSubmission = async (sub: Submission) => {
    const res = await fetch("/api/payables/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id, action: "approve" }),
    });
    
    const data = await res.json();
    if (data.success) {
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      setSelectedSubmission(null);
      fetchData(); // Refresh to get new task
    }
  };

  const handleDeclineSubmission = async (sub: Submission) => {
    if (!confirm("Decline this submission?")) return;
    
    const res = await fetch("/api/payables/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id, action: "decline" }),
    });
    
    const data = await res.json();
    if (data.success) {
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      setSelectedSubmission(null);
    }
  };

  const closePanel = () => {
    setSelectedTask(null);
    setSelectedSubmission(null);
    setIsCreating(false);
  };

  const panelOpen = selectedTask || selectedSubmission || isCreating;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">💸 Expenses</h1>
            <p className="text-zinc-500 mt-1">Track bills and payments</p>
          </div>
          <button
            onClick={() => { setIsCreating(true); setSelectedTask(null); setSelectedSubmission(null); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold text-sm transition"
          >
            + New Expense
          </button>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-200 rounded-xl p-4">{error}</div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-zinc-500">📋 Total Pending</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalPending)}</p>
          </div>
          <div className="bg-amber-900/30 border border-amber-800/60 rounded-xl p-4">
            <p className="text-sm text-amber-300">⏰ Due This Week</p>
            <p className="text-2xl font-bold mt-1 text-amber-200">{summary.dueThisWeekCount}</p>
            <p className="text-xs text-amber-300 mt-1">{formatCurrency(summary.dueThisWeekTotal)}</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/60 rounded-xl p-4">
            <p className="text-sm text-red-300">🚨 Overdue</p>
            <p className="text-2xl font-bold mt-1 text-red-200">{summary.overdueCount}</p>
            <p className="text-xs text-red-300 mt-1">{formatCurrency(summary.overdueTotal)}</p>
          </div>
          <div className="bg-blue-950/30 border border-blue-900/60 rounded-xl p-4">
            <p className="text-sm text-blue-300">📥 Inbox</p>
            <p className="text-2xl font-bold mt-1 text-blue-200">{summary.inboxCount}</p>
            <p className="text-xs text-blue-300 mt-1">pending review</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl w-fit">
          {[
            { id: "inbox" as Tab, label: "Inbox", count: submissions.length },
            { id: "expenses" as Tab, label: "Expenses", count: tasks.length },
            { id: "paid" as Tab, label: "Paid", count: paidTasks.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-600 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm w-48"
          />
          {activeTab !== "inbox" && (
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value as typeof quickFilter)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm"
            >
              <option value="all">All</option>
              <option value="past_due">Past Due</option>
              <option value="due_this_week">Due This Week</option>
            </select>
          )}
        </div>

        {/* Content */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          {activeTab === "inbox" ? (
            // Inbox - Submissions
            <div className="divide-y divide-zinc-800">
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No pending submissions</div>
              ) : (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => { setSelectedSubmission(sub); setSelectedTask(null); setIsCreating(false); }}
                    className={`p-4 hover:bg-zinc-800/50 cursor-pointer transition ${
                      selectedSubmission?.id === sub.id ? "bg-zinc-800/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{sub.submitter_name}</p>
                        <p className="text-sm text-zinc-500">{sub.submitter_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(sub.amount, sub.currency)}</p>
                        <p className="text-xs text-zinc-500">Due {sub.due_date}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Expenses / Paid - Tasks table
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/60 text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Vendor</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const due = toDate(task.dueDate);
                  const isOverdue = due < today && task.status !== "paid";
                  const outstanding = Math.max(0, task.amount - (task.paidAmount || 0));

                  return (
                    <tr
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setSelectedSubmission(null); setIsCreating(false); }}
                      className={`border-t border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition ${
                        selectedTask?.id === task.id ? "bg-zinc-800/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{task.vendorName}</p>
                        <p className="text-xs text-zinc-500">{task.vendorEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-200">{task.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatCurrency(outstanding, task.currency)}</p>
                        {task.paidAmount && task.paidAmount > 0 && task.status !== "paid" && (
                          <p className="text-xs text-zinc-500">{formatCurrency(task.paidAmount, task.currency)} paid</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isOverdue ? "text-red-400 font-medium" : "text-zinc-300"}>
                          {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeStyles[task.status]}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {task.status !== "paid" && (
                          <button
                            onClick={() => handleMarkAsPaid(task)}
                            className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-xs font-medium transition"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      {isLoading ? "Loading..." : "No expenses found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Detail Panel */}
      {panelOpen && (
        <div className="w-[450px] border-l border-zinc-800 bg-zinc-900/90 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold">
              {isCreating ? "New Expense" : selectedSubmission ? "Submission Details" : "Expense Details"}
            </h3>
            <button onClick={closePanel} className="p-2 hover:bg-zinc-800 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Create New Expense Form */}
            {isCreating && (
              <>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    placeholder="e.g., Pay Editor"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      value={newExpense.vendorName}
                      onChange={(e) => setNewExpense({ ...newExpense, vendorName: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Vendor Email</label>
                    <input
                      type="email"
                      value={newExpense.vendorEmail}
                      onChange={(e) => setNewExpense({ ...newExpense, vendorEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Amount *</label>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newExpense.dueDate}
                      onChange={(e) => setNewExpense({ ...newExpense, dueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Payment Method</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  >
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Payment Details</label>
                  <input
                    type="text"
                    value={newExpense.paymentDetails}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentDetails: e.target.value })}
                    placeholder="PayPal email, bank info, etc."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                  <textarea
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none"
                  />
                </div>
                <button
                  onClick={handleCreateExpense}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition"
                >
                  Create Expense
                </button>
              </>
            )}

            {/* Submission Detail */}
            {selectedSubmission && (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500">Submitter</p>
                    <p className="font-medium">{selectedSubmission.submitter_name}</p>
                    <p className="text-sm text-zinc-400">{selectedSubmission.submitter_email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">Amount</p>
                      <p className="font-semibold text-lg">{formatCurrency(selectedSubmission.amount, selectedSubmission.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Due Date</p>
                      <p className="font-medium">{selectedSubmission.due_date}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Payment Method</p>
                    <p className="font-medium">{paymentMethodLabels[selectedSubmission.payment_method]}</p>
                    {selectedSubmission.payment_details && (
                      <p className="text-sm text-zinc-400 mt-1">{selectedSubmission.payment_details}</p>
                    )}
                  </div>
                  {selectedSubmission.notes && (
                    <div>
                      <p className="text-xs text-zinc-500">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedSubmission.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleApproveSubmission(selectedSubmission)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleDeclineSubmission(selectedSubmission)}
                    className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold transition"
                  >
                    ✕ Decline
                  </button>
                </div>
              </>
            )}

            {/* Task Detail */}
            {selectedTask && (
              <>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{selectedTask.title}</p>
                      <p className="text-zinc-400">{selectedTask.vendorName}</p>
                      <p className="text-sm text-zinc-500">{selectedTask.vendorEmail}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeStyles[selectedTask.status]}`}>
                      {selectedTask.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-zinc-800">
                    <div>
                      <p className="text-xs text-zinc-500">Total Amount</p>
                      <p className="font-semibold text-lg">{formatCurrency(selectedTask.amount, selectedTask.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Outstanding</p>
                      <p className="font-semibold text-lg text-amber-300">
                        {formatCurrency(Math.max(0, selectedTask.amount - (selectedTask.paidAmount || 0)), selectedTask.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Due Date</p>
                      <p className="font-medium">{selectedTask.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Payment Method</p>
                      <p className="font-medium">{paymentMethodLabels[selectedTask.paymentMethod]}</p>
                    </div>
                  </div>

                  {selectedTask.paymentDetails && (
                    <div>
                      <p className="text-xs text-zinc-500">Payment Details</p>
                      <p className="text-sm whitespace-pre-wrap bg-zinc-800 p-2 rounded mt-1">{selectedTask.paymentDetails}</p>
                    </div>
                  )}

                  {selectedTask.notes && (
                    <div>
                      <p className="text-xs text-zinc-500">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedTask.notes}</p>
                    </div>
                  )}

                  {/* Payment History */}
                  {selectedTask.paymentHistory && selectedTask.paymentHistory.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Payment History</p>
                      <div className="space-y-2">
                        {selectedTask.paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between bg-zinc-800 p-2 rounded">
                            <div>
                              <p className="font-medium">{formatCurrency(payment.amount, selectedTask.currency)}</p>
                              {payment.note && <p className="text-xs text-zinc-500">{payment.note}</p>}
                            </div>
                            <p className="text-xs text-zinc-500">{payment.date.split("T")[0]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedTask.status !== "paid" && (
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        setPaymentAmount(String(Math.max(0, selectedTask.amount - (selectedTask.paidAmount || 0))));
                        setShowPaymentModal(true);
                      }}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition"
                    >
                      Record Payment
                    </button>
                    <button
                      onClick={() => handleMarkAsPaid(selectedTask)}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition"
                    >
                      Mark Paid
                    </button>
                  </div>
                )}

                <a
                  href="https://internal-promo-invoicer.vercel.app?view=payables"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 text-center bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-sm transition mt-2"
                >
                  Open in Invoicer →
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g., via PayPal"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition"
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
