import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Invoicer Supabase
const INVOICER_SUPABASE_URL = "https://dpnsdxfiirqjztcfsvuj.supabase.co";
const INVOICER_SERVICE_KEY = process.env.INVOICER_SUPABASE_SERVICE_KEY || "";

// Company ID mapping by email account
const COMPANY_MAP: Record<string, string> = {
  "business@shluv.com": "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b",
  "justmaiko@shluv.com": "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b",
  "business@meettherodz.com": "1e9a87f3-0a12-48b0-be03-c4a98359f71f",
};

// Get next invoice number for a company (same logic as Invoicer)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getNextInvoiceNumber(supabase: any, companyId: string): Promise<string> {
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("sender_id", companyId)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceNumber = (data as any)?.invoice_number;
  if (!invoiceNumber) return "INV-001";

  const match = String(invoiceNumber).match(/^INV-(\d+)$/i);
  if (!match) return "INV-001";

  const nextNum = parseInt(match[1], 10) + 1;
  return `INV-${String(nextNum).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account");
  const companyId = req.nextUrl.searchParams.get("companyId");

  // Get company ID from account or direct ID
  const targetId = companyId || (account ? COMPANY_MAP[account] : null);

  if (!targetId) {
    return NextResponse.json(
      { error: "account or companyId required" },
      { status: 400 }
    );
  }

  if (!INVOICER_SERVICE_KEY) {
    return NextResponse.json(
      { error: "Invoicer not configured" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(INVOICER_SUPABASE_URL, INVOICER_SERVICE_KEY);

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", targetId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch company" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Get next invoice number
    const nextInvoiceNumber = await getNextInvoiceNumber(supabase, targetId);

    // Return company data with next invoice number
    return NextResponse.json({
      company: {
        id: data.id,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        email: data.email,
        phone: data.phone,
        website: data.website,
        logoUrl: data.logo_url || data.logoUrl,
        paymentInstructions: data.payment_instructions || data.paymentInstructions,
      },
      nextInvoiceNumber,
    });
  } catch (err) {
    console.error("Company fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}
