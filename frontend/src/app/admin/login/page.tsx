"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles, KeyRound } from "lucide-react";
import { ThreeCard3D } from "@/components/ThreeCard3D";

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await adminLogin(email.trim().toLowerCase(), password);
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Admin authorization failed. Insufficient privileges or invalid credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillAdminAccount = () => {
    setEmail("admin@movierec.com");
    setPassword("admin123");
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient glowing backdrops in crimson/amber */}
      <div className="absolute w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <ThreeCard3D maxTilt={6} className="max-w-md w-full">
        <div className="relative w-full space-y-8 glass-card border border-rose-500/20 p-8 sm:p-10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Specular top highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-rose-600/30 mb-5 border border-rose-400/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Admin Console
            </h2>
            <p className="text-xs text-rose-300/80 mt-1.5 flex items-center justify-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-rose-400" />
              <span>Restricted Administrator Access</span>
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center space-x-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@movierec.com"
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="three-liquid-metal-btn w-full py-3 rounded-xl text-white font-bold text-sm shadow-xl flex items-center justify-center space-x-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isSubmitting ? "Authenticating Admin..." : "Access Control Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={fillAdminAccount}
              className="w-full py-2.5 rounded-xl glass-pill hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-2 transition-all duration-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Auto-fill Admin Account (admin@movierec.com)</span>
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 relative z-10">
            Standard user?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Go to User Sign In &rarr;
            </Link>
          </p>
        </div>
      </ThreeCard3D>
    </div>
  );
}

