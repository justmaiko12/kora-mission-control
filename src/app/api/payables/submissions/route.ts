import { NextResponse } from "next/server";
import { getInvoicerSupabase } from "@/lib/invoicerSupabase";

export async function GET() {
  const { data, error } = await getInvoicerSupabase()
    .from("expense_submissions")
    .select("*")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, submissions: data ?? [] });
}
