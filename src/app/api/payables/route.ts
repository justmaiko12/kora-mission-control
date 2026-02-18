import { NextResponse } from "next/server";
import { getInvoicerSupabase } from "@/lib/invoicerSupabase";

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
  paymentHistory?: unknown[];
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

const expenseStatusFilter: ExpensePayableStatus[] = ["planned", "approved", "partial"];

export async function GET() {
  const supabase = getInvoicerSupabase();
  
  // Fetch expense payables (bills to pay)
  const { data: expenseData, error: expenseError } = await supabase
    .from("expense_payables")
    .select("*")
    .in("status", expenseStatusFilter)
    .order("due_date", { ascending: true });

  // Fetch promo tasks that need invoicing or payment
  // payment_status: null/unpaid = needs to be invoiced/paid
  const { data: promoData, error: promoError } = await supabase
    .from("promo_tasks")
    .select("*")
    .or("payment_status.is.null,payment_status.eq.unpaid,payment_status.eq.partial")
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false });

  if (expenseError && promoError) {
    return NextResponse.json(
      { success: false, error: expenseError?.message || promoError?.message },
      { status: 500 }
    );
  }

  // Map expense payables
  const payables: ExpensePayable[] = (expenseData ?? []).map((row) => ({
    id: row.id,
    ownerCompanyId: row.owner_company_id,
    submissionId: row.submission_id ?? undefined,
    title: row.title,
    vendorName: row.vendor_name,
    vendorEmail: row.vendor_email,
    invoiceDate: row.invoice_date ?? undefined,
    dueDate: row.due_date,
    amount: row.amount,
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentDetails: row.payment_details ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    paidAmount: row.paid_amount ?? undefined,
    paymentHistory: row.payment_history ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }));

  // Map promo tasks (deals awaiting payment)
  const promoTasks: PromoTask[] = (promoData ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    clientName: row.client_name ?? undefined,
    fee: row.fee ?? undefined,
    status: row.status,
    workStatus: row.work_status ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    createdAt: row.created_at ?? undefined,
  }));

  return NextResponse.json({ 
    success: true, 
    payables,
    promoTasks,
    summary: {
      pendingPayables: payables.length,
      pendingDeals: promoTasks.length,
      totalPayablesAmount: payables.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalDealsAmount: promoTasks.reduce((sum, t) => sum + (t.fee || 0), 0),
    }
  });
}
