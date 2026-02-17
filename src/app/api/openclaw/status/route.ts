import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Connect to actual OpenClaw gateway
  return NextResponse.json({
    connected: true,
    version: "2026.2.9",
    model: "anthropic/claude-opus-4-5",
    uptime: "2 hours",
    channels: {
      telegram: { status: "connected", lastMessage: new Date().toISOString() },
      discord: { status: "connected", lastMessage: new Date().toISOString() },
      github: { status: "connected" },
      notion: { status: "connected", lastSync: new Date().toISOString() },
    },
    tools: [
      "exec",
      "read",
      "write",
      "edit",
      "web_search",
      "web_fetch",
      "browser",
      "cron",
      "message",
      "memory_search",
      "memory_get",
      "nodes",
      "sessions_spawn",
      "tts",
      "image",
    ],
  });
}