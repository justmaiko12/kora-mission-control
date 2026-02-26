import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface NewsContext {
  title: string;
  summary?: string;
  source?: string;
  sourceUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      newsContext,
      conversationHistory = [],
    }: {
      message: string;
      newsContext: NewsContext;
      conversationHistory: ConversationMessage[];
    } = await request.json();

    if (!message || !newsContext) {
      return NextResponse.json(
        { error: "Missing message or news context" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error("OpenRouter API key not configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are a helpful assistant discussing a specific news story. Answer questions about this topic concisely and directly, referencing the article when relevant. You may draw on your general knowledge for broader context.

News Article:
Title: ${newsContext.title}${newsContext.summary ? `\nSummary: ${newsContext.summary}` : ""}${newsContext.source ? `\nSource: ${newsContext.source}` : ""}${newsContext.sourceUrl ? `\nURL: ${newsContext.sourceUrl}` : ""}

Guidelines:
- Be concise (2-3 short paragraphs max)
- If citing information beyond the article, mention your source briefly
- Use plain language, avoid excessive jargon
- If you don't know something specific, say so honestly`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kora-mission-control.vercel.app",
        "X-Title": "Kora Mission Control",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-haiku",
        messages,
        max_tokens: 600,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer =
      data.choices?.[0]?.message?.content || "No response generated";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("News chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
