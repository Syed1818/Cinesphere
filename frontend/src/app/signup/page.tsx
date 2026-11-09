"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Film,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";

const ONBOARDING_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
];

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([878, 28]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGenre = (genreId: number) => {
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(selectedGenres.filter((id) => id !== genreId));
    } else {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        preferred_genres: selectedGenres,
      });
      router.push("/recommendations");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please check your information.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="relative max-w-xl w-full space-y-8 glass-card border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center mx-auto text-white shadow-2xl mb-5 group hover:scale-105 transition-transform duration-300">
            <Film className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-black text-white font-display tracking-tight">
            Create CineSphere Profile
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Initialize your personalized ML taste vectors and recommendations
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Miller"
                  className="glass-input w-full h-11 pl-10 pr-3.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_cinephile"
                className="glass-input w-full h-11 px-3.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Onboarding Taste Profile: Favorite Genres */}
          <div className="pt-2">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <label className="block text-xs font-bold text-slate-300">
                Favorite Genres{" "}
                <span className="text-slate-500 font-normal">
                  (Calibrates your cold-start ML vector)
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {ONBOARDING_GENRES.map((g) => {
                const selected = selectedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGenre(g.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all active:scale-95 ${selected
                        ? "glass-pill-active scale-105"
                        : "glass-pill text-slate-400 hover:text-white hover:border-white/30"
                      }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white" />}
                    <span>{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="three-liquid-metal-btn w-full h-12 mt-4 rounded-xl text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Initializing Profile..." : "Complete Registration"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 relative z-10">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
            Sign in &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
