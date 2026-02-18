import { NextRequest, NextResponse } from "next/server";
import { getInvoicerSupabase } from "@/lib/invoicerSupabase";

type ExpensePayableStatus = "planned" | "approved" | "partial" | "paid" | "cancelled";

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

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

// Default company (Shluv)
const DEFAULT_COMPANY_ID = "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b";

function mapRow(row: Record<string, unknown>): ExpensePayable {
  return {
    id: row.id as string,
    ownerCompanyId: row.owner_company_id as string,
    submissionId: (row.submission_id as string) ?? undefined,
    title: row.title as string,
    vendorName: row.vendor_name as string,
    vendorEmail: row.vendor_email as string,
    invoiceDate: (row.invoice_date as string) ?? undefined,
    dueDate: row.due_date as string,
    amount: row.amount as number,
    currency: row.currency as string,
    paymentMethod: row.payment_method as ExpensePayable["paymentMethod"],
    paymentDetails: (row.payment_details as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    status: row.status as ExpensePayableStatus,
    paidAmount: (row.paid_amount as number) ?? undefined,
    paymentHistory: (row.payment_history as PaymentRecord[]) ?? undefined,
    approvedBy: (row.approved_by as string) ?? undefined,
    approvedAt: (row.approved_at as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getInvoicerSupabase();
  const { searchParams } = new URL(request.url);
  const includePaid = searchParams.get("includePaid") === "true";
  
  // Build query
  let query = supabase.from("expense_tasks").select("*");
  
  if (!includePaid) {
    query = query.in("status", ["planned", "approved", "partial"]);
  }
  
  const { data: expenseData, error: expenseError } = await query.order("due_date", { ascending: true });

  if (expenseError) {
    return NextResponse.json(
      { success: false, error: expenseError.message },
      { status: 500 }
    );
  }

  const payables = (expenseData ?? []).map(mapRow);
  
  // Separate active vs paid
  const activePayables = payables.filter(p => p.status !== "paid");
  const paidPayables = payables.filter(p => p.status === "paid");

  return NextResponse.json({ 
    success: true, 
    payables: activePayables,
    paidPayables,
    summary: {
      pendingPayables: activePayables.length,
      totalPayablesAmount: activePayables.reduce((sum, p) => sum + Math.max(0, p.amount - (p.paidAmount || 0)), 0),
    }
  });
}

// Create new expense task
export async function POST(request: NextRequest) {
  const supabase = getInvoicerSupabase();
  const body = await request.json();
  
  const newTask = {
    id: crypto.randomUUID(),
    owner_company_id: body.ownerCompanyId || DEFAULT_COMPANY_ID,
    title: body.title,
    vendor_name: body.vendorName,
    vendor_email: body.vendorEmail || "",
    invoice_date: body.invoiceDate || null,
    due_date: body.dueDate,
    amount: body.amount,
    currency: body.currency || "$",
    payment_method: body.paymentMethod || "other",
    payment_details: body.paymentDetails || null,
    notes: body.notes || null,
    status: "planned",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const { data, error } = await supabase
    .from("expense_tasks")
    .insert(newTask)
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, task: mapRow(data) });
}

// Update expense task (status, payment, notes, etc.)
export async function PATCH(request: NextRequest) {
  const supabase = getInvoicerSupabase();
  const body = await request.json();
  const { id, ...updates } = body;
  
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing task id" }, { status: 400 });
  }
  
  // Map camelCase to snake_case
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.vendorName !== undefined) dbUpdates.vendor_name = updates.vendorName;
  if (updates.vendorEmail !== undefined) dbUpdates.vendor_email = updates.vendorEmail;
  if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.paymentDetails !== undefined) dbUpdates.payment_details = updates.paymentDetails;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
  if (updates.paymentHistory !== undefined) dbUpdates.payment_history = updates.paymentHistory;
  
  const { data, error } = await supabase
    .from("expense_tasks")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, task: mapRow(data) });
}
