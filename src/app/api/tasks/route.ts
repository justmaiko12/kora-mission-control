import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/tasks`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
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

    const res = await fetch(`${BRIDGE_URL}/api/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
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

    const res = await fetch(`${BRIDGE_URL}/api/tasks/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
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

    const res = await fetch(`${BRIDGE_URL}/api/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
