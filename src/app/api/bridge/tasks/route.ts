import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

  // In-memory storage for Vercel (no persistent file)
  // In production, use Supabase or another DB
  return NextResponse.json({
    tasks: [],
    count: 0,
  });
}

export async function POST(req: Request) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, priority = "medium", dueDate, status = "pending" } = body;

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const task = {
    id: crypto.randomUUID(),
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
}
