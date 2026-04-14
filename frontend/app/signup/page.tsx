"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-sm p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold tracking-wide">
            Create account
          </h1>
          <p className="text-sm text-stone-500">
            Start building your smart wardrobe
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        {/* Success */}
        {success && (
          <p className="text-green-600 text-sm text-center">{success}</p>
        )}

        {/* Inputs */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            className="w-full border border-stone-300 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none p-2.5 rounded-lg text-sm transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-stone-300 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none p-2.5 rounded-lg text-sm transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Button */}
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-stone-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Signup"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <div className="flex-1 h-px bg-stone-200" />
          <span>or</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* Login link */}
        <p className="text-sm text-center text-stone-600">
          Already have an account?{" "}
          <span
            onClick={() => router.push("/login")}
            className="text-stone-900 font-medium cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}