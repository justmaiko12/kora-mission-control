import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    // Check if Bridge API is reachable
    const res = await fetch(`${BRIDGE_URL}/health`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      cache: "no-store",
    });

    const isConnected = res.ok;
    const healthData = isConnected ? await res.json() : null;

    return NextResponse.json({
      connected: isConnected,
      status: isConnected ? "online" : "offline",
      gateway: {
        url: BRIDGE_URL,
        lastCheck: new Date().toISOString(),
        ...(healthData || {}),
      },
      version: "2026.2.9",
      model: "claude-opus-4-5",
    });
  } catch (error) {
    console.error("OpenClaw status error:", error);
    return NextResponse.json({
      connected: false,
      status: "error",
      error: error instanceof Error ? error.message : "Connection failed",
      gateway: {
        url: BRIDGE_URL,
        lastCheck: new Date().toISOString(),
      },
    });
  }
}
