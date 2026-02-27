import { NextResponse } from 'next/server';

const NOTION_TOKEN = process.env.NOTION_API_TOKEN || '';
const MASTER_TASKS_DB = process.env.NOTION_MASTER_TASKS_DB || '';

async function fetchNews(query: string, count: number = 5) {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  if (!BRAVE_API_KEY) {
    console.log('No Brave API key, returning empty news');
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: count.toString(),
      freshness: 'pw', // past week
    });

    const res = await fetch(`https://api.search.brave.com/res/v1/news/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      console.error('Brave search failed:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((item: any, idx: number) => ({
      id: `news-${idx}-${Date.now()}`,
      title: item.title || 'Untitled',
      summary: item.description || '',
      source: item.meta_url?.hostname || (() => { try { return new URL(item.url).hostname; } catch { return 'Unknown'; } })(),
      url: item.url,
      date: item.age || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('News fetch error:', error);
    return [];
  }
}

async function fetchNotionDatabase(databaseId: string) {
  if (!NOTION_TOKEN || !databaseId) {
    return [];
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Status',
          status: {
            does_not_equal: 'Done',
          },
        },
        sorts: [
          {
            property: 'Due Date',
            direction: 'ascending',
          },
        ],
        page_size: 10,
      }),
    });

    if (!res.ok) {
      console.error('Notion query failed:', res.status);
      return [];
    }

    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Notion fetch error:', error);
    return [];
  }
}

function extractTaskData(page: any) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: props.Tasks?.title?.[0]?.plain_text || 'Untitled',
    status: props.Status?.status?.name || 'unknown',
    dueDate: props['Due Date']?.date?.start || null,
    assignee: props['Assigned To']?.people?.[0]?.name || 'Unassigned',
    priority: props.Priority?.select?.name || 'normal',
  };
}

export async function GET() {
  try {
    // Fetch Team Tasks from Notion
    const taskPages = await fetchNotionDatabase(MASTER_TASKS_DB);
    const teamTasks = taskPages.map(extractTaskData).slice(0, 5); // Top 5 tasks

    // Fetch real news via Brave Search API
    const [aiNewsItems, kpopNewsItems] = await Promise.all([
      fetchNews('AI artificial intelligence news', 5),
      fetchNews('K-pop news comeback tour', 5),
    ]);

    // Fallback placeholder data
    const aiNewsPlaceholders = [
      {
        id: 'ai-1',
        title: 'OpenAI releases GPT-5 training',
        summary: 'New language model with improved reasoning',
        source: 'OpenAI Blog',
        url: 'https://openai.com/blog',
        date: new Date().toISOString(),
      },
      {
        id: 'ai-2',
        title: 'Claude gains extended context window',
        summary: '200k context now available',
        source: 'Anthropic',
        url: 'https://www.anthropic.com/news',
        date: new Date().toISOString(),
      },
    ];

    const kpopNewsPlaceholders = [
      {
        id: 'kpop-1',
        title: 'NewJeans announce new era',
        summary: 'Comeback scheduled for Q2 2026',
        source: 'HYBE',
        url: 'https://www.hybe.com',
        date: new Date().toISOString(),
      },
      {
        id: 'kpop-2',
        title: 'SEVENTEEN world tour announced',
        summary: 'Los Angeles show added to dates',
        source: 'Pledis Entertainment',
        url: 'https://www.pledis.co.kr',
        date: new Date().toISOString(),
      },
    ];

    const briefing = {
      aiNews: {
        items: aiNewsItems.length > 0 ? aiNewsItems : aiNewsPlaceholders,
        lastUpdated: new Date().toISOString(),
      },
      kpopNews: {
        items: kpopNewsItems.length > 0 ? kpopNewsItems : kpopNewsPlaceholders,
        lastUpdated: new Date().toISOString(),
      },
      teamTasks: {
        items: teamTasks.length > 0 ? teamTasks : [
          {
            id: 'task-1',
            title: 'No tasks due today',
            status: 'in-progress',
            dueDate: null,
            assignee: 'Team',
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
      content: {
        items: [
          {
            id: 'content-1',
            title: 'Recording',
            type: 'recording',
            platform: 'TikTok',
            status: 'scheduled',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'content-2',
            title: 'Posting',
            type: 'posting',
            platform: 'Instagram',
            status: 'scheduled',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
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
