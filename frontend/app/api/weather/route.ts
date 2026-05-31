import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");

    if (!location) {
      return NextResponse.json({ error: "Location is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      const mockWeathers = [
        { temp: 22, description: "clear sky", main: "Clear" },
        { temp: 12, description: "light rain", main: "Rain" },
        { temp: 18, description: "scattered clouds", main: "Clouds" },
        { temp: 8, description: "overcast clouds", main: "Clouds" },
        { temp: 27, description: "sunny", main: "Clear" }
      ];
      const index = Math.abs(location.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % mockWeathers.length;
      return NextResponse.json({
        ...mockWeathers[index],
        location,
        isMock: true
      });
    }

    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        location
      )}&units=metric&appid=${apiKey}`
    );

    if (!weatherRes.ok) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    const weatherData = await weatherRes.json();
    const temp = Math.round(weatherData.main.temp);
    const description = weatherData.weather[0].description;
    const main = weatherData.weather[0].main;

    return NextResponse.json({
      temp,
      description,
      main,
      location: weatherData.name,
      isMock: false
    });
  } catch (err: any) {
    console.error("Error in weather route:", err);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
