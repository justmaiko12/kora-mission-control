import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

function buildMockResponse() {
  const sessions = [
    {
      id: "session-orbit-01",
      name: "Orbit",
      status: "active",
      currentTask: "Triaging inbound leads",
      lastHeartbeat: new Date().toISOString(),
      progress: 68,
      type: "triage",
    },
    {
      id: "session-iris-02",
      name: "Iris",
      status: "active",
      currentTask: "Drafting outreach sequence",
      lastHeartbeat: new Date().toISOString(),
      progress: 42,
      type: "outreach",
    },
    {
      id: "session-atlas-03",
      name: "Atlas",
      status: "idle",
      currentTask: "Awaiting next instruction",
      lastHeartbeat: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
      progress: 0,
      type: "operations",
    },
    {
      id: "session-echo-04",
      name: "Echo",
      status: "active",
      currentTask: "Reconciling tasks + blockers",
      lastHeartbeat: new Date().toISOString(),
      progress: 76,
      type: "planning",
    },
    {
      id: "session-nova-05",
      name: "Nova",
      status: "idle",
      currentTask: "Standing by",
      lastHeartbeat: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      progress: 0,
      type: "analysis",
    },
  ];

  const recentCompletions = [
    {
      id: "complete-1",
      title: "Qualified 12 new leads",
      agent: "Orbit",
      completedAt: "2m ago",
    },
    {
      id: "complete-2",
      title: "Summarized Q4 pipeline",
      agent: "Echo",
      completedAt: "18m ago",
    },
    {
      id: "complete-3",
      title: "Replied to 5 partner threads",
      agent: "Iris",
      completedAt: "32m ago",
    },
  ];

  return {
    sessions,
    activeCount: sessions.filter((session) => session.status === "active").length,
    recentCompletions,
    updatedAt: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export async function GET() {
  try {
    // TODO: Replace mock data with Bridge sessions_list endpoint response.
    await fetch(`${BRIDGE_URL}/api/sessions/list`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      cache: "no-store",
    });

    return NextResponse.json(buildMockResponse());
  } catch (error) {
    console.error("Agents status error:", error);
    return NextResponse.json(buildMockResponse());
  }
}
