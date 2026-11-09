"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RecommendationItem } from "@/lib/types";
import { Star, Sparkles, Compass, Users, TrendingUp, Film } from "lucide-react";
import { WatchlistButton } from "./WatchlistButton";
import { ThreeCard3D } from "./ThreeCard3D";
import { getPosterUrl, getGenreGradient } from "@/lib/movieArtwork";

interface RecommendationCardProps {
  movie: RecommendationItem;
}

export function RecommendationCard({ movie }: RecommendationCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const posterUrl = getPosterUrl(movie.poster_path);

  const matchPercentage = Math.round(movie.similarity_score * 100);

  const getAlgoBadge = () => {
    switch (movie.algorithm) {
      case "ML_CONTENT":
      case "CONTENT_BASED":
      case "ML_TASTE_SIMILAR":
        return {
          label: "Taste Affinity",
          icon: Compass,
          color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        };
      case "ML_COLLABORATIVE":
      case "COLLABORATIVE":
        return {
          label: "Collaborative ML",
          icon: Users,
          color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        };
      case "ML_CRITIC_CHOICE":
      case "TRENDING":
        return {
          label: "Critic Choice",
          icon: TrendingUp,
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        };
      case "CUSTOM_ML":
      default:
        return {
          label: "Custom ML Model",
          icon: Sparkles,
          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        };
    }
  };

  const badge = getAlgoBadge();
  const Icon = badge.icon;
  const primaryGenre = movie.genres?.[0]?.name || "Cinema";

  return (
    <ThreeCard3D className="h-full">
      <div className="group relative flex flex-col glass-card-hover rounded-2xl overflow-hidden h-full border border-white/10 hover:border-purple-500/40 shadow-xl transition-colors">
        {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-20" />

      {/* Top Banner: Match Percentage & Algorithm Pill */}
      <div className="p-3 bg-slate-950/20 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
            {matchPercentage}% Match
          </span>
        </div>
        <div className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}>
          <Icon className="w-3 h-3" />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Poster */}
      <Link href={`/movies/${movie.id}`} className="relative aspect-[16/10] sm:aspect-[2/3] w-full overflow-hidden bg-black/20 block">
        {posterUrl && !imgError ? (
          <>
            {!isLoaded && <div className="absolute inset-0 animate-shimmer" />}
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onLoad={() => setIsLoaded(true)}
              onError={() => setImgError(true)}
              className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              unoptimized
            />
          </>
        ) : (
          <div className={`w-full h-full p-6 flex flex-col justify-between bg-gradient-to-b ${getGenreGradient(primaryGenre)}`}>
            <div className="flex items-center justify-between text-xs text-indigo-300 font-mono">
              <span>{primaryGenre}</span>
              <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : ""}</span>
            </div>
            <div className="my-auto text-center space-y-2">
              <Film className="w-8 h-8 text-indigo-400 mx-auto opacity-70 group-hover:scale-110 transition-transform" />
              <h4 className="font-extrabold text-sm text-white line-clamp-2 px-2">{movie.title}</h4>
            </div>
            <span className="text-[10px] text-slate-500 text-center uppercase tracking-widest">Personalized Recommendation</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-transparent to-transparent opacity-80" />

        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <WatchlistButton movieId={movie.id} size="sm" />
        </div>

        <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-pill text-xs font-bold text-amber-400 shadow-md">
          <Star className="w-3.5 h-3.5 fill-amber-400" />
          <span>{movie.vote_average.toFixed(1)}</span>
        </div>
      </Link>

      {/* Explanation & Info */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-slate-950/20 backdrop-blur-md">
        <div>
          <Link href={`/movies/${movie.id}`}>
            <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1.5">
              {movie.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-400 italic line-clamp-2 mb-3 bg-slate-950/25 p-2 rounded-lg border border-white/5">
            &ldquo;{movie.explanation}&rdquo;
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
          <span>{movie.genres?.[0]?.name || "Feature Film"}</span>
          <Link
            href={`/movies/${movie.id}`}
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-1"
          >
            <span>Details</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
      </div>
    </ThreeCard3D>
  );
}
