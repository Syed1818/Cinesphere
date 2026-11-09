"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Film, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { ThreeCard3D } from "@/components/ThreeCard3D";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      router.push("/recommendations");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("demo@movierec.com");
    setPassword("password123");
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <ThreeCard3D maxTilt={6} className="max-w-md w-full">
        <div className="relative w-full space-y-8 glass-card border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-indigo-600/30 mb-5 group hover:scale-105 transition-transform duration-300">
            <Film className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-black text-white font-display tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Sign in to unlock personalized AI movie intelligence
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="three-liquid-metal-btn w-full h-12 rounded-xl text-white font-bold text-sm shadow-xl flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Authenticating..." : "Sign In to CineSphere"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={fillDemoAccount}
            className="w-full h-11 rounded-xl glass-pill hover:border-white/30 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auto-fill Demo Account (demo@movierec.com)</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 relative z-10">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
            Create an account &rarr;
          </Link>
        </p>
      </div>
      </ThreeCard3D>
    </div>
  );
}
