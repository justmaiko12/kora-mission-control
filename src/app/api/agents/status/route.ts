import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Return agent status from internal state
    // TODO: Connect to OpenClaw gateway for real-time agent status
    
    return NextResponse.json({
      sessions: [
        {
          id: "kora-main",
          name: "Kora",
          status: "idle",
          currentTask: null,
          lastHeartbeat: new Date().toISOString(),
          progress: 0,
          type: "assistant",
        },
        {
          id: "hiro-kreatrix",
          name: "HIRO",
          status: "idle",
          lastHeartbeat: new Date().toISOString(),
          type: "bot",
        },
        {
          id: "vyllain-content",
          name: "Vyllain",
          status: "idle",
          lastHeartbeat: new Date().toISOString(),
          type: "agent",
        },
      ],
      activeCount: 0,
      recentCompletions: [],
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Agent status error:", error);
    
    return NextResponse.json({
      sessions: [],
      activeCount: 0,
      recentCompletions: [],
      updatedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST - Update activity from external sources
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, timestamp, activity } = body;

    console.log(`📊 Activity logged: ${endpoint} - ${activity}`);
    return NextResponse.json({ success: true, timestamp });
  } catch (error) {
    console.error("Activity update error:", error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}
