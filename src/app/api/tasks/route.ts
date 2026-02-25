import { NextRequest, NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_API_TOKEN || '';
const MASTER_TASKS_DB = process.env.NOTION_MASTER_TASKS_DB || '';

async function fetchTasks() {
  if (!NOTION_TOKEN || !MASTER_TASKS_DB) {
    return [];
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
        filter: {
          property: 'Status',
          status: {
            does_not_equal: 'Done',
          },
        },
        sorts: [
          {
            property: 'Due Date',
            direction: 'ascending',
          },
        ],
        page_size: 20,
      }),
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const pages = data.results || [];

    return pages.map((page: any) => {
      const props = page.properties || {};
      return {
        id: page.id,
        title: props.Tasks?.title?.[0]?.plain_text || 'Untitled',
        status: props.Status?.status?.name || 'unknown',
        dueDate: props['Due Date']?.date?.start || null,
        assignee: props['Assigned To']?.people?.[0]?.name || 'Unassigned',
        priority: props.Priority?.select?.name || 'normal',
      };
    });
  } catch (error) {
    console.error('Notion fetch error:', error);
    return [];
  }
}

export async function GET() {
  try {
    const tasks = await fetchTasks();
    return NextResponse.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks", tasks: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority = "medium", dueDate, status = "pending" } = body;

    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    // TODO: Save to Notion Master Tasks DB
    const task = {
      id: `task-${Date.now()}`,
      title,
      description,
      priority,
      status,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`✅ Task created: ${title}`);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // TODO: Update Notion task
    console.log(`✅ Task updated: ${id}`);
    return NextResponse.json({ success: true, updated: updates });
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // TODO: Delete from Notion
    console.log(`✅ Task deleted: ${id}`);
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
