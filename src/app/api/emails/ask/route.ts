import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const { question, threadContext, subject } = await request.json();

    if (!question || !threadContext) {
      return NextResponse.json(
        { error: "Missing question or thread context" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are a helpful assistant analyzing an email thread. Answer questions about the thread concisely and directly. Focus on extracting the key information the user needs.

Email Subject: ${subject}

Thread Content:
${threadContext}`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mission.korabot.xyz",
        "X-Title": "Kora Mission Control",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-haiku-20241022", // Fast & cheap for quick answers
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "No answer generated";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Email ask error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
