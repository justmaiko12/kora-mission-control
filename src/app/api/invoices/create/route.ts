import { NextRequest, NextResponse } from "next/server";

// Invoicer Edge Function URL
const INVOICER_API_URL = "https://dpnsdxfiirqjztcfsvuj.supabase.co/functions/v1/kora-api";
const INVOICER_SERVICE_KEY = process.env.INVOICER_SUPABASE_SERVICE_KEY || "";

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
      account,
    } = body;

    // Validate required fields
    if (!clientName || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields (clientName, items)" },
        { status: 400 }
      );
    }

    // Get owner company ID
    const ownerCompanyId = COMPANY_MAP[account] || COMPANY_MAP["business@shluv.com"];

    // Format items for Invoicer API
    const formattedItems = items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    // Call Invoicer's kora-api Edge Function
    const res = await fetch(`${INVOICER_API_URL}?action=create_invoice&companyId=${ownerCompanyId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": INVOICER_SERVICE_KEY,
        "Authorization": `Bearer ${INVOICER_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        clientName,
        clientEmail,
        items: formattedItems,
        notes: notes || "Thank you for your business!",
        dueDate,
        linkedPromoIds: dealId ? [dealId] : [],
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Invoicer API error:", res.status, errorData);
      return NextResponse.json(
        { error: errorData.error || `Invoicer API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    return NextResponse.json({
      success: true,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      message: `Invoice ${data.invoiceNumber} created successfully`,
    });
  } catch (error) {
    console.error("Invoice creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}
