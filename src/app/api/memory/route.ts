import { NextRequest, NextResponse } from "next/server";

// Mock memory data - TODO: connect to actual OpenClaw workspace
const mockMemoryFiles = {
  "MEMORY.md": {
    content: "# MEMORY.md — Kora's Long-Term Memory\n\nLast updated: 2026-02-17\n\n---\n\n## About Michael\n\n- Professional dancer, creator, entrepreneur...",
    lastModified: "2026-02-17",
  },
  "SOUL.md": {
    content: "# SOUL.md - Who I Am\n\n*I'm Kora. Not a chatbot. Not a cheerleader. An operator.*\n\n## Core Truths...",
    lastModified: "2026-02-15",
  },
};

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (path && mockMemoryFiles[path as keyof typeof mockMemoryFiles]) {
    return NextResponse.json({
      success: true,
      file: mockMemoryFiles[path as keyof typeof mockMemoryFiles],
    });
  }

  // Return list of files
  return NextResponse.json({
    success: true,
    files: Object.keys(mockMemoryFiles).map((name) => ({
      name,
      lastModified: mockMemoryFiles[name as keyof typeof mockMemoryFiles].lastModified,
    })),
  });
}