import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "pipeline";
  const account = searchParams.get("account");

  try {
    // Connect to invoicer Supabase
    const supabaseUrl = process.env.INVOICER_SUPABASE_URL;
    const supabaseKey = process.env.INVOICER_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Invoicer Supabase credentials not configured");
      return NextResponse.json(
        { deals: { prospecting: [], negotiation: [], won: [], lost: [] } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Fetch all promo_tasks
    const { data: tasks, error } = await supabase
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
        deal_stage,
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
        payment_history,
        completed_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch promo_tasks:", error);
      return NextResponse.json(
        { deals: { prospecting: [], negotiation: [], won: [], lost: [] } }
      );
    }

    if (view === "inbox") {
      return NextResponse.json({ deals: { inbox: tasks || [] } });
    }

    // Pipeline view: group by deal_stage
    const pipeline = {
      prospecting: [] as typeof tasks,
      negotiation: [] as typeof tasks,
      won: [] as typeof tasks,
      lost: [] as typeof tasks,
    };

    (tasks || []).forEach((task: any) => {
      const stage = task.deal_stage || task.status;
      
      // Map deal stages to pipeline groups
      if (stage === "discussions" || stage === "todo") {
        pipeline.prospecting.push(task);
      } else if (
        stage === "in_progress" ||
        stage === "collecting_payment" ||
        stage === "invoiced"
      ) {
        pipeline.negotiation.push(task);
      } else if (stage === "done" || stage === "completed" || stage === "paid") {
        pipeline.won.push(task);
      } else if (stage === "lost" || stage === "rejected") {
        pipeline.lost.push(task);
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

    if (action === "create") {
      const { error } = await supabase.from("promo_tasks").insert([
        {
          title: body.title,
          details: body.details,
          fee: body.fee,
          client_name: body.clientName,
          client_id: body.clientId,
          deal_stage: body.dealStage || "discussions",
          work_status: body.workStatus || "todo",
          payment_status: body.paymentStatus || "not_invoiced",
          owner_company_id: body.ownerCompanyId,
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
          deal_stage: body.dealStage,
          work_status: body.workStatus,
          payment_status: body.paymentStatus,
          title: body.title,
          details: body.details,
          fee: body.fee,
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
