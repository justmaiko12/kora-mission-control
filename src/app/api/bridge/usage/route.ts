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
    month: new Date().toISOString().slice(0, 7),
    tokens: {
      input: 1250000,
      output: 450000,
    },
    cost: {
      input: "$1.25",
      output: "$0.68",
      total: "$1.93",
    },
    agents: {
      kora: { tokens: 500000, cost: "$0.50" },
      hiro: { tokens: 300000, cost: "$0.30" },
      vyllain: { tokens: 250000, cost: "$0.25" },
      nova: { tokens: 200000, cost: "$0.20" },
    },
    budget: {
      month: "$50.00",
      spent: "$1.93",
      remaining: "$48.07",
    },
  });
}
