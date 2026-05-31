import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { wardrobeItems, styleProfile } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OpenRouter API Key" }, { status: 500 });
    }

    const wardrobeList = wardrobeItems && wardrobeItems.length > 0
      ? wardrobeItems.map((item: any) => `- ${item.color} ${item.category}`).join("\n")
      : "No items uploaded yet.";

    const styleQuizContext = styleProfile
      ? `Aesthetic: ${styleProfile.aesthetic}\nPalette: ${styleProfile.palette}\nFit/Silhouette: ${styleProfile.fit}\nPriority: ${styleProfile.priority}\nDress Up Frequency: ${styleProfile.formal_frequency}`
      : "No style quiz completed yet.";

    const systemPrompt = `You are StyleSense, an elite personal fashion consultant and wardrobe auditor.
Your job is to analyze the user's current wardrobe and their personal style profile to identify "wardrobe gaps" (missing essential items, color opportunities, or style mismatch) and recommend how to complete their wardrobe.

Format your response in a beautiful, structured Markdown. Use clean headers, bullet points, and high-fashion styling suggestions.
Keep your analysis punchy, editorial, and professional. Avoid greeting or conversational intro/outro text, start directly with the analysis.`;

    const userPrompt = `Here is my style profile:
${styleQuizContext}

Here is my current wardrobe list:
${wardrobeList}

Please run a thorough "Wardrobe Gap Analysis" and tell me:
1. What key essential categories I am missing (e.g. tops, bottoms, shoes, dresses) relative to my preferred aesthetic.
2. Color palette opportunities (what colors I should add to complement my existing wardrobe and preference).
3. Specific style suggestions (3 distinct items to buy next to unlock the maximum number of new outfit combinations).`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "StyleSense",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku", // Use Claude 3 Haiku for cost-efficient fast analysis
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || "AI request failed" }, { status: response.status });
    }

    const report = data.choices?.[0]?.message?.content || "Could not generate analysis.";
    return NextResponse.json({ report });
  } catch (err: any) {
    console.error("Error in gap-analysis route:", err);
    return NextResponse.json({ error: "Failed to perform gap analysis" }, { status: 500 });
  }
}
