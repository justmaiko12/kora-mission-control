import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

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

    // Build context for the AI
    const contextMessage = `[News Article Context]
Title: ${newsContext.title}${newsContext.summary ? `\nSummary: ${newsContext.summary}` : ""}${newsContext.source ? `\nSource: ${newsContext.source}` : ""}${newsContext.sourceUrl ? `\nURL: ${newsContext.sourceUrl}` : ""}

User is asking about this specific news story. Answer concisely (2-3 paragraphs max).`;

    // Build the full message with context
    const fullMessage = conversationHistory.length === 0
      ? `${contextMessage}\n\nQuestion: ${message}`
      : message; // Follow-ups don't need full context again

    // Send to Bridge API
    const sendRes = await fetch(`${BRIDGE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        message: fullMessage,
        context: {
          type: "news_chat",
          newsTitle: newsContext.title,
          newsSource: newsContext.source,
        },
        userId: "michael",
      }),
    });

    if (!sendRes.ok) {
      const error = await sendRes.json().catch(() => ({}));
      console.error("Bridge send error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    const sendData = await sendRes.json();
    const messageId = sendData.messageId;

    // If immediate response, return it
    if (sendData.immediate && sendData.response) {
      return NextResponse.json({ answer: sendData.response });
    }

    // Poll for response (15s timeout for quick responses)
    const startTime = Date.now();
    const timeout = 15000;
    const pollInterval = 500;

    while (Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const checkRes = await fetch(
        `${BRIDGE_URL}/api/chat/response/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${BRIDGE_SECRET}`,
          },
        }
      );

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.found) {
          return NextResponse.json({ answer: checkData.response });
        }
      }
    }

    // Timeout
    return NextResponse.json({
      answer: "I'm still thinking about this. Check back in a moment!",
    });
  } catch (error) {
    console.error("News chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
