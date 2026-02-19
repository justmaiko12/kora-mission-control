import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API = process.env.BRIDGE_API_URL || 'https://api.korabot.xyz';
const BRIDGE_TOKEN = process.env.BRIDGE_API_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { module, itemTitle, feedback, notes } = body;

    const res = await fetch(`${BRIDGE_API}/briefing/feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIDGE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ module, itemTitle, feedback, notes }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Briefing feedback error:', res.status, text);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Briefing feedback API error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
