import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return briefing structure with current data
    // TODO: Connect to Notion Master Tasks DB for real team tasks
    // TODO: Connect to news APIs for AI News and K-pop News
    
    const briefing = {
      aiNews: {
        items: [],
        lastUpdated: new Date().toISOString(),
      },
      kpopNews: {
        items: [],
        lastUpdated: new Date().toISOString(),
      },
      teamTasks: {
        items: [],
        lastUpdated: new Date().toISOString(),
      },
      content: {
        items: [],
        lastUpdated: new Date().toISOString(),
      },
      preferences: {
        aiNews: { liked: [], disliked: [], notes: '' },
        kpopNews: { liked: [], disliked: [], notes: '' },
      },
    };

    return NextResponse.json(briefing);
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
