"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { RecommendationItem } from "@/lib/types";
import { RecommendationCard } from "@/components/RecommendationCard";
import { GsapStagger } from "@/components/GsapStagger";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Sparkles,
  Sliders,
  Info,
  Compass,
  Users,
  TrendingUp,
  Brain,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function RecommendationsDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [selectedAlgo, setSelectedAlgo] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModelDetails, setShowModelDetails] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function loadRecs() {
      setIsLoading(true);
      try {
        const feed = await api.getRecommendationFeed(30);
        setRecommendations(feed.items || []);
      } catch (err) {
        console.error("Failed to load recommendation feed", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadRecs();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in to view your recommendations"
        description="Our custom factorized machine learning engine computes personal affinity vectors based on your movie ratings and watchlist history."
        actionText="Sign In / Register"
        actionHref="/login"
        icon={Sparkles}
      />
    );
  }

  const filteredRecs =
    selectedAlgo === "ALL"
      ? recommendations
      : recommendations.filter((r) => r.algorithm === selectedAlgo);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative p-8 sm:p-10 rounded-3xl glass-card overflow-hidden">
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        
        {/* Ambient floating glows */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold three-badge-shimmer text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Custom Factorized Feature ML Model Active</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Personalized Intelligence,{" "}
              <span className="text-gradient-cinema">{user.display_name}</span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Every recommendation is calculated in real-time by computing cosine affinity across
              dense 40-dimensional feature representations, weighting your ratings and collaborative community signals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowModelDetails(!showModelDetails)}
              className="px-4 py-2.5 rounded-xl glass-pill text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center space-x-2 transition-all hover:border-white/30"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>{showModelDetails ? "Hide ML Breakdown" : "View ML Architecture"}</span>
              {showModelDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <Link
              href="/movies"
              className="px-5 py-2.5 rounded-xl three-liquid-metal-btn text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rate More Films</span>
            </Link>
          </div>
        </div>

        {/* Model Architecture Explainer (Expandable) */}
        {showModelDetails && (
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
                <Compass className="w-4 h-4" />
                <span>Content Vectorization</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                40-dimensional dense genre matrix combined with normalized popularity, budget, and runtime metrics for semantic proximity.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold">
                <Users className="w-4 h-4" />
                <span>Collaborative Factorization</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Peer matrix decomposition capturing latent rating patterns between cinephiles with similar taste clusters.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>Bayesian Critic Weighting</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Vote smoothing and temporal decay prevents popularity bias while surfacing universally acclaimed cinematic gems.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Filter Pills */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedAlgo("ALL")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition-all duration-300 ${
            selectedAlgo === "ALL"
              ? "glass-pill-active"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All ML Matches ({recommendations.length})</span>
        </button>

        <button
          onClick={() => setSelectedAlgo("ML_CONTENT")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition-all duration-300 ${
            selectedAlgo === "ML_CONTENT"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Genre & Themes</span>
        </button>

        <button
          onClick={() => setSelectedAlgo("ML_COLLABORATIVE")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition-all duration-300 ${
            selectedAlgo === "ML_COLLABORATIVE"
              ? "bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-lg shadow-purple-500/20"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>Collaborative Signals</span>
        </button>

        <button
          onClick={() => setSelectedAlgo("ML_CRITIC_CHOICE")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition-all duration-300 ${
            selectedAlgo === "ML_CRITIC_CHOICE"
              ? "bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-lg shadow-amber-500/20"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span>Critic Acclaimed</span>
        </button>
      </div>

      {/* Recommendations Grid */}
      {isLoading ? (
        <LoadingSkeleton count={8} />
      ) : filteredRecs.length > 0 ? (
        <GsapStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredRecs.map((movie) => (
            <RecommendationCard key={movie.id} movie={movie} />
          ))}
        </GsapStagger>
      ) : (
        <EmptyState
          title="No recommendations match this filter"
          description="Rate more titles across varied genres to calibrate this specific algorithm branch."
          actionText="Browse Movie Catalog"
          actionHref="/movies"
        />
      )}
    </div>
  );
}
