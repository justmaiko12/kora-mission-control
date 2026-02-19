"use client";

import { useState, useEffect } from "react";

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

interface InvoicePreview {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  items: LineItem[];
  notes: string;
  taxRate: number;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
}

interface InvoiceGeneratorProps {
  deal: Deal;
  emailSubject: string;
  emailFrom: string; // The main sender from the email thread
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

// Generate invoice number
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// Get date strings
function getDateString(daysFromNow = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

// Extract client name from email "From" field
function extractClientName(from: string): string {
  const match = from.match(/^([^<]+)/);
  if (match) {
    return match[1].trim().replace(/["']/g, "");
  }
  return from.split("@")[0];
}

// Extract email from "From" field
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  if (from.includes("@")) return from.trim();
  return "";
}

export default function InvoiceGenerator({
  deal,
  emailSubject,
  emailFrom,
  onClose,
  onSuccess,
}: InvoiceGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Invoice form state
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(getDateString());
  const [dueDate, setDueDate] = useState(getDateString(30)); // Net 30
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("Thank you for your business!");
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState("USD");

  // Initialize from deal data
  useEffect(() => {
    // Extract client info - prefer emailFrom for accurate sender email
    const fromField = emailFrom || deal.from;
    const name = deal.clientName || extractClientName(fromField);
    const email = extractEmail(fromField);
    
    setClientName(name);
    setClientEmail(email);
    
    // Create initial line item from deal
    const description = deal.subject || emailSubject || "Services rendered";
    const amount = deal.amount || 0;
    
    setItems([{
      id: "item_1",
      description: description.substring(0, 100),
      quantity: 1,
      unitPrice: amount,
    }]);
  }, [deal, emailSubject, emailFrom]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Add line item
  const addItem = () => {
    setItems([...items, {
      id: `item_${Date.now()}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
    }]);
  };

  // Remove line item
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Update line item
  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Create invoice
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
      onSuccess(data.invoiceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              📄 Generate Invoice
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Auto-filled from deal • Review before sending
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              {items.map((item, idx) => (
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

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              Will sync to Invoicer Pro
            </span>
            <button
              onClick={handleCreate}
              disabled={creating || total === 0}
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
                  Create Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
