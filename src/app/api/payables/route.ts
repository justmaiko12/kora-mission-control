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

const statusFilter: ExpensePayableStatus[] = ["planned", "approved", "partial"];

export async function GET() {
  const { data, error } = await getInvoicerSupabase()
    .from("expense_payables")
    .select("*")
    .in("status", statusFilter)
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const payables: ExpensePayable[] = (data ?? []).map((row) => ({
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

  return NextResponse.json({ success: true, payables });
}
