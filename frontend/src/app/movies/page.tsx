"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MovieSummary, Genre } from "@/lib/types";
import { api } from "@/lib/api";
import { MovieCard } from "@/components/MovieCard";
import { GsapStagger } from "@/components/GsapStagger";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Search, Filter, ArrowUpDown, X, Loader2 } from "lucide-react";

function MoviesCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const querySort = searchParams.get("sort") || "popularity";
  const queryGenre = searchParams.get("genre") ? parseInt(searchParams.get("genre")!) : undefined;
  const querySearch = searchParams.get("search") || "";
  const queryPage = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;

  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchInput, setSearchInput] = useState<string>(querySearch);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  // Load genres once
  useEffect(() => {
    api.getGenres().then(setGenres).catch(console.error);
  }, []);

  // Update URL helper
  const updateUrl = useCallback(
    (newParams: { sort?: string; genre?: number | undefined; search?: string; page?: number }) => {
      const p = new URLSearchParams(searchParams.toString());

      if (newParams.sort !== undefined) {
        if (newParams.sort === "popularity") p.delete("sort");
        else p.set("sort", newParams.sort);
      }

      if (newParams.genre !== undefined) {
        if (newParams.genre === undefined) p.delete("genre");
        else p.set("genre", newParams.genre.toString());
      }

      if (newParams.search !== undefined) {
        if (!newParams.search.trim()) p.delete("search");
        else p.set("search", newParams.search.trim());
      }

      if (newParams.page !== undefined) {
        if (newParams.page === 1) p.delete("page");
        else p.set("page", newParams.page.toString());
      }

      const queryString = p.toString();
      router.replace(queryString ? `/movies?${queryString}` : "/movies", { scroll: false });
    },
    [router, searchParams]
  );

  // Fetch movies whenever query parameters change
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (queryPage === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await api.getMovies({
          page: queryPage,
          limit: 20,
          genre: queryGenre,
          search: querySearch.trim() || undefined,
          sort: querySort,
        });

        if (!isCancelled) {
          if (queryPage === 1) {
            setMovies(res.items);
          } else {
            setMovies((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const uniqueNewItems = res.items.filter((m) => !existingIds.has(m.id));
              return [...prev, ...uniqueNewItems];
            });
          }
          setTotalPages(res.total_pages);
          setTotalItems(res.total);
        }
      } catch (err) {
        console.error("Failed to fetch movies", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [querySort, queryGenre, querySearch, queryPage]);

  // Handlers
  const handleSortChange = (newSort: string) => {
    updateUrl({ sort: newSort, page: 1 });
  };

  const handleGenreSelect = (genreTmdbId?: number) => {
    const nextGenre = queryGenre === genreTmdbId ? undefined : genreTmdbId;
    updateUrl({ genre: nextGenre, page: 1 });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search: searchInput, page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateUrl({ search: "", page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    router.replace("/movies", { scroll: false });
  };

  const handleLoadMore = () => {
    if (queryPage < totalPages && !isLoading && !isLoadingMore) {
      updateUrl({ page: queryPage + 1 });
    }
  };

  const hasActiveFilters = Boolean(querySearch || queryGenre !== undefined || querySort !== "popularity");

  return (
    <div className="space-y-7">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight text-gradient-cinema">Movie Catalog</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse {totalItems > 0 ? `${totalItems.toLocaleString()} curated titles` : "all movies"} with real-time sorting and multi-genre filtering
          </p>
        </div>

        {/* Search Bar with Ergonomic Position & Focus */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search catalog by title, plot, keyword..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-11 pl-10 pr-24 glass-input rounded-full text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full three-liquid-metal-btn text-white text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Genre Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => handleGenreSelect(undefined)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              queryGenre === undefined
                ? "glass-pill-active shadow-md"
                : "glass-pill text-slate-300 hover:text-white"
            }`}
          >
            All Genres
          </button>
          {genres.map((g) => {
            const isSelected = queryGenre === g.tmdb_id;
            return (
              <button
                key={g.id}
                onClick={() => handleGenreSelect(g.tmdb_id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isSelected
                    ? "glass-pill-active shadow-md"
                    : "glass-pill text-slate-300 hover:text-white"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown & Reset Filters */}
        <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2 rounded-full glass-pill text-xs font-semibold text-slate-300 hover:text-white hover:border-white/20 transition-all flex items-center space-x-1.5 active:scale-95"
              title="Reset all active filters"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset</span>
            </button>
          )}

          <div className="flex items-center space-x-2 glass-pill rounded-full px-3.5 py-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-400 font-medium">Sort:</span>
            <select
              value={querySort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-transparent text-xs text-slate-100 focus:outline-none cursor-pointer font-semibold"
            >
              <option value="popularity" className="bg-slate-900 text-slate-100">Most Popular</option>
              <option value="popularity_asc" className="bg-slate-900 text-slate-100">Least Popular</option>
              <option value="vote_average" className="bg-slate-900 text-slate-100">Highest Rated</option>
              <option value="vote_average_asc" className="bg-slate-900 text-slate-100">Lowest Rated</option>
              <option value="release_date" className="bg-slate-900 text-slate-100">Newest Releases</option>
              <option value="release_date_asc" className="bg-slate-900 text-slate-100">Oldest Releases</option>
              <option value="title" className="bg-slate-900 text-slate-100">Title (A-Z)</option>
              <option value="title_desc" className="bg-slate-900 text-slate-100">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400">
          <span className="font-medium">Active filter:</span>
          {queryGenre !== undefined && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
              <span>Genre: {genres.find((g) => g.tmdb_id === queryGenre)?.name || queryGenre}</span>
              <button onClick={() => handleGenreSelect(queryGenre)} className="hover:text-white p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {querySearch && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
              <span>Keyword: &quot;{querySearch}&quot;</span>
              <button onClick={handleClearSearch} className="hover:text-white p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {querySort !== "popularity" && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-slate-200 font-medium">
              <span>Sort: {querySort.replace("_", " ")}</span>
              <button onClick={() => handleSortChange("popularity")} className="hover:text-white p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Movie Grid */}
      {movies.length > 0 ? (
        <div className="space-y-8">
          <GsapStagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </GsapStagger>

          {/* Infinite Scroll / Load More Button */}
          {queryPage < totalPages && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="three-liquid-metal-btn h-12 px-8 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center space-x-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading Next Page...</span>
                  </>
                ) : (
                  <span className="tabular-numbers">Load More Titles ({movies.length} of {totalItems.toLocaleString()})</span>
                )}
              </button>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <LoadingSkeleton count={10} />
      ) : (
        <EmptyState
          title="No movies found"
          description="Try adjusting your search keywords, clear genre filters, or reset sorting to explore the catalog."
          actionText="Reset All Filters"
          actionHref="/movies"
        />
      )}
    </div>
  );
}

export default function MoviesCatalogPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={10} />}>
      <MoviesCatalogContent />
    </Suspense>
  );
}
