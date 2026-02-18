import { NextResponse } from "next/server";

const DAY_COUNT = 14;

function buildDailyCosts() {
  const today = new Date();
  const entries = Array.from({ length: DAY_COUNT }).map((_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (DAY_COUNT - 1 - index));
    const costBase = 6.8 + index * 0.55 + (index % 3) * 0.9;
    const cost = Number((costBase + (index % 4) * 0.35).toFixed(2));
    const tokens = 9500 + index * 1550 + (index % 5) * 700;
    return {
      date: day.toISOString(),
      cost,
      tokens,
    };
  });

  return entries;
}

function buildUsageMock() {
  const dailyCosts = buildDailyCosts();
  const totalCost = Number(
    dailyCosts.reduce((sum, entry) => sum + entry.cost, 0).toFixed(2)
  );
  const totalTokens = dailyCosts.reduce((sum, entry) => sum + entry.tokens, 0);
  const conversations = Math.round(totalTokens / 950);
  const activity = Math.round(totalTokens / 130);

  const agentSeed = [
    { name: "Orbit", cost: 42.8, tokens: 112400 },
    { name: "Iris", cost: 35.2, tokens: 98750 },
    { name: "Echo", cost: 28.1, tokens: 84200 },
    { name: "Atlas", cost: 18.6, tokens: 51600 },
  ];
  const agentTotal = agentSeed.reduce((sum, item) => sum + item.cost, 0);
  const byAgent = agentSeed.map((item) => ({
    ...item,
    percentage: Math.round((item.cost / agentTotal) * 100),
  }));

  const modelSeed = [
    { name: "claude-3.5-sonnet", cost: 61.9, tokens: 173200 },
    { name: "claude-3.5-haiku", cost: 39.4, tokens: 124900 },
    { name: "claude-3-opus", cost: 23.4, tokens: 61700 },
  ];
  const modelTotal = modelSeed.reduce((sum, item) => sum + item.cost, 0);
  const byModel = modelSeed.map((item) => ({
    ...item,
    percentage: Math.round((item.cost / modelTotal) * 100),
  }));

  return {
    totalCost,
    totalTokens,
    conversations,
    activity,
    dailyCosts,
    byAgent,
    byModel,
  };
}

export async function GET() {
  return NextResponse.json(buildUsageMock());
}
