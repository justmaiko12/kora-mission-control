"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Deal {
  id: string;
  subject: string;
  from: string;
  amount?: number | null;
  clientName?: string;
  account: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Company {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  paymentInstructions?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  sender: Company | null;
  client: Company;
  items: LineItem[];
  notes: string;
  taxRate: number;
  currency: string;
}

interface InvoiceGeneratorProps {
  deal: Deal;
  emailSubject: string;
  emailFrom: string;
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

// Fallback sender presets (used while loading real data)
const FALLBACK_SENDER: Company = {
  name: "Loading...",
  address: "",
  email: "",
  phone: "",
  paymentInstructions: "",
};

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

function getDateString(daysFromNow = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

function extractClientName(from: string): string {
  const match = from.match(/^([^<]+)/);
  if (match) return match[1].trim().replace(/["']/g, "");
  return from.split("@")[0];
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  if (from.includes("@")) return from.trim();
  return "";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Invoice Preview Component - Matches Invoicer Pro design
function InvoicePreview({ data, id = "invoice-preview" }: { data: InvoiceData; id?: string }) {
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount;

  const currencySymbol = data.currency === "USD" ? "$" : data.currency === "EUR" ? "€" : "£";

  const formatMoney = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getAddressLines = (c?: Company | null): string[] => {
    if (!c) return [];
    const raw = (c.address || "").trim();
    return raw ? raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
  };

  return (
    <div
      id={id}
      className="bg-white w-full max-w-[210mm] mx-auto shadow-xl min-h-[297mm] relative text-slate-900 font-sans overflow-hidden"
      style={{ aspectRatio: "210 / 297" }}
    >
      <div className="h-full relative">
        {/* Top Accent Bar */}
        <div className="h-2 w-full bg-slate-900"></div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div className="flex-1">
              {data.sender?.logoUrl ? (
                <img src={data.sender.logoUrl} alt="Logo" className="h-16 w-auto object-contain mb-3" />
              ) : (
                <div className="h-12 w-12 bg-slate-900 text-white flex items-center justify-center font-bold text-xl rounded-lg mb-3">
                  {data.sender?.name?.charAt(0) || "C"}
                </div>
              )}
              <div className="text-slate-500 text-sm leading-relaxed">
                {data.sender ? (
                  <>
                    <p className="text-slate-900 font-bold text-base mb-1">{data.sender.name}</p>
                    {getAddressLines(data.sender).map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                    {(data.sender.email || data.sender.phone) && (
                      <div className="mt-1 text-xs opacity-75">
                        <p>{data.sender.email}</p>
                        {data.sender.phone && <p>{data.sender.phone}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="italic text-slate-300">Sender not configured</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-4xl md:text-5xl font-extralight text-slate-200 tracking-tighter leading-none mb-1">
                INVOICE
              </h1>
              <p className="text-lg font-bold text-slate-900 tracking-wide">{data.invoiceNumber}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-12 gap-4 md:gap-6 mb-10 border-t border-b border-slate-100 py-6">
            <div className="col-span-12 md:col-span-5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Bill To</h3>
              <div className="text-slate-800">
                <p className="font-bold text-lg mb-0.5">{data.client.name || "Client Name"}</p>
                <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">
                  {getAddressLines(data.client).join("\n")}
                </p>
                {data.client.email && (
                  <p className="text-sm text-indigo-600 mt-1.5 font-medium">{data.client.email}</p>
                )}
              </div>
            </div>

            <div className="col-span-12 md:col-span-7 flex flex-wrap justify-start md:justify-end gap-4 md:gap-6">
              <div className="text-left md:text-right">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date Issued</h3>
                <p className="text-sm font-medium text-slate-900">{formatDate(data.date)}</p>
              </div>
              <div className="text-left md:text-right">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</h3>
                <p className="text-sm font-medium text-slate-900">{formatDate(data.dueDate)}</p>
              </div>
              <div className="text-left md:text-right">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount Due</h3>
                <p className="text-base font-bold text-slate-900">{formatMoney(total)}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-2 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest rounded-l-lg">
                    Description
                  </th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16">
                    Qty
                  </th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">
                    Price
                  </th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24 rounded-r-lg">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-none">
                    <td className="py-3 px-3 text-sm font-medium text-slate-800">{item.description}</td>
                    <td className="py-3 px-3 text-right text-sm text-slate-500 tabular-nums">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-sm text-slate-500 tabular-nums">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-bold text-slate-900 tabular-nums">
                      {formatMoney(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
                {data.items.length < 3 && (
                  <tr className="h-16">
                    <td colSpan={4}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer - Payment & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Payment Details */}
            <div className="space-y-4">
              {data.sender?.paymentInstructions && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Payment Details
                  </h3>
                  <div className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                    {data.sender.paymentInstructions}
                  </div>
                </div>
              )}
              {data.notes && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</h3>
                  <p className="text-sm text-slate-500 italic leading-relaxed">"{data.notes}"</p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="flex flex-col items-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-slate-500 py-1">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatMoney(subtotal)}</span>
                </div>
                {data.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-slate-500 py-1">
                    <span className="font-medium">Tax ({data.taxRate}%)</span>
                    <span className="font-medium text-slate-900">{formatMoney(taxAmount)}</span>
                  </div>
                )}
                <div className="my-3 border-t-2 border-slate-900"></div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">Total</span>
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">{formatMoney(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="absolute bottom-0 w-full p-4 md:p-6 border-t border-slate-100 flex justify-between items-end text-[9px] text-slate-400 uppercase tracking-wider">
          <div>
            <p>Generated via Mission Control</p>
          </div>
          <div className="text-right">
            <p>Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceGenerator({
  deal,
  emailSubject,
  emailFrom,
  onClose,
  onSuccess,
}: InvoiceGeneratorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Invoice form state
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(getDateString());
  const [dueDate, setDueDate] = useState(getDateString(30));
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("Thank you for your business!");
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState("USD");

  // Sender company data (fetched from Invoicer)
  const [sender, setSender] = useState<Company | null>(null);
  const [loadingSender, setLoadingSender] = useState(true);

  // Fetch real company data from Invoicer
  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch(`/api/companies?account=${encodeURIComponent(deal.account)}`);
        if (res.ok) {
          const data = await res.json();
          setSender(data.company);
        } else {
          console.error("Failed to fetch company");
          // Use minimal fallback
          setSender({
            name: deal.account.includes("meettherodz") ? "Meet The Rodz" : "Shluv Enterprise LLC",
            email: deal.account,
          });
        }
      } catch (err) {
        console.error("Company fetch error:", err);
        setSender({
          name: deal.account.includes("meettherodz") ? "Meet The Rodz" : "Shluv Enterprise LLC",
          email: deal.account,
        });
      } finally {
        setLoadingSender(false);
      }
    }
    fetchCompany();
  }, [deal.account]);

  // Initialize from deal data
  useEffect(() => {
    const fromField = emailFrom || deal.from;
    const name = deal.clientName || extractClientName(fromField);
    const email = extractEmail(fromField);

    setClientName(name);
    setClientEmail(email);

    const description = deal.subject || emailSubject || "Services rendered";
    const amount = deal.amount || 0;

    setItems([
      {
        id: "item_1",
        description: description.substring(0, 100),
        quantity: 1,
        unitPrice: amount,
      },
    ]);
  }, [deal, emailSubject, emailFrom]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addItem = () => {
    setItems([
      ...items,
      { id: `item_${Date.now()}`, description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Create invoice in Supabase
  const handleCreate = async () => {
    if (!clientName || !clientEmail || items.length === 0 || total === 0) {
      setError("Please fill in all required fields");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          invoiceNumber,
          date: invoiceDate,
          dueDate,
          clientName,
          clientEmail,
          items,
          notes,
          taxRate,
          currency,
          subtotal,
          tax,
          total,
          account: deal.account,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const data = await res.json();
      setInvoiceId(data.invoiceId);
      setMode("preview"); // Switch to preview mode
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    const element = document.getElementById("invoice-preview-modal");
    if (!element) return;

    setDownloading(true);
    try {
      // Dynamic import html2pdf
      const html2pdf = (await import("html2pdf.js")).default;

      const opt = {
        margin: 0,
        filename: `${invoiceNumber}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] as const },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF download failed:", err);
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Send to client via email
  const handleSendToClient = async () => {
    const element = document.getElementById("invoice-preview-modal");
    if (!element) return;

    setSending(true);
    setError(null);

    try {
      // Generate PDF as base64
      const html2pdf = (await import("html2pdf.js")).default;

      const opt = {
        margin: 0,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] as const },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf("blob");

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      // Send email with PDF attachment
      const senderName = sender?.name || "Our Team";
      const paymentInfo = sender?.paymentInstructions 
        ? `Payment Details:\n${sender.paymentInstructions}\n\n` 
        : "";
      
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: deal.account,
          to: clientEmail,
          subject: `Invoice ${invoiceNumber} - ${senderName}`,
          body: `Hi ${clientName},\n\nPlease find attached invoice ${invoiceNumber} for the amount of ${formatMoney(total)}.\n\nDue date: ${formatDate(dueDate)}\n\n${paymentInfo}Thank you for your business!\n\nBest regards,\n${senderName}`,
          attachments: [
            {
              filename: `${invoiceNumber}.pdf`,
              data: `data:application/pdf;base64,${pdfBase64}`,
              mimeType: "application/pdf",
            },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send email");
      }

      // Success!
      onSuccess(invoiceId || "");
      onClose();
    } catch (err) {
      console.error("Send to client failed:", err);
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  // Build invoice data for preview
  const invoiceData: InvoiceData = {
    invoiceNumber,
    date: invoiceDate,
    dueDate,
    sender,
    client: {
      name: clientName,
      email: clientEmail,
    },
    items,
    notes,
    taxRate,
    currency,
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        style={{ maxWidth: mode === "preview" ? "900px" : "700px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              {mode === "edit" ? "📄 Generate Invoice" : "📄 Invoice Preview"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "edit" ? "Auto-filled from deal • Review before creating" : "Ready to download or send"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === "edit" ? (
            // EDIT MODE
            <div className="space-y-4">
              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Invoice #</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Client Info */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <span>👤</span> Bill To
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Company or person name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="billing@company.com"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Line Items</h3>
                  <button
                    onClick={addItem}
                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Description"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 text-center"
                          placeholder="Qty"
                          min="1"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 text-right"
                          placeholder="Price"
                          step="0.01"
                        />
                      </div>
                      <div className="w-24 text-right py-2 text-sm text-zinc-400">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </div>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="flex items-center gap-2">
                      Tax
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-14 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-center"
                        step="0.1"
                        min="0"
                      />
                      %
                    </span>
                    <span>{formatMoney(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-zinc-700">
                    <span>Total</span>
                    <span className="text-emerald-400">{formatMoney(total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Payment terms, thank you note, etc."
                />
              </div>
            </div>
          ) : (
            // PREVIEW MODE
            <div ref={previewRef} className="flex flex-col items-center">
              <div className="transform scale-[0.65] md:scale-75 origin-top">
                <InvoicePreview data={invoiceData} id="invoice-preview-modal" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between flex-shrink-0">
          {mode === "edit" ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {loadingSender ? "Loading company data..." : "Will sync to Invoicer Pro"}
                </span>
                <button
                  onClick={handleCreate}
                  disabled={creating || total === 0 || loadingSender}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      Create & Preview
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode("edit")}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                ← Edit
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  {downloading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendToClient}
                  disabled={sending}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>📧</span>
                      Send to Client
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
