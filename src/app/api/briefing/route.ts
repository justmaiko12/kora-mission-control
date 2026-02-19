import { NextResponse } from 'next/server';

const BRIDGE_API = process.env.BRIDGE_API_URL || 'https://api.korabot.xyz';
const BRIDGE_TOKEN = process.env.BRIDGE_API_TOKEN || '';

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_API}/briefing`, {
      headers: {
        'Authorization': `Bearer ${BRIDGE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Briefing fetch error:', res.status, text);
      // Return empty structure if briefing not found
      return NextResponse.json({
        aiNews: { items: [], lastUpdated: null },
        kpopNews: { items: [], lastUpdated: null },
        teamTasks: { items: [], lastUpdated: null },
        content: { items: [], lastUpdated: null },
        preferences: {},
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Briefing API error:', error);
    return NextResponse.json({
      aiNews: { items: [], lastUpdated: null },
      kpopNews: { items: [], lastUpdated: null },
      teamTasks: { items: [], lastUpdated: null },
      content: { items: [], lastUpdated: null },
      preferences: {},
    });
  }
}
