import { NextResponse } from "next/server";

const SECRET = process.env.BRIDGE_API_SECRET || "kora-api-key-internal";

function verifyAuth(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.split(" ")[1];
  return token === SECRET;
}

export async function GET(req: Request) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    sessions: [
      {
        id: "kora-main",
        name: "Kora",
        status: "idle",
        lastHeartbeat: new Date().toISOString(),
      },
    ],
    activeCount: 0,
    recentCompletions: [],
    updatedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, timestamp, activity } = body;

  console.log(`📊 Activity logged: ${endpoint} - ${activity}`);
  return NextResponse.json({ success: true, timestamp });
}
