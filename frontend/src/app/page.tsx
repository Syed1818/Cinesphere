"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { MovieSummary, RecommendationItem, Genre } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MovieCard } from "@/components/MovieCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  Sparkles,
  TrendingUp,
  Play,
  Pause,
  Star,
  ChevronRight,
  ChevronLeft,
  Film,
  Award,
  Flame,
  Clapperboard,
  Compass,
  Clock,
  Layers,
} from "lucide-react";
import { WatchlistButton } from "@/components/WatchlistButton";
import { GsapStagger } from "@/components/GsapStagger";
import { getPosterUrl as getSharedPosterUrl } from "@/lib/movieArtwork";

function getPosterUrl(path: string | null | undefined): string {
  const shared = getSharedPosterUrl(path);
  return shared || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80";
}

function getBackdropUrl(path: string | null | undefined): string {
  if (!path) return "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1920&q=80";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/original${path}`;
}

export default function HomePage() {
  const { user } = useAuth();
  const [trending, setTrending] = useState<MovieSummary[]>([]);
  const [catalogMovies, setCatalogMovies] = useState<MovieSummary[]>([]);
  const [topRated, setTopRated] = useState<MovieSummary[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hero Spotlight Slideshow state
  const SLIDE_DURATION = 5500;
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [backdropImgError, setBackdropImgError] = useState<Record<number, boolean>>({});

  const remainingTimeRef = useRef<number>(SLIDE_DURATION);
  const slideStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check prefers-reduced-motion accessibility preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const [trendingData, catalogData, topRatedData, genresData] = await Promise.all([
          api.getTrending(20).catch(() => []),
          api.getMovies({ limit: 60, sort: "popularity" }).catch(() => ({ items: [] })),
          api.getMovies({ limit: 10, sort: "vote_average" }).catch(() => ({ items: [] })),
          api.getGenres().catch(() => []),
        ]);

        setTrending(trendingData);
        setCatalogMovies(catalogData.items || []);
        setTopRated(topRatedData.items || []);
        setGenres(genresData);

        // Load recommendations if logged in
        if (user) {
          const recsData = await api.getRecommendationFeed(8).catch(() => null);
          if (recsData && recsData.items) {
            setRecommendations(recsData.items);
          }
        }
      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHomeData();
  }, [user]);

  // Spotlight Slideshow items (top 7 trending movies)
  const spotlightSlides = trending.slice(0, 7);

  // Auto-advance slideshow callbacks
  const nextSlide = useCallback(() => {
    if (spotlightSlides.length === 0) return;
    setActiveSlide((prev) => (prev + 1) % spotlightSlides.length);
    remainingTimeRef.current = SLIDE_DURATION;
    slideStartTimeRef.current = Date.now();
  }, [spotlightSlides.length]);

  const prevSlide = useCallback(() => {
    if (spotlightSlides.length === 0) return;
    setActiveSlide((prev) => (prev - 1 + spotlightSlides.length) % spotlightSlides.length);
    remainingTimeRef.current = SLIDE_DURATION;
    slideStartTimeRef.current = Date.now();
  }, [spotlightSlides.length]);

  const selectSlide = useCallback((index: number) => {
    setActiveSlide(index);
    remainingTimeRef.current = SLIDE_DURATION;
    slideStartTimeRef.current = Date.now();
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (!prev) {
        const elapsed = Date.now() - slideStartTimeRef.current;
        remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
      } else {
        slideStartTimeRef.current = Date.now();
      }
      return !prev;
    });
  }, []);

  const handleHeroMouseEnter = useCallback(() => {
    setIsPaused(true);
    const elapsed = Date.now() - slideStartTimeRef.current;
    remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
  }, []);

  const handleHeroMouseLeave = useCallback(() => {
    slideStartTimeRef.current = Date.now();
    setIsPaused(false);
  }, []);

  const handleHeroKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === " " || e.key === "Enter") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "BUTTON" && target.tagName !== "A") {
          e.preventDefault();
          togglePause();
        }
      }
    },
    [prevSlide, nextSlide, togglePause]
  );

  useEffect(() => {
    if (isPaused || prefersReducedMotion || spotlightSlides.length <= 1) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    slideStartTimeRef.current = Date.now();

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        nextSlide();
      }
    };

    timerRef.current = setTimeout(tick, remainingTimeRef.current);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        slideStartTimeRef.current = Date.now();
        timerRef.current = setTimeout(tick, remainingTimeRef.current);
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isPaused, prefersReducedMotion, activeSlide, spotlightSlides.length, nextSlide]);

  const currentMovie = spotlightSlides[activeSlide] || null;

  // Split catalog movies into 3 distinct rows for infinite background marquee carousel
  const allImagesMovies = catalogMovies.length > 0 ? catalogMovies : trending;
  const rowCount = Math.max(1, Math.floor(allImagesMovies.length / 3));
  const row1 = allImagesMovies.slice(0, rowCount);
  const row2 = allImagesMovies.slice(rowCount, rowCount * 2);
  const row3 = allImagesMovies.slice(rowCount * 2);

  return (
    <div className="relative space-y-16">
      {/* ========================================================================= */}
      {/* 1. DYNAMIC BACKGROUND MOVIE POSTER WALL & MARQUEE CAROUSEL               */}
      {/* ========================================================================= */}
      <div
        className="marquee-container absolute top-[-3rem] left-1/2 -translate-x-1/2 w-screen max-w-none overflow-hidden -z-10 pointer-events-none opacity-65 select-none"
        aria-hidden="true"
      >
        <div className="relative w-full h-[880px] overflow-hidden flex flex-col justify-around py-4 rotate-[-1.5deg] scale-105 transform-gpu">
          {/* Row 1: Drift Left */}
          {row1.length > 0 && (
            <div className="marquee-row pointer-events-auto flex animate-marquee-slow whitespace-nowrap gap-4 will-change-transform transform-gpu">
              {[...row1, ...row1].map((movie, idx) => (
                <div
                  key={`row1-${movie.id}-${idx}`}
                  className="marquee-card w-32 sm:w-40 h-48 sm:h-60 rounded-2xl overflow-hidden bg-slate-900/50 shrink-0 border border-white/10 shadow-lg relative will-change-transform"
                >
                  <Image
                    src={getPosterUrl(movie.poster_path)}
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 128px, 160px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-50" />
                </div>
              ))}
            </div>
          )}

          {/* Row 2: Drift Right */}
          {row2.length > 0 && (
            <div className="marquee-row pointer-events-auto flex animate-marquee-reverse whitespace-nowrap gap-4 will-change-transform transform-gpu">
              {[...row2, ...row2].map((movie, idx) => (
                <div
                  key={`row2-${movie.id}-${idx}`}
                  className="marquee-card w-32 sm:w-40 h-48 sm:h-60 rounded-2xl overflow-hidden bg-slate-900/50 shrink-0 border border-white/10 shadow-lg relative will-change-transform"
                >
                  <Image
                    src={getPosterUrl(movie.poster_path)}
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 128px, 160px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-50" />
                </div>
              ))}
            </div>
          )}

          {/* Row 3: Drift Left */}
          {row3.length > 0 && (
            <div className="marquee-row pointer-events-auto flex animate-marquee-slow whitespace-nowrap gap-4 will-change-transform transform-gpu">
              {[...row3, ...row3].map((movie, idx) => (
                <div
                  key={`row3-${movie.id}-${idx}`}
                  className="marquee-card w-32 sm:w-40 h-48 sm:h-60 rounded-2xl overflow-hidden bg-slate-900/50 shrink-0 border border-white/10 shadow-lg relative will-change-transform"
                >
                  <Image
                    src={getPosterUrl(movie.poster_path)}
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 128px, 160px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-50" />
                </div>
              ))}
            </div>
          )}

          {/* Transparent Vignette Overlays over the Background Carousel */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070a12]/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-transparent to-[#070a12]/40 pointer-events-none" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CINEMATIC SPOTLIGHT HERO SLIDESHOW / CAROUSEL                          */}
      {/* ========================================================================= */}
      {currentMovie ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Spotlight Featured Movies Carousel"
          aria-roledescription="carousel"
          onKeyDown={handleHeroKeyDown}
          onMouseEnter={handleHeroMouseEnter}
          onMouseLeave={handleHeroMouseLeave}
          className="relative rounded-3xl overflow-hidden glass-card shadow-2xl border border-white/15 min-h-[540px] md:min-h-[580px] flex items-end p-6 sm:p-10 md:p-14 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          {/* Background Backdrop Image Slides with Buttery Crossfade & Ken Burns Slow Zoom */}
          {spotlightSlides.map((slide, idx) => {
            const isSlideActive = idx === activeSlide;
            const hasError = backdropImgError[idx];
            const backdropSrc = getBackdropUrl(slide.backdrop_path || slide.poster_path);

            return (
              <div
                key={`slide-bg-${slide.id}`}
                className={`absolute inset-0 transition-[opacity,filter] duration-700 ease-out ${
                  isSlideActive ? "opacity-95 blur-[2.5px] z-[1]" : "opacity-0 blur-md z-0 pointer-events-none"
                }`}
              >
                {!hasError && (
                  <div
                    className={`hero-backdrop-zoom relative w-full h-full ${
                      isSlideActive ? "scale-100" : "scale-105"
                    }`}
                  >
                    <Image
                      src={backdropSrc}
                      alt={slide.title}
                      fill
                      priority={idx === 0}
                      onError={() =>
                        setBackdropImgError((prev) => ({ ...prev, [idx]: true }))
                      }
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Transparent Cinema Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a12]/90 via-[#070a12]/30 to-transparent z-[2] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/90 via-[#070a12]/30 to-transparent z-[2] pointer-events-none" />

          {/* Top-Right Slideshow Controls & Pause Button */}
          <div className="absolute top-6 right-6 z-20 flex items-center space-x-2">
            <button
              type="button"
              onClick={togglePause}
              title={isPaused ? "Resume Slideshow" : "Pause Slideshow"}
              className="p-2.5 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            >
              {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={prevSlide}
              title="Previous Slide (ArrowLeft)"
              className="p-2.5 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              title="Next Slide (ArrowRight)"
              className="p-2.5 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Main Hero Content Box */}
          <div className="relative z-10 max-w-2xl space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="three-badge-shimmer px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider text-amber-300 flex items-center space-x-1.5 shadow-lg shadow-amber-500/10">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>ThreeUI Spotlight #{activeSlide + 1}</span>
              </span>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full glass-pill text-amber-400 text-xs font-bold shadow-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{currentMovie.vote_average.toFixed(1)} TMDB</span>
              </div>

              {currentMovie.release_date && (
                <div className="px-3 py-1 rounded-full glass-pill text-slate-300 text-xs font-medium">
                  {new Date(currentMovie.release_date).getFullYear()}
                </div>
              )}

              {currentMovie.runtime_minutes > 0 && (
                <div className="hidden sm:flex items-center space-x-1 px-3 py-1 rounded-full glass-pill text-slate-300 text-xs font-medium">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{currentMovie.runtime_minutes} min</span>
                </div>
              )}

              {/* Genre badges */}
              {currentMovie.genres && currentMovie.genres.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5">
                  {currentMovie.genres.slice(0, 2).map((g) => (
                    <span
                      key={g.id}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight text-gradient-cinema drop-shadow-lg">
              {currentMovie.title}
            </h1>

            <p className="text-sm md:text-base text-slate-300 line-clamp-3 leading-relaxed max-w-xl">
              {currentMovie.original_title !== currentMovie.title ? `(${currentMovie.original_title}) ` : ""}
              Immerse yourself in top-tier cinematic storytelling with rich character arcs, breathtaking cinematography, and custom machine learning recommendations tailored to your tastes.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href={`/movies/${currentMovie.id}`}
                className="three-liquid-metal-btn px-7 py-3 rounded-full text-white font-bold text-sm flex items-center space-x-2.5 shadow-xl shadow-indigo-600/35 transition-all hover:scale-105 active:scale-95 group"
              >
                <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                <span>Explore Movie</span>
              </Link>
              <WatchlistButton movieId={currentMovie.id} size="lg" />
              <Link
                href="/movies"
                className="px-5 py-3 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 flex items-center space-x-1.5"
              >
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>Browse All</span>
              </Link>
            </div>

            {/* Slide Indicator Progress Pills with Animated Timer Bar */}
            <div className="flex items-center space-x-2 pt-4" role="tablist" aria-label="Slides">
              {spotlightSlides.map((slide, idx) => {
                const isCurrent = idx === activeSlide;
                return (
                  <button
                    key={`dot-${slide.id}`}
                    onClick={() => selectSlide(idx)}
                    className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 ${
                      isCurrent
                        ? "w-12 sm:w-16 bg-white/20 shadow-md shadow-indigo-500/30 ring-1 ring-white/30"
                        : "w-3 sm:w-4 bg-white/20 hover:bg-white/40 hover:w-6"
                    }`}
                    aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                    aria-selected={isCurrent}
                    role="tab"
                  >
                    {isCurrent && !prefersReducedMotion && (
                      <div
                        key={`progress-${activeSlide}`}
                        className={`absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-slide-progress ${
                          isPaused ? "is-paused" : ""
                        }`}
                      />
                    )}
                    {isCurrent && prefersReducedMotion && (
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Slide Thumbnail Selector Strip on Desktop */}
          <div className="hidden xl:flex flex-col gap-2 absolute bottom-10 right-10 z-10 w-72">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 pb-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Spotlight Carousel</span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-none">
              {spotlightSlides.map((slide, idx) => {
                const isSelected = idx === activeSlide;
                return (
                  <button
                    key={`thumb-${slide.id}`}
                    onClick={() => selectSlide(idx)}
                    className={`w-full p-2 rounded-xl text-left flex items-center space-x-3 transition-all duration-200 border ${
                      isSelected
                        ? "glass-card border-indigo-500/50 bg-indigo-950/40 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                        : "glass-pill border-transparent hover:border-white/10 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 relative bg-slate-800">
                      <Image
                        src={getPosterUrl(slide.poster_path)}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{slide.title}</div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="flex items-center text-amber-400 font-semibold">
                          <Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" />
                          {slide.vote_average.toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>{new Date(slide.release_date).getFullYear()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-[480px] rounded-3xl glass-card flex items-center justify-center">
          <LoadingSkeleton count={3} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GENRE FILTER PILLS SHELF                                               */}
      {/* ========================================================================= */}
      {genres.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>Browse by Genre</span>
            </h2>
            <Link href="/movies" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View All 19 Genres &rarr;
            </Link>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 scrollbar-none">
            <Link
              href="/movies"
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap glass-pill-active shadow-md"
            >
              All Genres
            </Link>
            {genres.map((g) => (
              <Link
                key={g.id}
                href={`/movies?genre=${g.tmdb_id}`}
                className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap glass-pill text-slate-300 hover:text-white transition-all hover:scale-105"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PERSONALIZED RECOMMENDATIONS SHELF (IF USER SIGNED IN)                  */}
      {/* ========================================================================= */}
      {user && recommendations.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white">Recommended For You</h2>
                <p className="text-xs text-slate-400">Custom ML algorithm matching your taste and watchlist signals</p>
              </div>
            </div>
            <Link
              href="/recommendations"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>Full Feed</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <GsapStagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recommendations.slice(0, 4).map((movie) => (
              <RecommendationCard key={movie.id} movie={movie} />
            ))}
          </GsapStagger>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. TOP TRENDING MOVIES SHELF                                              */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">Top Trending Right Now</h2>
              <p className="text-xs text-slate-400">High engagement velocity and critical acclaim across CineSphere</p>
            </div>
          </div>
          <Link
            href="/movies?sort=popularity"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
          >
            <span>Explore All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <LoadingSkeleton count={5} />
        ) : (
          <GsapStagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {trending.slice(0, 10).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </GsapStagger>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. CRITICALLY ACCLAIMED MASTERPIECES SHELF                                */}
      {/* ========================================================================= */}
      {topRated.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-inner">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white">Critically Acclaimed Masterpieces</h2>
                <p className="text-xs text-slate-400">Highest rated cinema classics scored by global viewers</p>
              </div>
            </div>
            <Link
              href="/movies?sort=vote_average"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
            >
              <span>View Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <GsapStagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {topRated.slice(0, 5).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </GsapStagger>
        </section>
      )}
    </div>
  );
}
