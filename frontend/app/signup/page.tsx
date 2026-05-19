"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email || !password) return "All fields are required";

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) return "Invalid email format";

    if (password.length < 6) return "Password must be at least 6 characters";

    return "";
  };

  const handleSignup = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex text-[#1A1A1A]">
      
      {/* Left side: Editorial / Image Placeholder (Dusty Sage Green) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#4C5850] p-12 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-2">
           <div className="w-8 h-8 bg-white flex items-center justify-center">
             <Sparkles className="w-4 h-4 text-[#4C5850]" />
           </div>
           <h1 className="font-heading text-lg font-bold tracking-tight text-white uppercase">
             StyleSense
           </h1>
        </div>

        <div className="relative z-10 max-w-md">
           <motion.h2 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2, duration: 0.8 }}
             className="font-heading text-5xl font-bold text-white leading-tight"
           >
             Begin your <br/> <span className="italic font-light text-[#D5DBD6]">collection.</span>
           </motion.h2>
           <motion.p
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3, duration: 0.8 }}
             className="mt-6 text-[#D5DBD6] font-light leading-relaxed"
           >
             Create an intelligent digital archive of your wardrobe. Get personalized editorial curations tailored to your unique style and aesthetic.
           </motion.p>
        </div>

        {/* Decorative graphic / watermark */}
        <div className="absolute -bottom-24 -right-24 text-[300px] text-white/5 font-heading italic pointer-events-none select-none">
          S
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">
        <button 
          onClick={() => router.push("/")}
          className="absolute top-8 left-8 sm:left-16 md:left-24 lg:left-32 flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-stone-400 hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-sm w-full mx-auto"
        >
          <div className="mb-12">
            <h1 className="font-heading text-3xl font-bold tracking-tight mb-2">
              Create Archive
            </h1>
            <p className="text-sm text-stone-500 font-light">
              Enter your details to start your wardrobe.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm font-light">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border border-green-200 bg-green-50 text-green-700 text-sm font-light">
              {success}
            </div>
          )}

          <div className="space-y-6">
            <div className="relative">
              <input
                type="email"
                placeholder=" "
                className="block w-full border-b border-stone-300 bg-transparent py-2.5 text-[#1A1A1A] placeholder-transparent focus:border-[#4C5850] focus:outline-none transition-colors peer font-light"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label className="absolute left-0 -top-3.5 text-xs font-semibold uppercase tracking-widest text-stone-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-stone-400 peer-placeholder-shown:top-2.5 peer-placeholder-shown:font-light peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-[#4C5850] peer-focus:uppercase peer-focus:tracking-widest peer-focus:font-semibold">
                Email Address
              </label>
            </div>

            <div className="relative pt-4">
              <input
                type="password"
                placeholder=" "
                className="block w-full border-b border-stone-300 bg-transparent py-2.5 text-[#1A1A1A] placeholder-transparent focus:border-[#4C5850] focus:outline-none transition-colors peer font-light"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="absolute left-0 top-1 text-xs font-semibold uppercase tracking-widest text-stone-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-stone-400 peer-placeholder-shown:top-6 peer-placeholder-shown:font-light peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#4C5850] peer-focus:uppercase peer-focus:tracking-widest peer-focus:font-semibold">
                Password
              </label>
            </div>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full mt-10 bg-[#4C5850] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#3A453E] transition-colors disabled:opacity-50 flex justify-center"
          >
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sign Up"}
          </button>

          <p className="mt-8 text-sm text-center text-stone-500 font-light">
            Already have an archive?{" "}
            <span
              onClick={() => router.push("/login")}
              className="text-[#4C5850] font-semibold cursor-pointer hover:underline"
            >
              Sign In
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}