"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MovieDetail, RecommendationItem, Rating } from "@/lib/types";
import { api } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { WatchlistButton } from "@/components/WatchlistButton";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Star, Clock, Calendar, Film, ArrowLeft, MessageSquare, Compass, Sparkles, User as UserIcon } from "lucide-react";

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [similarMovies, setSimilarMovies] = useState<RecommendationItem[]>([]);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  useEffect(() => {
    if (!movieId) return;

    async function loadMovieDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const [movieData, similarData, reviewsData] = await Promise.all([
          api.getMovieById(movieId),
          api.getSimilarMovies(movieId, 6).catch(() => []),
          api.getMovieReviews(movieId, 1, 10).catch(() => ({ items: [], total: 0 })),
        ]);
        setMovie(movieData);
        setSimilarMovies(similarData);
        setReviews(reviewsData.items);
      } catch (err: any) {
        setError(err.message || "Movie details could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }

    loadMovieDetails();
  }, [movieId]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 shadow-lg shadow-indigo-500/20" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="text-center py-24 space-y-4 glass-card max-w-lg mx-auto rounded-3xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-rose-400">
          <Film className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Movie Not Found</h2>
        <p className="text-sm text-slate-400">{error || "The requested movie does not exist in our catalog."}</p>
        <Link
          href="/movies"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all hover:scale-105 shadow-md shadow-indigo-600/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Catalog</span>
        </Link>
      </div>
    );
  }

  const posterUrl = movie.poster_path
    ? movie.poster_path.startsWith("http")
      ? movie.poster_path
      : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const backdropUrl = movie.backdrop_path
    ? movie.backdrop_path.startsWith("http")
      ? movie.backdrop_path
      : `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const primaryGenre = movie.genres?.[0]?.name || "Cinema";

  return (
    <div className="space-y-12 sm:space-y-14">
      {/* Backdrop & Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-card shadow-2xl bg-slate-950">
        {backdropUrl && !backdropError && (
          <div className="absolute inset-0 h-[500px]">
            <Image
              src={backdropUrl}
              alt={movie.title}
              fill
              priority
              onError={() => setBackdropError(true)}
              className="object-cover opacity-35"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-[#070a12]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070a12] via-[#070a12]/60 to-transparent" />
          </div>
        )}

        <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Poster Card */}
          <div className="relative aspect-[2/3] w-52 sm:w-64 lg:w-72 shrink-0 rounded-2xl overflow-hidden glass-card shadow-2xl bg-slate-900 group">
            {posterUrl && !posterError ? (
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                priority
                onError={() => setPosterError(true)}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
            ) : (
              <div className="w-full h-full p-6 flex flex-col justify-between bg-gradient-to-b from-indigo-950/60 via-purple-950/30 to-slate-950 text-center">
                <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono">{primaryGenre}</span>
                <div className="my-auto space-y-2">
                  <Film className="w-12 h-12 text-indigo-400 mx-auto" />
                  <h4 className="font-display font-black text-lg text-white line-clamp-3">{movie.title}</h4>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-eyebrow">CineSphere Showcase</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 pointer-events-none" />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3.5 py-1 rounded-full text-[11px] font-semibold font-eyebrow glass-pill text-indigo-300 border-indigo-500/20 shadow-sm"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-display tracking-tight leading-[1.08] sm:leading-[1.1] text-gradient-cinema drop-shadow-md">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="text-sm md:text-base italic text-slate-300/80 font-normal">&ldquo;{movie.tagline}&rdquo;</p>
              )}
            </div>

            {/* Quick Stats Pill Bar */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-300 py-3 border-y border-white/10 tabular-numbers">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold glass-pill px-3 py-1 rounded-full shadow-md">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-sm">{movie.vote_average.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({movie.vote_count.toLocaleString()} votes)</span>
              </div>

              <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{movie.runtime_minutes} mins</span>
              </div>

              <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{movie.release_date}</span>
              </div>

              {movie.director && (
                <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  <span>Directed by <strong className="text-white font-semibold">{movie.director}</strong></span>
                </div>
              )}
            </div>

            {/* Overview / Synopsis */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-eyebrow">Synopsis</h3>
              <p className="text-sm sm:text-base text-slate-300/95 leading-relaxed max-w-3xl font-normal">
                {movie.overview}
              </p>
            </div>

            {/* Rating UI & Watchlist Action Bar (Glassmorphic) */}
            <div className="pt-2 flex flex-wrap items-center gap-6 glass-card p-5 sm:p-6 rounded-2xl shadow-xl">
              <div>
                <span className="block text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Your Rating</span>
                </span>
                <StarRating
                  movieId={movie.id}
                  initialRating={movie.user_rating}
                  onRatingSubmitted={(r) => setMovie({ ...movie, user_rating: r })}
                />
              </div>

              <div className="sm:pl-8 sm:border-l border-white/10">
                <span className="block text-xs font-bold text-slate-300 mb-2">Watchlist</span>
                <WatchlistButton movieId={movie.id} initialState={movie.is_in_watchlist} size="lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cast Section */}
      {movie.top_cast && movie.top_cast.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-white/5">
            <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">Top Billed Cast</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {movie.top_cast.map((c) => (
              <div
                key={c.id}
                className="glass-card-hover rounded-2xl p-4 flex flex-col items-center text-center space-y-2.5"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-500/30 shadow-md">
                  {c.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                      alt={c.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-300 font-bold text-sm bg-gradient-to-tr from-indigo-900 to-purple-900">
                      {c.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{c.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 font-normal">{c.character_name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Similar Movies Section */}
      {similarMovies.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">More Like This</h2>
              <p className="text-xs text-slate-400 mt-0.5">Item-to-item feature similarity computed in custom ML representation space</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {similarMovies.map((sim) => (
              <RecommendationCard key={sim.id} movie={sim} />
            ))}
          </div>
        </section>
      )}

      {/* Community Reviews Section */}
      <section className="space-y-5">
        <div className="flex items-center space-x-3 pb-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-inner shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">Community Reviews ({reviews.length})</h2>
        </div>

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-6 rounded-2xl glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      {rev.user_display_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-100">{rev.user_display_name}</span>
                      <span className="text-xs text-slate-500 ml-2">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-1 rounded-full glass-pill text-amber-400 text-xs font-bold shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{rev.rating_value}/10</span>
                  </div>
                </div>

                {rev.review_title && (
                  <h4 className="text-sm font-bold text-white pt-1">{rev.review_title}</h4>
                )}

                {rev.review_body && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {rev.review_body}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center rounded-2xl text-slate-400 text-sm">
            <p className="italic">No community reviews yet. Be the first to share your review!</p>
          </div>
        )}
      </section>
    </div>
  );
}
