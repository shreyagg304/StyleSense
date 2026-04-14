"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-center px-6">
      <h1 className="text-4xl font-bold mb-4">
        Welcome to StyleSense 👗
      </h1>

      <p className="text-stone-500 mb-8 max-w-md">
        Upload your wardrobe, generate outfits, and get AI fashion suggestions.
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-2 bg-stone-900 text-white rounded-full"
        >
          Login
        </button>

        <button
          onClick={() => router.push("/signup")}
          className="px-6 py-2 border border-stone-900 rounded-full"
        >
          Signup
        </button>
      </div>
      <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-2 border border-stone-900 rounded-full my-6"
        >
          Wardrobe
        </button>
    </div>
  );
}