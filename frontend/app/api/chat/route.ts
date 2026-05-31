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

function buildSystemPrompt(
  wardrobeItems: WardrobeItem[],
  weatherContext?: string,
  occasionContext?: string,
  styleProfile?: any
): string {
  const wardrobeList =
    wardrobeItems.length > 0
      ? wardrobeItems
          .map(
            (item) =>
              `- [ID: ${item.id}] ${item.color} ${item.category}${
                item.style ? ` (${item.style})` : ""
              }`
          )
          .join("\n")
      : "No items uploaded yet.";

  let contextAdditions = "";
  if (weatherContext) {
    contextAdditions += `\nCurrent Weather: ${weatherContext}`;
  }
  if (occasionContext) {
    contextAdditions += `\nTarget Occasion: ${occasionContext}`;
  }
  if (styleProfile) {
    contextAdditions += `\nUser Style Profile:
- Aesthetic: ${styleProfile.aesthetic}
- Preferred Palette: ${styleProfile.palette}
- Fit Style: ${styleProfile.fit}
- Priority: ${styleProfile.priority}
- Occasion Frequency: ${styleProfile.formal_frequency}`;
  }

  return `You are StyleSense, a friendly personal fashion stylist.
${contextAdditions}

User wardrobe:
${wardrobeList}

Rules:
- Only answer fashion-related questions.
- Suggest outfits using available wardrobe.
- Mention colors and categories clearly.
- Keep answers short and helpful.
- Consider the weather, occasion, and style profile in your suggestions if provided.
- **CRITICAL**: If you suggest an outfit combination using items from the user's wardrobe, you MUST append a JSON block at the very end of your response in the format:
\`\`\`json
{
  "suggested_outfit": ["item_id_1", "item_id_2", ...]
}
\`\`\`
Do not mention the JSON block in your conversational text. Just append it. Make sure the JSON is valid and only includes item IDs that actually exist in the user's wardrobe list. If you are not recommending a specific outfit combination, do not append any JSON.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, wardrobeItems, location, occasion, styleProfile } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { reply: "Missing API key" },
        { status: 500 }
      );
    }

    let weatherContext = "";
    if (location && process.env.OPENWEATHERMAP_API_KEY) {
      try {
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            location
          )}&units=metric&appid=${process.env.OPENWEATHERMAP_API_KEY}`
        );
        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          const temp = Math.round(weatherData.main.temp);
          const desc = weatherData.weather[0].description;
          weatherContext = `${temp}°C, ${desc}`;
        }
      } catch (err) {
        console.error("Failed to fetch weather", err);
      }
    }

    const systemPrompt = buildSystemPrompt(wardrobeItems || [], weatherContext, occasion, styleProfile);

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
          model: "anthropic/claude-3-haiku", // Use Claude 3 Haiku for chat styling suggestions
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

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