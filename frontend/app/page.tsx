"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, UploadCloud, Layers } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Auto redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) return null; // Avoid flicker

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden relative">
      
      {/* ── NAVBAR ── */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-12 py-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-heading text-lg font-bold tracking-tight text-[#1A1A1A] uppercase">
            StyleSense
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/login")}
            className="text-xs uppercase tracking-widest font-medium text-stone-500 hover:text-[#1A1A1A] transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="px-6 py-2.5 text-xs uppercase tracking-widest font-semibold bg-[#4C5850] text-white hover:bg-[#3A453E] transition-colors"
          >
            Get Started
          </button>
        </div>
      </motion.header>

      {/* ── HERO ── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 md:px-12 pt-40 pb-24 relative z-10">
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-10 text-xs font-semibold tracking-widest uppercase text-[#4C5850]"
        >
          <span>The intelligent digital wardrobe</span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-[#1A1A1A] max-w-4xl"
        >
          Your wardrobe, <br />
          <span className="italic font-light text-[#4C5850]">beautifully</span> curated.
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 text-stone-500 max-w-xl text-base md:text-lg leading-relaxed font-light"
        >
          Upload your collection, let our AI understand your aesthetic, and instantly generate editorial-worthy combinations tailored for any occasion.
        </motion.p>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-6 mt-16"
        >
          <button
            onClick={() => router.push("/signup")}
            className="group flex items-center justify-center gap-3 px-10 py-4 bg-[#4C5850] text-white text-xs uppercase tracking-widest font-semibold hover:bg-[#3A453E] transition-colors"
          >
            Create Your Archive
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={() => router.push("/login")}
            className="px-10 py-4 bg-transparent border border-stone-300 text-[#1A1A1A] text-xs uppercase tracking-widest font-semibold hover:border-[#4C5850] hover:text-[#4C5850] transition-colors"
          >
            Sign In
          </button>
        </motion.div>

        {/* FEATURES BENTO (Mini) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl w-full"
        >
          {[
            {
              icon: <UploadCloud className="w-5 h-5 text-[#4C5850]" />,
              title: "Effortless Capture",
              desc: "Snap a photo. Our AI automatically detects the category and extracts colors."
            },
            {
              icon: <Layers className="w-5 h-5 text-[#4C5850]" />,
              title: "Smart Curation",
              desc: "See your entire collection at a glance with our premium, minimal interface."
            },
            {
              icon: <Sparkles className="w-5 h-5 text-[#4C5850]" />,
              title: "AI Stylist",
              desc: "Get intelligent outfit combinations based on color theory and occasion."
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-xl p-10 text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1">
              <div className="mb-6 w-12 h-12 bg-[#F1F3F0] rounded-full flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="font-heading text-lg font-bold text-[#1A1A1A] mb-3">{feature.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed font-light">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 text-center text-xs text-[#4C5850] py-10 font-light border-t border-stone-200 bg-[#F1F3F0]/50">
        © {new Date().getFullYear()} StyleSense. Designed for elegance.
      </footer>
    </div>
  );
}