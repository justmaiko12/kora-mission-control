import { NextRequest, NextResponse } from "next/server";
import { getInvoicerSupabase } from "@/lib/invoicerSupabase";

const DEFAULT_COMPANY_ID = "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b";

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

// Approve submission -> create expense_task
export async function POST(request: NextRequest) {
  const supabase = getInvoicerSupabase();
  const body = await request.json();
  const { submissionId, action } = body;
  
  if (!submissionId) {
    return NextResponse.json({ success: false, error: "Missing submissionId" }, { status: 400 });
  }
  
  // Get the submission
  const { data: submission, error: fetchError } = await supabase
    .from("expense_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();
    
  if (fetchError || !submission) {
    return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
  }
  
  if (action === "decline") {
    // Just mark as declined
    const { error: updateError } = await supabase
      .from("expense_submissions")
      .update({ 
        status: "declined",
        reviewed_at: new Date().toISOString()
      })
      .eq("id", submissionId);
      
    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, action: "declined" });
  }
  
  // Approve: Create expense_task from submission
  const newTaskId = crypto.randomUUID();
  const newTask = {
    id: newTaskId,
    owner_company_id: submission.owner_company_id || DEFAULT_COMPANY_ID,
    title: `Pay ${submission.submitter_name}`,
    vendor_name: submission.submitter_name,
    vendor_email: submission.submitter_email,
    invoice_date: submission.invoice_date,
    due_date: submission.due_date,
    amount: submission.amount,
    currency: submission.currency,
    payment_method: submission.payment_method,
    payment_details: submission.payment_details,
    notes: submission.notes,
    status: "approved",
    submission_id: submissionId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const { error: insertError } = await supabase
    .from("expense_tasks")
    .insert(newTask);
    
  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
  }
  
  // Update submission with link to task
  const { error: updateError } = await supabase
    .from("expense_submissions")
    .update({ 
      status: "approved",
      expense_task_id: newTaskId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", submissionId);
    
  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, action: "approved", taskId: newTaskId });
}

// Update submission (edit fields)
export async function PATCH(request: NextRequest) {
  const supabase = getInvoicerSupabase();
  const body = await request.json();
  const { id, ...updates } = body;
  
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing submission id" }, { status: 400 });
  }
  
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.submitterName !== undefined) dbUpdates.submitter_name = updates.submitterName;
  if (updates.submitterEmail !== undefined) dbUpdates.submitter_email = updates.submitterEmail;
  if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.paymentDetails !== undefined) dbUpdates.payment_details = updates.paymentDetails;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  
  const { data, error } = await supabase
    .from("expense_submissions")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, submission: data });
}
