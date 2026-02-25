import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Map business filter to company IDs in invoicer
const BUSINESS_TO_COMPANY_ID: Record<string, string> = {
  shluv: "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b", // Forever Wealthy LLC
  mtr: "1e9a87f3-0a12-48b0-be03-c4a98359f71f", // MEET THE RODZ CORP
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "pipeline";
  const account = searchParams.get("account"); // e.g., business@shluv.com or business@meettherodz.com

  try {
    // Connect to invoicer Supabase
    const supabaseUrl = process.env.INVOICER_SUPABASE_URL;
    const supabaseKey = process.env.INVOICER_SUPABASE_ANON_KEY;

    console.log("[DEALS API] URL configured:", !!supabaseUrl);
    console.log("[DEALS API] Key configured:", !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[DEALS API] Invoicer Supabase credentials not configured");
      return NextResponse.json(
        { deals: { prospecting: [], negotiation: [], won: [], lost: [] } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Determine which company to filter by based on account
    let companyId: string | null = null;
    
    if (account?.includes("meettherodz")) {
      companyId = BUSINESS_TO_COMPANY_ID.mtr;
    } else if (account?.includes("shluv")) {
      companyId = BUSINESS_TO_COMPANY_ID.shluv;
    }

    // Fetch promo_tasks for the specified company
    let query = supabase
      .from("promo_tasks")
      .select(
        `
        id,
        title,
        details,
        fee,
        status,
        work_status,
        payment_status,
        client_name,
        client_id,
        email_context,
        invoice_id,
        created_at,
        contract_url,
        payment_terms,
        due_date,
        owner_company_id,
        paid_amount,
        payment_history
      `
      );

    // Filter by company if specified
    if (companyId) {
      query = query.eq("owner_company_id", companyId);
    }

    const { data: tasks, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[DEALS API] Failed to fetch promo_tasks:", error);
      return NextResponse.json(
        { deals: { prospecting: [], negotiation: [], won: [], lost: [] } }
      );
    }

    console.log("[DEALS API] Fetched tasks:", tasks?.length || 0);

    // Map Supabase promo_tasks to frontend Deal interface
    const mapPromoTaskToDeal = (task: any) => {
      // Map company ID back to account string for display
      let accountString = account || "business@shluv.com";
      if (task.owner_company_id === BUSINESS_TO_COMPANY_ID.mtr) {
        accountString = "business@meettherodz.com";
      } else if (task.owner_company_id === BUSINESS_TO_COMPANY_ID.shluv) {
        accountString = "business@shluv.com";
      }

      return {
        id: task.id,
        subject: task.title,
        from: task.client_name || "Unknown Client",
        date: task.created_at || new Date().toISOString(),
        account: accountString,
        labels: task.payment_status ? [task.payment_status] : [],
        messageCount: 1,
        amount: task.fee || 0,
        ownerCompanyId: task.owner_company_id,
        source: "invoicer" as const,
      };
    };

    if (view === "inbox") {
      return NextResponse.json({ 
        deals: { 
          inbox: (tasks || []).map(mapPromoTaskToDeal)
        } 
      });
    }

    // Pipeline view: group by payment status (match frontend stages)
    const pipeline = {
      negotiating: [] as any[],
      active: [] as any[],
      completed: [] as any[],
      invoiced: [] as any[],
      paid: [] as any[],
    };

    (tasks || []).forEach((task: any) => {
      const deal = mapPromoTaskToDeal(task);
      // Map payment_status to frontend pipeline stages
      if (task.payment_status === "not_invoiced" || task.status === "todo") {
        pipeline.negotiating.push(deal);
      } else if (task.work_status === "in_progress") {
        pipeline.active.push(deal);
      } else if (task.work_status === "completed" && task.payment_status !== "paid") {
        pipeline.completed.push(deal);
      } else if (task.payment_status === "invoiced" || task.payment_status === "partial") {
        pipeline.invoiced.push(deal);
      } else if (task.payment_status === "paid" || task.status === "paid") {
        pipeline.paid.push(deal);
      } else {
        // Default to active for any other status
        pipeline.active.push(deal);
      }
    });

    return NextResponse.json({ deals: pipeline });
  } catch (error) {
    console.error("Failed to fetch deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const supabaseUrl = process.env.INVOICER_SUPABASE_URL;
    const supabaseKey = process.env.INVOICER_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Invoicer not configured" },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Determine company ID from account or ownerCompanyId
    let ownerCompanyId = body.ownerCompanyId;
    if (!ownerCompanyId && body.account) {
      if (body.account.includes("meettherodz")) {
        ownerCompanyId = BUSINESS_TO_COMPANY_ID.mtr;
      } else if (body.account.includes("shluv")) {
        ownerCompanyId = BUSINESS_TO_COMPANY_ID.shluv;
      }
    }

    if (action === "create") {
      const { error } = await supabase.from("promo_tasks").insert([
        {
          title: body.title,
          details: body.details,
          fee: body.fee,
          client_name: body.clientName,
          client_id: body.clientId,
          work_status: body.workStatus || "todo",
          payment_status: body.paymentStatus || "not_invoiced",
          owner_company_id: ownerCompanyId || BUSINESS_TO_COMPANY_ID.shluv,
          status: body.status || "todo",
        },
      ]);

      if (error) {
        console.error("Failed to create deal:", error);
        return NextResponse.json(
          { error: "Failed to create deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        deal: { id: `deal-${Date.now()}`, ...body },
      });
    }

    if (action === "update" || action === "updateStatus") {
      const { error } = await supabase
        .from("promo_tasks")
        .update({
          work_status: body.workStatus,
          payment_status: body.paymentStatus,
          title: body.title,
          details: body.details,
          fee: body.fee,
          status: body.status,
        })
        .eq("id", body.id);

      if (error) {
        console.error("Failed to update deal:", error);
        return NextResponse.json(
          { error: "Failed to update deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, updated: true });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("promo_tasks")
        .delete()
        .eq("id", body.id);

      if (error) {
        console.error("Failed to delete deal:", error);
        return NextResponse.json(
          { error: "Failed to delete deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, deleted: true });
    }

    if (action === "link") {
      const { error } = await supabase
        .from("promo_tasks")
        .update({ invoice_id: body.invoiceId })
        .eq("id", body.dealId);

      if (error) {
        console.error("Failed to link deal:", error);
        return NextResponse.json(
          { error: "Failed to link deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, linked: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Deals action failed:", error);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}
