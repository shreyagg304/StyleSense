"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();

  // ✅ Auto redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        router.push("/dashboard");
      }
    };
    checkUser();
  }, []);

  // ✅ Smart button routing
  const handleOpenWardrobe = async () => {
    const { data } = await supabase.auth.getUser();

    if (data?.user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-sm border-b border-stone-200 px-6 md:px-12 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-widest uppercase text-stone-800 text-center md:text-left">
          Style<span className="text-amber-900">.</span>Sense
        </h1>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-1.5 text-sm rounded-full border border-stone-300 hover:border-stone-500 transition"
          >
            Login
          </button>

          <button
            onClick={() => router.push("/signup")}
            className="px-5 py-1.5 text-sm rounded-full bg-stone-900 text-white hover:bg-stone-700 transition"
          >
            Signup
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 md:px-12">

        <h2 className="text-4xl md:text-5xl font-light leading-tight mb-4">
          Your wardrobe,{" "}
          <span className="italic text-amber-900">smarter</span>.
        </h2>

        <p className="text-stone-500 max-w-xl text-sm md:text-base mb-8 leading-relaxed">
          Upload your clothes, let AI understand them, and instantly generate outfits 
          tailored to your style, color combinations, and occasion.
        </p>

        {/* CTA */}
        <div className="flex gap-4 mb-12">
          <button
            onClick={handleOpenWardrobe}
            className="px-7 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-700 transition"
          >
            Open Wardrobe
          </button>

          <button
            onClick={() => router.push("/signup")}
            className="px-7 py-3 border border-stone-300 rounded-full text-sm hover:border-stone-500 transition"
          >
            Get Started
          </button>
        </div>

        {/* FEATURES */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
          
          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-left">
            <h3 className="text-sm font-semibold mb-2">Smart Upload</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Automatically detect clothing type and color using AI.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-left">
            <h3 className="text-sm font-semibold mb-2">Outfit Generation</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Get outfit suggestions based on your wardrobe.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-left">
            <h3 className="text-sm font-semibold mb-2">AI Stylist</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Ask for styling advice tailored to your clothes.
            </p>
          </div>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="text-center text-xs text-stone-400 py-6">
        © {new Date().getFullYear()} StyleSense
      </footer>

    </div>
  );
}