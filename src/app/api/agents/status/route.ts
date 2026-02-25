import { NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_API_TOKEN || '';
const MASTER_TASKS_DB = process.env.NOTION_MASTER_TASKS_DB || '';

async function fetchTaskStats() {
  if (!NOTION_TOKEN || !MASTER_TASKS_DB) {
    return { pending: 0, completed: 0 };
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${MASTER_TASKS_DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    if (!res.ok) {
      return { pending: 0, completed: 0 };
    }

    const data = await res.json();
    const pages = data.results || [];
    
    const pending = pages.filter((p: any) => p.properties?.Status?.status?.name !== 'Done').length;
    const completed = pages.filter((p: any) => p.properties?.Status?.status?.name === 'Done').length;

    return { pending, completed };
  } catch (error) {
    console.error('Task stats error:', error);
    return { pending: 0, completed: 0 };
  }
}

export async function GET() {
  try {
    const { pending, completed } = await fetchTaskStats();
    
    return NextResponse.json({
      sessions: [
        {
          id: "kora-main",
          name: "Kora",
          status: "idle",
          currentTask: `${pending} pending tasks`,
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
      taskStats: { pending, completed },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Agent status error:", error);
    
    return NextResponse.json({
      sessions: [],
      activeCount: 0,
      recentCompletions: [],
      taskStats: { pending: 0, completed: 0 },
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
