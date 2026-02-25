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

  // Return briefing structure with current data
  const briefing = {
    aiNews: {
      items: [],
      lastUpdated: new Date().toISOString(),
    },
    kpopNews: {
      items: [],
      lastUpdated: new Date().toISOString(),
    },
    teamTasks: {
      items: [],
      lastUpdated: new Date().toISOString(),
    },
    content: {
      items: [],
      lastUpdated: new Date().toISOString(),
    },
    preferences: {
      aiNews: { liked: [], disliked: [], notes: "" },
      kpopNews: { liked: [], disliked: [], notes: "" },
    },
  };

  return NextResponse.json(briefing);
}
