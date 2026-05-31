import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // High-quality editorial fashion images on Unsplash as premium placeholders
      const mockImages = {
        formal: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80",
        work: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80",
        casual: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
        "date night": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80",
        default: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"
      };

      const descLower = description.toLowerCase();
      let selectedImage = mockImages.default;
      if (descLower.includes("formal") || descLower.includes("business")) {
        selectedImage = mockImages.formal;
      } else if (descLower.includes("work") || descLower.includes("office") || descLower.includes("professional")) {
        selectedImage = mockImages.work;
      } else if (descLower.includes("date night") || descLower.includes("evening") || descLower.includes("night") || descLower.includes("party")) {
        selectedImage = mockImages["date night"];
      } else if (descLower.includes("casual") || descLower.includes("relaxed") || descLower.includes("everyday")) {
        selectedImage = mockImages.casual;
      }

      return NextResponse.json({
        imageUrl: selectedImage,
        isMock: true
      });
    }

    // Call OpenAI DALL-E 3 API
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `An editorial fashion lookbook photography of a complete outfit layout: ${description}. Minimalist studio background, high fashion magazine style, clean layout, studio lighting.`,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json();
      console.error("OpenAI DALL-E error:", errData);
      return NextResponse.json({ error: errData?.error?.message || "Failed to generate image" }, { status: 500 });
    }

    const data = await openaiRes.json();
    const imageUrl = data.data?.[0]?.url;

    return NextResponse.json({ imageUrl, isMock: false });
  } catch (err: any) {
    console.error("Error in generate-image route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
