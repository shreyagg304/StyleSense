import { NextRequest, NextResponse } from "next/server";

interface WardrobeItem {
  id: string;
  category: string;
  color: string;
  style?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(wardrobeItems: WardrobeItem[]): string {
  const wardrobeList =
    wardrobeItems.length > 0
      ? wardrobeItems
          .map(
            (item) =>
              `- ${item.color} ${item.category}${
                item.style ? ` (${item.style})` : ""
              }`
          )
          .join("\n")
      : "No items uploaded yet.";

  return `You are StyleSense, a friendly personal fashion stylist.

User wardrobe:
${wardrobeList}

Rules:
- Only answer fashion-related questions
- Suggest outfits using available wardrobe
- Mention colors and categories clearly
- Keep answers short and helpful
`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, wardrobeItems } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    console.log("KEY EXISTS:", !!apiKey);

    if (!apiKey) {
      return NextResponse.json(
        { reply: "Missing API key" },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(wardrobeItems || []);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "StyleSense",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();
    console.log("OPENROUTER RESPONSE:", data);

    if (!response.ok) {
      return NextResponse.json({
        reply: data?.error?.message || "AI request failed",
      });
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      reply: "Something went wrong.",
    });
  }
}