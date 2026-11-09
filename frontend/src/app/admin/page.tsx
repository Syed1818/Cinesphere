"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  AdminStats,
  AdminUserItem,
  AdminMovieItem,
  AdminReviewItem,
  Genre,
} from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  ShieldCheck,
  Film,
  Users,
  Star,
  Bookmark,
  Layers,
  Brain,
  Cpu,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ThreeCard3D } from "@/components/ThreeCard3D";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "movies" | "users" | "reviews">("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [movies, setMovies] = useState<AdminMovieItem[]>([]);
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainMessage, setRetrainMessage] = useState<string | null>(null);

  // Search States
  const [movieSearch, setMovieSearch] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");

  // Add Movie Modal State
  const [showAddMovieModal, setShowAddMovieModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOverview, setNewOverview] = useState("");
  const [newReleaseDate, setNewReleaseDate] = useState("2024-05-15");
  const [newRuntime, setNewRuntime] = useState(120);
  const [newPosterUrl, setNewPosterUrl] = useState("");
  const [newBackdropUrl, setNewBackdropUrl] = useState("");
  const [newVoteAverage, setNewVoteAverage] = useState(8.0);
  const [newGenreIds, setNewGenreIds] = useState<number[]>([878, 28]);
  const [isCreatingMovie, setIsCreatingMovie] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "ADMIN") {
        // Not admin
        setIsLoading(false);
        return;
      }
      loadAdminData();
    }
  }, [user, authLoading]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, moviesRes, reviewsRes, genresRes] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminUsers(1, 50).catch(() => ({ items: [], total: 0, page: 1, limit: 50 })),
        api.getAdminMovies(1, 50).catch(() => ({ items: [], total: 0, page: 1, limit: 50 })),
        api.getAdminReviews(1, 50).catch(() => ({ items: [], total: 0, page: 1, limit: 50 })),
        api.getGenres().catch(() => []),
      ]);
      setStats(statsRes);
      setUsers(usersRes.items || []);
      setMovies(moviesRes.items || []);
      setReviews(reviewsRes.items || []);
      setAllGenres(genresRes || []);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrainML = async () => {
    setIsRetraining(true);
    setRetrainMessage(null);
    try {
      const res = await api.retrainMLModel();
      setRetrainMessage(`Success: ${res.message} (${res.indexed_movies_count} movies indexed)`);
      setTimeout(() => setRetrainMessage(null), 4000);
      loadAdminData();
    } catch (err: any) {
      setRetrainMessage(`Error: ${err.message || "Failed to retrain model."}`);
    } finally {
      setIsRetraining(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.updateAdminUserRole(userId, newRole);
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
    } catch (err) {
      console.error("Failed to update user role", err);
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    if (!confirm("Are you sure you want to remove this movie from the catalog?")) return;
    try {
      await api.deleteAdminMovie(movieId);
      setMovies(movies.filter((m) => m.id !== movieId));
      if (stats) setStats({ ...stats, total_movies: stats.total_movies - 1 });
    } catch (err) {
      console.error("Failed to delete movie", err);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to moderate and remove this review?")) return;
    try {
      await api.deleteAdminReview(reviewId);
      setReviews(reviews.filter((r) => r.id !== reviewId));
      if (stats) setStats({ ...stats, total_ratings: stats.total_ratings - 1 });
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  };

  const handleCreateMovieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newOverview.trim()) return;
    setIsCreatingMovie(true);
    try {
      await api.createAdminMovie({
        title: newTitle.trim(),
        overview: newOverview.trim(),
        release_date: newReleaseDate,
        runtime_minutes: Number(newRuntime) || 120,
        poster_path: newPosterUrl.trim() || undefined,
        backdrop_path: newBackdropUrl.trim() || undefined,
        vote_average: Number(newVoteAverage) || 7.5,
        genre_ids: newGenreIds,
      });
      setShowAddMovieModal(false);
      setNewTitle("");
      setNewOverview("");
      loadAdminData();
    } catch (err) {
      console.error("Failed to add movie", err);
    } finally {
      setIsCreatingMovie(false);
    }
  };

  const toggleNewMovieGenre = (gid: number) => {
    if (newGenreIds.includes(gid)) {
      setNewGenreIds(newGenreIds.filter((id) => id !== gid));
    } else {
      setNewGenreIds([...newGenreIds, gid]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rose-500" />
      </div>
    );
  }

  // Access Denied Screen
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Administrator Access Required</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            You must be authenticated with an active Administrator account to access CineSphere system management, catalog curation, and ML model controls.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/login"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2"
            >
              <span>Admin Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl glass-pill text-xs font-bold text-slate-300 hover:text-white"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredMovies = movieSearch
    ? movies.filter((m) => m.title.toLowerCase().includes(movieSearch.toLowerCase()))
    : movies;

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.display_name.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Admin Top Header Banner */}
      <div className="relative glass-card rounded-3xl p-6 sm:p-8 border border-rose-500/20 overflow-hidden shadow-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[11px] font-bold font-eyebrow bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>CineSphere Root Administration Console</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
              System Operations & Intelligence Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Full administrative authority over movie catalog entities, user permissions, community moderation, and Custom ML model recalibration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={handleRetrainML}
              disabled={isRetraining}
              className="w-full sm:w-auto h-11 px-5 rounded-full three-liquid-metal-btn text-white text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRetraining ? "animate-spin text-indigo-400" : "text-indigo-400"}`} />
              <span>{isRetraining ? "Recalibrating Vectors..." : "Retrain ML Engine"}</span>
            </button>

            <button
              onClick={() => setShowAddMovieModal(true)}
              className="w-full sm:w-auto h-11 px-5 rounded-full three-liquid-metal-btn text-white text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>Add New Film</span>
            </button>
          </div>
        </div>

        {retrainMessage && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{retrainMessage}</span>
          </div>
        )}

        {/* 6 Core KPI Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 mt-6 border-t border-white/10">
            <ThreeCard3D maxTilt={8}>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400">
                  <Film className="w-3.5 h-3.5" />
                  <span>Catalog</span>
                </div>
                <div className="text-xl font-black text-white">{stats.total_movies}</div>
                <p className="text-[10px] text-slate-500">Active Movies</p>
              </div>
            </ThreeCard3D>

            <ThreeCard3D maxTilt={8}>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>Users</span>
                </div>
                <div className="text-xl font-black text-white">{stats.total_users}</div>
                <p className="text-[10px] text-slate-500">Registered</p>
              </div>
            </ThreeCard3D>

            <ThreeCard3D maxTilt={8}>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-amber-500/30 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>Reviews</span>
                </div>
                <div className="text-xl font-black text-white">{stats.total_ratings}</div>
                <p className="text-[10px] text-slate-500">Avg {stats.average_community_rating}/10</p>
              </div>
            </ThreeCard3D>

            <ThreeCard3D maxTilt={8}>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-purple-500/30 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-400">
                  <Bookmark className="w-3.5 h-3.5 fill-purple-400" />
                  <span>Watchlists</span>
                </div>
                <div className="text-xl font-black text-white">{stats.total_watchlists}</div>
                <p className="text-[10px] text-slate-500">Active Shelves</p>
              </div>
            </ThreeCard3D>

            <ThreeCard3D maxTilt={8}>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Cache TTL</span>
                </div>
                <div className="text-xl font-black text-white">{stats.cache_entries_count}</div>
                <p className="text-[10px] text-slate-500">In-Memory Keys</p>
              </div>
            </ThreeCard3D>

            <ThreeCard3D maxTilt={8}>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-rose-500/30 transition-colors">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400">
                  <Brain className="w-3.5 h-3.5" />
                  <span>ML Status</span>
                </div>
                <div className="text-xs font-black text-emerald-400 flex items-center space-x-1 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active</span>
                </div>
                <p className="text-[10px] text-slate-500">Factorized Model</p>
              </div>
            </ThreeCard3D>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2.5 border-b border-white/5 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("overview")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "overview"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("movies")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "movies"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Catalog Manager ({movies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "users"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Access Control ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "reviews"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Moderation ({reviews.length})</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
              <Brain className="w-5 h-5" />
              <h3>Custom ML Recommender Architecture</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Operating natively on Python 3.12 with NumPy and Scikit-learn. The model maps user interaction vectors and multi-hot genre features into 16-dimensional joint latent embeddings without external embedding APIs or container overhead.
            </p>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Algorithm Mode:</span>
                <span className="font-mono text-indigo-300">Factorized Feature SGD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Latent Factors Dimension:</span>
                <span className="font-mono text-slate-200">16 Dimensions</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Explicit Content Vector:</span>
                <span className="font-mono text-slate-200">19 Multi-Hot Genres + 5 Meta Signals</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Database Engine:</span>
                <span className="font-mono text-slate-200">PostgreSQL 18 Native</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <h3>Security & Infrastructure Health</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Strictly native host architecture complying with developer constraints (NO Docker, NO Redis). In-memory LRU TTL cache handles millisecond response caching with automatic pattern invalidation on writes.
            </p>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>JWT Authentication:</span>
                <span className="font-mono text-emerald-400">HS256 Sliding Session</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Password Hashing:</span>
                <span className="font-mono text-slate-200">Bcrypt Salted</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Database:</span>
                <span className="font-mono text-slate-200">localhost:5432 (movie_rec_db)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Admin Session:</span>
                <span className="font-mono text-rose-300">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATALOG MANAGER */}
      {activeTab === "movies" && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog titles..."
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs text-slate-200"
              />
            </div>

            <button
              onClick={() => setShowAddMovieModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Film</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Film Title</th>
                  <th className="py-3 px-4">Release Year</th>
                  <th className="py-3 px-4">Runtime</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Genres</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMovies.slice(0, 30).map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                      <Link href={`/movies/${m.id}`} className="hover:text-indigo-400 transition-colors">
                        {m.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {m.release_date ? new Date(m.release_date).getFullYear() : "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{m.runtime_minutes}m</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-amber-400 flex items-center">
                        <Star className="w-3 h-3 fill-amber-400 mr-1" />
                        {m.vote_average.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.genres?.slice(0, 2).join(", ") || "Cinema"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteMovie(m.id)}
                        title="Delete Film"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name, username, email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Ratings Count</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{u.display_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">@{u.username}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{u.email}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-bold">{u.ratings_count}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          u.role === "ADMIN"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : u.role === "CRITIC"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="USER">USER</option>
                        <option value="CRITIC">CRITIC</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEW MODERATION */}
      {activeTab === "reviews" && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-sm text-white">Recent Community Reviews & Ratings</h3>
            <span className="text-xs text-slate-400">{reviews.length} Total Submissions</span>
          </div>

          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{r.movie_title}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-xs text-slate-400 font-medium">by {r.display_name}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-xs font-bold text-amber-400 flex items-center">
                      <Star className="w-3 h-3 fill-amber-400 mr-1" />
                      {r.rating_value}/10
                    </span>
                    {r.is_spoiler && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        Spoiler
                      </span>
                    )}
                  </div>

                  {r.review_title && (
                    <p className="font-bold text-xs text-slate-200">{r.review_title}</p>
                  )}
                  {r.review_body && (
                    <p className="text-xs text-slate-400 italic line-clamp-2">&ldquo;{r.review_body}&rdquo;</p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteReview(r.id)}
                  title="Moderate Review"
                  className="px-3 py-1.5 rounded-xl glass-pill text-xs font-bold text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 flex items-center space-x-1 shrink-0 self-end sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Movie Glass Modal */}
      {showAddMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative glass-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

            <button
              onClick={() => setShowAddMovieModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Add New Film to Catalog</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Enter film metadata. The film will immediately be indexed into the Custom ML feature matrix.
            </p>

            <form onSubmit={handleCreateMovieSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Film Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blade Runner 2099"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Overview / Synopsis</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Cinematic plot overview..."
                  value={newOverview}
                  onChange={(e) => setNewOverview(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Release Date</label>
                  <input
                    type="date"
                    value={newReleaseDate}
                    onChange={(e) => setNewReleaseDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Runtime (min)</label>
                  <input
                    type="number"
                    value={newRuntime}
                    onChange={(e) => setNewRuntime(Number(e.target.value))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Vote Average</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={newVoteAverage}
                    onChange={(e) => setNewVoteAverage(Number(e.target.value))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Poster Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  value={newPosterUrl}
                  onChange={(e) => setNewPosterUrl(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Genres</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allGenres.slice(0, 14).map((g) => {
                    const sel = newGenreIds.includes(g.tmdb_id) || newGenreIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleNewMovieGenre(g.tmdb_id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                          sel ? "glass-pill-active" : "glass-pill text-slate-400 hover:text-white"
                        }`}
                      >
                        {sel && <Check className="w-3.5 h-3.5 text-white" />}
                        <span>{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddMovieModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMovie}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-105 disabled:opacity-50"
                >
                  {isCreatingMovie ? "Adding..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

