"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

interface Question {
  id: string;
  question: string;
  field: string;
  options: { value: string; label: string; desc: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: "aesthetic",
    question: "Describe your personal aesthetic.",
    field: "aesthetic",
    options: [
      { value: "Minimalist", label: "Minimalist", desc: "Clean lines, neutrals, intentional simplicity." },
      { value: "Bohemian", label: "Bohemian", desc: "Flowing fabrics, vintage patterns, relaxed layers." },
      { value: "Streetwear", label: "Streetwear", desc: "Graphic prints, comfortable sneakers, modern shapes." },
      { value: "Classic", label: "Classic", desc: "Tailored blazers, timeless silhouettes, structured essentials." },
      { value: "Avant-Garde", label: "Avant-Garde", desc: "Bold shapes, conceptual designs, fashion-forward choices." },
    ],
  },
  {
    id: "palette",
    question: "Select your preferred color palette.",
    field: "palette",
    options: [
      { value: "Neutrals & Earthy", label: "Neutrals & Earthy", desc: "Beige, olive, navy, stone, and cream." },
      { value: "Vibrant & Bold", label: "Vibrant & Bold", desc: "Rich reds, electric blues, canary yellow, jewel tones." },
      { value: "Pastel & Soft", label: "Pastel & Soft", desc: "Lavender, mint, powder blue, soft rose." },
      { value: "Monochrome", label: "Monochrome", desc: "Strictly blacks, whites, grays, and deep charcoal." },
    ],
  },
  {
    id: "fit",
    question: "What silhouette fits you best?",
    field: "fit",
    options: [
      { value: "Oversized & Relaxed", label: "Oversized & Relaxed", desc: "Draping layers, baggy silhouettes, unstructured comfort." },
      { value: "Tailored & Fitted", label: "Tailored & Fitted", desc: "Form-fitting, sharp tailoring, defined waistlines." },
      { value: "Structured & Boxy", label: "Structured & Boxy", desc: "Square jackets, stiff denim, architectural cuts." },
      { value: "Mixed & Balanced", label: "Mixed & Balanced", desc: "Fitted top with loose bottom, or vice versa." },
    ],
  },
  {
    id: "priority",
    question: "What is your primary fashion priority?",
    field: "priority",
    options: [
      { value: "Comfort & Ease", label: "Comfort & Ease", desc: "Soft fabrics, easy layering, movement." },
      { value: "Making a Statement", label: "Making a Statement", desc: "Unique details, eye-catching textures, artistic cuts." },
      { value: "Practicality & Function", label: "Practicality & Function", desc: "Deep pockets, weatherproof fabrics, daily utility." },
      { value: "Trendy & Modern", label: "Trendy & Modern", desc: "Seasonal updates, contemporary styling, fresh details." },
    ],
  },
  {
    id: "formal_frequency",
    question: "How often do you dress up for formal / office events?",
    field: "formal_frequency",
    options: [
      { value: "Daily", label: "Daily", desc: "I work in a formal corporate setting every day." },
      { value: "Frequently", label: "Frequently", desc: "Multiple times a week for meetings or dinners." },
      { value: "Occasionally", label: "Occasionally", desc: "Once or twice a month for special outings." },
      { value: "Rarely", label: "Rarely", desc: "Almost never, I stay casual/relaxed 95% of the time." },
    ],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
      } else {
        setUserId(data.user.id);
        setAuthChecking(false);
      }
    };
    checkUser();
  }, [router]);

  const handleSelect = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert([
          {
            user_id: userId,
            style_profile: answers,
          },
        ]);

      if (error) throw error;
      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving style profile:", err);
      // Fallback redirect if profile table hasn't been created yet so user isn't stuck
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-[#4C5850]/30 border-t-[#4C5850] rounded-full animate-spin" />
      </div>
    );
  }

  const q = QUESTIONS[currentStep];
  const isSelected = !!answers[q.field];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] flex flex-col justify-between font-sans selection:bg-[#4C5850]/10">
      
      {/* HEADER */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-heading text-lg font-bold tracking-tight text-[#1A1A1A] uppercase">
            StyleSense
          </h1>
        </div>
        <div className="text-xs uppercase tracking-widest font-semibold text-stone-400">
          Quiz Onboarding {currentStep + 1} / {QUESTIONS.length}
        </div>
      </header>

      {/* QUIZ BODY */}
      <main className="max-w-3xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        {/* PROGRESS BAR */}
        <div className="w-full bg-stone-200 h-1 mb-12 overflow-hidden">
          <motion.div 
            className="bg-[#4C5850] h-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-2 leading-tight">
                {q.question}
              </h2>
              <p className="text-xs uppercase tracking-widest font-semibold text-stone-400">
                Step {currentStep + 1}
              </p>
            </div>

            <div className="grid gap-4">
              {q.options.map((opt) => {
                const isCurrent = answers[q.field] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(q.field, opt.value)}
                    className={`text-left px-6 py-5 border transition-all duration-300 flex flex-col md:flex-row md:items-center md:justify-between gap-2
                      ${isCurrent 
                        ? "border-[#4C5850] bg-[#F1F3F0]" 
                        : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/50"
                      }`}
                  >
                    <span className="font-semibold text-sm tracking-wide">{opt.label}</span>
                    <span className={`text-xs font-light transition-colors ${isCurrent ? "text-stone-600" : "text-stone-400"}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER NAVIGATION */}
      <footer className="px-6 md:px-12 py-6 border-t border-stone-200 bg-white flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-semibold transition-colors duration-300
            ${currentStep === 0 
              ? "opacity-0 pointer-events-none" 
              : "text-stone-400 hover:text-[#1A1A1A]"
            }`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <button
          onClick={nextStep}
          disabled={!isSelected || loading}
          className="flex items-center gap-3 px-8 py-3.5 bg-[#4C5850] hover:bg-[#3A453E] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs uppercase tracking-widest font-semibold transition-all duration-300"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : currentStep === QUESTIONS.length - 1 ? (
            "Complete Profile"
          ) : (
            <>
              Next <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
