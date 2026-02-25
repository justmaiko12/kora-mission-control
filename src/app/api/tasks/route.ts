import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Connect to Notion Master Tasks DB for real tasks
    // For now, return empty structure
    return NextResponse.json({
      tasks: [],
      count: 0,
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
