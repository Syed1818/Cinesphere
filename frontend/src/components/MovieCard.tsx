"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MovieSummary } from "@/lib/types";
import { Star, Film, Clock, Play } from "lucide-react";
import { WatchlistButton } from "./WatchlistButton";
import { ThreeCard3D } from "./ThreeCard3D";
import { getGenreGradient, getPosterUrl } from "@/lib/movieArtwork";

interface MovieCardProps {
  movie: MovieSummary;
}

export function MovieCard({ movie }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const posterUrl = getPosterUrl(movie.poster_path);

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";

  const primaryGenre = movie.genres?.[0]?.name || "Cinema";

  return (
    <ThreeCard3D className="h-full">
      <div className="group relative flex flex-col glass-card-hover rounded-2xl overflow-hidden h-full border border-white/10 hover:border-indigo-500/40 shadow-xl transition-colors">
        {/* Poster Image Container */}
      <Link href={`/movies/${movie.id}`} className="relative aspect-[2/3] w-full overflow-hidden bg-black/20 block">
        {posterUrl && !imgError ? (
          <>
            {/* Shimmer skeleton while loading */}
            {!isLoaded && <div className="absolute inset-0 animate-shimmer" />}
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onLoad={() => setIsLoaded(true)}
              onError={() => setImgError(true)}
              className={`object-cover transition-[transform,opacity] duration-300 ease-out group-hover:scale-105 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              unoptimized
            />
          </>
        ) : (
          /* High-End Visual Artwork Fallback */
          <div className={`w-full h-full p-6 flex flex-col justify-between bg-gradient-to-b ${getGenreGradient(primaryGenre)} border-b border-white/5`}>
            <div className="flex items-center justify-between text-xs text-indigo-300/80 font-mono">
              <span className="uppercase tracking-widest">{primaryGenre}</span>
              <span>{releaseYear}</span>
            </div>

            <div className="my-auto text-center space-y-2 py-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-white line-clamp-3 leading-snug tracking-tight px-1">
                {movie.title}
              </h4>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">CineSphere Vault</span>
            </div>
          </div>
        )}

        {/* Ambient Dark Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-transparent to-black/30 opacity-70 group-hover:opacity-40 transition-opacity duration-300" />

        {/* Specular Top Shine on Hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Rating Badge (Glassmorphic) */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-pill text-xs font-bold text-amber-400 shadow-lg">
          <Star className="w-3.5 h-3.5 fill-amber-400" />
          <span>{movie.vote_average.toFixed(1)}</span>
        </div>

        {/* Watchlist Toggle Button (Top Right) */}
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <WatchlistButton movieId={movie.id} size="sm" />
        </div>

        {/* Quick View Hover Pill */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="px-4 py-2 rounded-full glass-pill text-xs font-semibold text-white flex items-center space-x-1.5 shadow-2xl backdrop-blur-xl border border-white/20 transform translate-y-3 group-hover:translate-y-0 transition-transform">
            <Play className="w-3 h-3 fill-white" />
            <span>View Details</span>
          </div>
        </div>
      </Link>

      {/* Card Content & Metadata */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-slate-900/30">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
            <span>{releaseYear}</span>
            {movie.runtime_minutes > 0 && (
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{movie.runtime_minutes}m</span>
              </span>
            )}
          </div>

          <Link href={`/movies/${movie.id}`}>
            <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
              {movie.title}
            </h3>
          </Link>
        </div>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {movie.genres?.slice(0, 2).map((g) => (
            <span
              key={g.id}
              className="text-[10px] px-2 py-0.5 rounded-md glass-pill text-slate-300 font-medium"
            >
              {g.name}
            </span>
          ))}
        </div>
      </div>
      </div>
    </ThreeCard3D>
  );
}
