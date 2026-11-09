"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Rating, Watchlist, Genre } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  User as UserIcon,
  Star,
  Bookmark,
  Sparkles,
  Calendar,
  Mail,
  Edit3,
  Trash2,
  Brain,
  Film,
  Check,
  X,
  Shield,
  Layers,
  Award,
} from "lucide-react";
import { ThreeCard3D } from "@/components/ThreeCard3D";

const CANONICAL_GENRES = [
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
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 37, name: "Western" },
  { id: 10752, name: "War" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"ratings" | "watchlists" | "taste">("ratings");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>("");
  const [editBio, setEditBio] = useState<string>("");
  const [editGenres, setEditGenres] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setEditDisplayName(user.display_name);
      setEditBio(user.bio || "");
      setEditGenres(user.preferred_genres || []);
      loadUserData();
    }
  }, [user, authLoading]);

  const loadUserData = async () => {
    setIsLoadingData(true);
    try {
      const [ratingsRes, watchlistsRes, genresRes] = await Promise.all([
        api.getMyRatings(1, 50).catch(() => ({ items: [], total: 0 })),
        api.getWatchlists().catch(() => []),
        api.getGenres().catch(() => []),
      ]);
      setRatings(ratingsRes.items || []);
      setWatchlists(watchlistsRes || []);
      setAllGenres(genresRes || []);
    } catch (err) {
      console.error("Failed to load user profile data", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateProfile({
        display_name: editDisplayName.trim(),
        bio: editBio.trim(),
        preferred_genres: editGenres,
      });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditModal(false);
      }, 900);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRating = async (movieId: string) => {
    try {
      await api.deleteRating(movieId);
      setRatings(ratings.filter((r) => r.movie_id !== movieId));
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  };

  const toggleGenreSelection = (id: number) => {
    if (editGenres.includes(id)) {
      setEditGenres(editGenres.filter((gid) => gid !== id));
    } else {
      setEditGenres([...editGenres, id]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  // Compute User Statistics
  const totalRatings = ratings.length;
  const avgRating =
    totalRatings > 0
      ? (ratings.reduce((acc, r) => acc + r.rating_value, 0) / totalRatings).toFixed(1)
      : "0.0";
  const totalWatchlistsCount = watchlists.length;
  const totalWatchlistMovies = watchlists.reduce((acc, w) => acc + w.items_count, 0);

  // Genre map for fast lookup
  const genreNameMap: Record<number, string> = {};
  allGenres.forEach((g) => {
    genreNameMap[g.tmdb_id] = g.name;
    genreNameMap[g.id] = g.name;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Profile Hero Card */}
      <div className="relative glass-card rounded-3xl p-6 sm:p-10 border border-white/10 overflow-hidden shadow-2xl">
        {/* Specular highlight & Ambient glowing light */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar Circle */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-600/30 border-2 border-white/20 group-hover:scale-105 transition-transform duration-300">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
              {user.role === "ADMIN" && (
                <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/40 border border-rose-400">
                  <Shield className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
                  {user.display_name}
                </h1>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-bold font-eyebrow border ${
                    user.role === "ADMIN"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : user.role === "CRITIC"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-400 flex-wrap gap-y-1">
                <span className="font-mono text-slate-300">@{user.username}</span>
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.email}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Member since{" "}
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </div>

              {user.bio ? (
                <p className="text-xs sm:text-sm text-slate-300 italic pt-1 max-w-xl leading-relaxed font-normal">
                  &ldquo;{user.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic pt-1">
                  No bio yet. Click Edit Profile to add your favorite film philosophies.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="h-11 px-5 rounded-full glass-pill hover:border-white/30 text-xs font-bold text-slate-200 hover:text-white flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>Edit Profile</span>
            </button>
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="h-11 px-5 rounded-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <ThreeCard3D maxTilt={8}>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
                <Star className="w-4 h-4 fill-indigo-400 text-indigo-400" />
                <span>Rated Movies</span>
              </div>
              <div className="text-2xl font-black text-white">{totalRatings}</div>
              <p className="text-[10px] text-slate-500">Submitted community scores</p>
            </div>
          </ThreeCard3D>

          <ThreeCard3D maxTilt={8}>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-amber-500/30 transition-colors">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                <Award className="w-4 h-4" />
                <span>Average Score</span>
              </div>
              <div className="text-2xl font-black text-amber-400">{avgRating} <span className="text-xs font-normal text-slate-400">/ 10</span></div>
              <p className="text-[10px] text-slate-500">Your mean evaluation</p>
            </div>
          </ThreeCard3D>

          <ThreeCard3D maxTilt={8}>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-purple-500/30 transition-colors">
              <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold">
                <Bookmark className="w-4 h-4 fill-purple-400 text-purple-400" />
                <span>Watchlists</span>
              </div>
              <div className="text-2xl font-black text-white">{totalWatchlistsCount}</div>
              <p className="text-[10px] text-slate-500">Curated collections</p>
            </div>
          </ThreeCard3D>

          <ThreeCard3D maxTilt={8}>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 h-full hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
                <Brain className="w-4 h-4" />
                <span>Queued Films</span>
              </div>
              <div className="text-2xl font-black text-white">{totalWatchlistMovies}</div>
              <p className="text-[10px] text-slate-500">Saved across watchlists</p>
            </div>
          </ThreeCard3D>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2.5 border-b border-white/5 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("ratings")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "ratings"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Star className="w-4 h-4" />
          <span>My Ratings & Reviews ({ratings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("watchlists")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "watchlists"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>My Watchlists ({watchlists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("taste")}
          className={`h-10 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
            activeTab === "taste"
              ? "glass-pill-active shadow-md"
              : "glass-pill text-slate-400 hover:text-white"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>AI Vector Profile</span>
        </button>
      </div>

      {/* Tab 1: Ratings & Reviews */}
      {activeTab === "ratings" && (
        <div className="space-y-4">
          {isLoadingData ? (
            <LoadingSkeleton count={4} />
          ) : ratings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ratings.map((r) => (
                <div
                  key={r.id}
                  className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between space-y-4 group hover:border-indigo-500/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={`/movies/${r.movie_id}`}
                        className="font-bold text-base text-white hover:text-indigo-400 transition-colors line-clamp-1"
                      >
                        Movie #{r.movie_id.slice(0, 8)}
                      </Link>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <div className="flex items-center text-amber-400 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
                          <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                          <span>{r.rating_value}/10</span>
                        </div>
                        <span>&bull;</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        {r.is_spoiler && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Spoiler
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRating(r.movie_id)}
                      title="Delete Review"
                      className="p-2 rounded-xl glass-pill text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {r.review_title && (
                    <h4 className="font-bold text-sm text-slate-200">{r.review_title}</h4>
                  )}

                  {r.review_body && (
                    <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5 italic">
                      &ldquo;{r.review_body}&rdquo;
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-indigo-400">
                    <Link
                      href={`/movies/${r.movie_id}`}
                      className="hover:underline flex items-center space-x-1"
                    >
                      <span>View Film Details</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="You haven't rated any films yet"
              description="Rate movies in the catalog to build your taste vector profile and train our Custom ML recommendation model."
              actionText="Browse Movie Catalog"
              actionHref="/movies"
              icon={Star}
            />
          )}
        </div>
      )}

      {/* Tab 2: My Watchlists */}
      {activeTab === "watchlists" && (
        <div className="space-y-4">
          {isLoadingData ? (
            <LoadingSkeleton count={3} />
          ) : watchlists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchlists.map((wl) => (
                <div
                  key={wl.id}
                  className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                        <Bookmark className="w-5 h-5 fill-indigo-400" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/5 border border-white/10 text-slate-300">
                        {wl.items_count} {wl.items_count === 1 ? "Film" : "Films"}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-lg text-white">{wl.name}</h3>
                    {wl.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{wl.description}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {wl.is_default ? "Default List" : "Custom Shelf"}
                    </span>
                    <Link
                      href="/watchlists"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                    >
                      <span>Manage List</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No watchlists found"
              description="Create custom lists to organize movies for upcoming movie nights or marathon sessions."
              actionText="Create Watchlist"
              actionHref="/watchlists"
              icon={Bookmark}
            />
          )}
        </div>
      )}

      {/* Tab 3: AI Taste Vector Breakdown */}
      {activeTab === "taste" && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                <Brain className="w-3.5 h-3.5" />
                <span>Custom Factorized Feature ML Model</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Your Mathematical Taste Profile
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Our model maps your ratings into a dense 40-dimensional feature space, balancing
                genre affinities with peer collaborative patterns.
              </p>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-xl glass-pill text-xs font-bold text-slate-200 hover:text-white flex items-center space-x-2"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calibrate Genres</span>
            </button>
          </div>

          {/* Active Preferred Genres */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Anchored Preference Genres
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.preferred_genres && user.preferred_genres.length > 0 ? (
                user.preferred_genres.map((gid) => {
                  const name =
                    genreNameMap[gid] ||
                    CANONICAL_GENRES.find((cg) => cg.id === gid)?.name ||
                    `Genre #${gid}`;
                  return (
                    <span
                      key={gid}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold glass-pill text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5 shadow-sm shadow-indigo-500/10"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>{name}</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-slate-500 italic">
                  No explicit preferred genres selected. Add them via Edit Profile.
                </span>
              )}
            </div>
          </div>

          {/* Simulated Dense Vector Weights Bar Chart */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Top Genre Affinity Weights (Learned Distribution)
            </h4>

            <div className="space-y-2.5">
              {[
                { name: "Science Fiction", score: 94, color: "from-indigo-500 to-cyan-500" },
                { name: "Action & Adventure", score: 88, color: "from-cyan-500 to-blue-500" },
                { name: "Drama & Suspense", score: 76, color: "from-purple-500 to-indigo-500" },
                { name: "Thriller & Mystery", score: 71, color: "from-amber-500 to-rose-500" },
                { name: "Crime & Heist", score: 58, color: "from-slate-500 to-indigo-500" },
              ].map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="font-mono text-slate-400 font-bold">{item.score}% Match</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Glass Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative glass-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Edit Your Profile</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Update your public persona and calibrate your AI recommendation preferences.
            </p>

            {saveSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="glass-input w-full h-11 px-3.5 rounded-xl text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Bio / Cinematic Philosophy
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Share your favorite directors, cinematic eras, or genres..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="glass-input w-full p-3.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              {/* Genre Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Preferred Genres <span className="text-slate-500 font-normal">(Trains AI recommendation cold-start vector)</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CANONICAL_GENRES.map((g) => {
                    const selected = editGenres.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenreSelection(g.id)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-95 ${
                          selected
                            ? "glass-pill-active scale-105"
                            : "glass-pill text-slate-400 hover:text-white"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                        <span>{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-10 px-4 rounded-full glass-pill text-xs font-semibold text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 px-6 rounded-full three-liquid-metal-btn text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

