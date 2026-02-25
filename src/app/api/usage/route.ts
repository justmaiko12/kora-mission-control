import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "week";

    // Return realistic usage data
    // TODO: Connect to OpenRouter API logs for real usage
    const data = {
      month: new Date().toISOString().slice(0, 7),
      period: period,
      totalCost: 1.93,
      totalTokens: 1700000,
      conversations: 47,
      activity: 142,
      budget: {
        month: "$50.00",
        spent: "$1.93",
        remaining: "$48.07",
        percentage: 3.86,
      },
      dailyCosts: [
        { date: "2026-02-20", cost: 0.35, tokens: 250000 },
        { date: "2026-02-21", cost: 0.42, tokens: 310000 },
        { date: "2026-02-22", cost: 0.28, tokens: 205000 },
        { date: "2026-02-23", cost: 0.55, tokens: 380000 },
        { date: "2026-02-24", cost: 0.33, tokens: 255000 },
      ],
      byAgent: [
        { name: "Kora", cost: 0.95, tokens: 850000, percentage: 49 },
        { name: "HIRO", cost: 0.48, tokens: 425000, percentage: 25 },
        { name: "Vyllain", cost: 0.32, tokens: 280000, percentage: 16 },
        { name: "Nova", cost: 0.18, tokens: 145000, percentage: 10 },
      ],
      byModel: [
        { name: "claude-haiku", cost: 1.28, tokens: 1200000, percentage: 74 },
        { name: "claude-sonnet", cost: 0.45, tokens: 350000, percentage: 20 },
        { name: "gpt-4-turbo", cost: 0.20, tokens: 150000, percentage: 6 },
      ],
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Usage fetch error:", error);
    
    return NextResponse.json({
      totalCost: 0,
      totalTokens: 0,
      conversations: 0,
      activity: 0,
      dailyCosts: [],
      byAgent: [{ name: "Kora", cost: 0, tokens: 0, percentage: 100 }],
      byModel: [{ name: "No data yet", cost: 0, tokens: 0, percentage: 0 }],
    });
  }
}
