import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Invoicer Supabase connection
const INVOICER_SUPABASE_URL = process.env.INVOICER_SUPABASE_URL || "";
const INVOICER_SUPABASE_KEY = process.env.INVOICER_SUPABASE_SERVICE_KEY || "";

const supabase = createClient(INVOICER_SUPABASE_URL, INVOICER_SUPABASE_KEY);

// Company ID mapping
const COMPANY_MAP: Record<string, string> = {
  "business@shluv.com": "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b",
  "justmaiko@shluv.com": "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b",
  "business@meettherodz.com": "1e9a87f3-0a12-48b0-be03-c4a98359f71f",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dealId,
      invoiceNumber,
      date,
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
      account,
    } = body;

    // Validate required fields
    if (!clientName || !clientEmail || !items?.length || !total) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get owner company ID
    const ownerCompanyId = COMPANY_MAP[account] || COMPANY_MAP["business@shluv.com"];

    // Fetch the owner company details for the invoice sender
    const { data: senderCompany, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", ownerCompanyId)
      .single();

    if (companyError) {
      console.error("Failed to fetch sender company:", companyError);
    }

    // Create client record if it doesn't exist
    let clientId: string | null = null;
    
    // Check if client exists
    const { data: existingClient } = await supabase
      .from("companies")
      .select("id")
      .eq("email", clientEmail)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      // Create new client
      const { data: newClient, error: clientCreateError } = await supabase
        .from("companies")
        .insert({
          name: clientName,
          email: clientEmail,
          address: "",
          city: "",
          state: "",
          zip: "",
          country: "USA",
        })
        .select("id")
        .single();

      if (clientCreateError) {
        console.error("Failed to create client:", clientCreateError);
      } else {
        clientId = newClient.id;
      }
    }

    // Create the invoice in Supabase
    const invoiceData = {
      invoice_number: invoiceNumber,
      date: date,
      due_date: dueDate,
      sender_id: ownerCompanyId,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      items: JSON.stringify(items),
      notes: notes,
      tax_rate: taxRate,
      currency: currency,
      subtotal: subtotal,
      tax: tax,
      total: total,
      status: "draft", // Start as draft
      linked_promo_ids: dealId ? [dealId] : [],
      created_at: new Date().toISOString(),
    };

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select("id")
      .single();

    if (invoiceError) {
      console.error("Failed to create invoice:", invoiceError);
      return NextResponse.json(
        { error: "Failed to create invoice in database" },
        { status: 500 }
      );
    }

    // Update the promo task / deal to link the invoice
    if (dealId) {
      const { error: updateError } = await supabase
        .from("promo_tasks")
        .update({
          invoice_id: invoice.id,
          payment_status: "invoiced",
          deal_stage: "collecting_payment",
        })
        .eq("id", dealId);

      if (updateError) {
        console.error("Failed to update deal with invoice:", updateError);
      }
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber,
      message: `Invoice ${invoiceNumber} created successfully`,
    });
  } catch (error) {
    console.error("Invoice creation error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
